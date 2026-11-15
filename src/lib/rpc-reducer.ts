/**
 * Reduces a diet to a list of RPCs. The diet is a list of RPC derivatives,
 * each with a code and an amount (in grams).
 */

import { getRpcCodeLevel, getRpcCodeSubset } from "@/lib/utils";

function recordPackaging(
  diet: Diet,
  packagingCodes: Record<string, string>
): NestedRecord<string, number> {
  const packagingAmounts: NestedRecord<string, number> = {};

  diet.forEach(([code, amount]) => {
    const l1Code = getRpcCodeSubset(code, 1, true);
    if (!l1Code) return; // TODO: warn here?

    let level = getRpcCodeLevel(code);
    let packagingCode = "";
    while (!packagingCode && level > 0) {
      const subcode = getRpcCodeSubset(code, level);
      const maybePackagingCode = packagingCodes[subcode];
      if (maybePackagingCode) packagingCode = maybePackagingCode;
      level -= 1;
    }
    if (!packagingCode) return;

    if (!packagingAmounts[l1Code]) {
      packagingAmounts[l1Code] = {};
    }

    packagingAmounts[l1Code][packagingCode] =
      (packagingAmounts[l1Code][packagingCode] || 0) + amount;
  });

  return packagingAmounts;
}

/**
 * Aggergate a list of rpcs and their amounts by grouping/summing any duplicate
 * entries.
 */
function aggregateDuplicateRpcs(rpcs: Diet) {
  const foundRpcs = new Set();
  const mergedRpcs: Diet = [];
  rpcs.forEach(([code, amount]) => {
    if (foundRpcs.has(code)) {
      const idx = mergedRpcs.findIndex((pair) => pair[0] === code);
      if (!mergedRpcs[idx]) {
        console.error(
          "Unexpected, undefined behaviour in aggregation of RPCs."
        );
        return;
      }
      mergedRpcs[idx][1] += amount;
    } else {
      foundRpcs.add(code);
      mergedRpcs.push([code, amount]);
    }
  });

  return mergedRpcs;
}

/**
 * Recursive function to reduce one RPC (derivative) to a list of the RPC
 * sub-components that constitute it, respecting the amount, yield, and waste.
 * Ensures each RPC only occures once.
 *
 * It also records process contributions and the first transport amount for
 * each terminal RPC branch.
 */
function reduceToRpcs(
  // Main input: Code and amount of the food to reduce
  [componentCode, amount]: FoodEntry,

  // Static: same throughout recursion
  recipes: FoodsRecipes,

  // Modifiers
  recordTransportAmount: (rpcCode: string, amount: number) => void,
  recordProcessLocationContribution: (
    terminalRpc: string,
    location: ProcessLocation,
    code: string,
    facet: string,
    amount: number
  ) => void,

  // State variables
  transportAmount?: number,
  hasGrossAfterTransport = false,
  pendingProcessContributions: {
    location: ProcessLocation;
    code: string;
    facet: string;
    amount: number;
  }[] = [],
  includePreparation = true
): Diet {
  const subcomponents = recipes[componentCode];
  if (!subcomponents) {
    recordTransportAmount(componentCode, transportAmount ?? amount);
    pendingProcessContributions.forEach((contribution) =>
      recordProcessLocationContribution(
        componentCode,
        contribution.location,
        contribution.code,
        contribution.facet,
        contribution.amount
      )
    );
    return [[componentCode, amount]];
  }

  const firstRow = subcomponents[0];
  const preparationLocation: ProcessLocation =
    transportAmount !== undefined || firstRow?.transportOnNetWeight
      ? "producer"
      : "consumer";
  const processContributions = includePreparation
    ? firstRow?.preparationProcessFacets.reduce(
        (contributions, facet) => [
          ...contributions,
          {
            location: preparationLocation,
            code: getRpcCodeSubset(componentCode, 1, true),
            facet,
            amount: amount * firstRow.preparationReverseYield,
          },
        ],
        pendingProcessContributions
      ) || pendingProcessContributions
    : pendingProcessContributions;

  return subcomponents
    .map(
      ({
        rpcCode: subcomponentCode,
        processFacets: processes,
        share: ratio,
        reverseYield: yieldFactor,
        transportOnNetWeight,
        includeComponentPreparation,
      }): Diet => {
        const netAmount = yieldFactor * ratio * amount;

        // Net 1 transport uses the row amount before yield or allocation.
        const preProcessAmount = ratio * amount;
        const location: ProcessLocation =
          transportAmount !== undefined || transportOnNetWeight
            ? "producer"
            : "consumer";
        const branchProcessContributions = processContributions.map(
          (contribution) => ({
            ...contribution,
            amount: contribution.amount * ratio,
          })
        );
        const nextProcessContributions = processes.reduce(
          (contributions, facet) => [
            ...contributions,
            {
              location,
              code: getRpcCodeSubset(componentCode, 1, true),
              facet,
              amount: netAmount,
            },
          ],
          branchProcessContributions
        );
        const isSelfReference = subcomponentCode === componentCode;
        if (isSelfReference) {
          recordTransportAmount(subcomponentCode, transportAmount ?? netAmount);
          nextProcessContributions.forEach((contribution) =>
            recordProcessLocationContribution(
              subcomponentCode,
              contribution.location,
              contribution.code,
              contribution.facet,
              contribution.amount
            )
          );
          return [[subcomponentCode, netAmount]];
        }

        if (transportOnNetWeight && hasGrossAfterTransport) {
          throw new Error(
            `Invalid transport path: Net=1 -> Net=0 -> Net=1 at ${componentCode} -> ${subcomponentCode}.`
          );
        }

        const nextTransportAmount =
          transportAmount ??
          (transportOnNetWeight ? preProcessAmount : undefined);

        // Recurse!
        return reduceToRpcs(
          [subcomponentCode, netAmount],
          recipes,
          recordTransportAmount,
          recordProcessLocationContribution,
          nextTransportAmount,
          hasGrossAfterTransport ||
            (transportAmount !== undefined && !transportOnNetWeight),
          nextProcessContributions,
          includeComponentPreparation
        );
      }
    )
    .flat(1);
}

/**
 * Reduce a 'diet' (list of ingredients) to RPCs and amounts, as well as a
 * list of proccesses and packaging (with amounts).
 */
export default function reduceDietToRpcs(
  diet: Diet,
  recipes: FoodsRecipes,
  packagingCodes: Record<string, string>
): [
  Diet,
  ProcessLocationAmounts,
  NestedRecord<string, number>,
  Record<string, number>,
] {
  const transportAmounts: Record<string, number> = {};
  const processLocationAmounts: ProcessLocationAmounts = {};

  const recordTransportAmount = (rpcCode: string, amount: number) => {
    transportAmounts[rpcCode] = (transportAmounts[rpcCode] || 0) + amount;
  };

  const recordProcessLocationContribution = (
    terminalRpc: string,
    location: ProcessLocation,
    code: string,
    facet: string,
    amount: number
  ) => {
    processLocationAmounts[terminalRpc] ??= {
      consumer: {},
      producer: {},
    };
    processLocationAmounts[terminalRpc][location][code] ??= {};
    processLocationAmounts[terminalRpc][location][code]![facet] =
      (processLocationAmounts[terminalRpc][location][code]![facet] || 0) +
      amount;
  };

  const rpcAmounts = diet
    .map((rpcDerivative) =>
      reduceToRpcs(
        rpcDerivative,
        recipes,
        recordTransportAmount,
        recordProcessLocationContribution
      )
    )
    .flat(1);

  const packagingAmounts = recordPackaging(diet, packagingCodes);

  return [
    aggregateDuplicateRpcs(rpcAmounts),
    processLocationAmounts,
    packagingAmounts,
    transportAmounts,
  ];
}
