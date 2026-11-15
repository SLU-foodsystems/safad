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
  recordProcessesContribution: (
    code: string,
    facet: string,
    amount: number
  ) => void,

  // State variables
  transportAmount?: number,
  hasGrossAfterTransport = false
): Diet {
  const subcomponents = recipes[componentCode];
  if (!subcomponents) {
    recordTransportAmount(componentCode, transportAmount ?? amount);
    return [[componentCode, amount]];
  }

  return subcomponents
    .map(
      ({
        rpcCode: subcomponentCode,
        processFacets: processes,
        share: ratio,
        reverseYield: yieldFactor,
        transportOnNetWeight,
      }): Diet => {
        const netAmount = yieldFactor * ratio * amount;

        // Record the output amount for processes
        // This will always be a process, and never a packaging
        const preProcessAmount = ratio * amount;
        processes.forEach((processId) =>
          recordProcessesContribution(
            componentCode,
            processId,
            preProcessAmount
          )
        );

        const isSelfReference = subcomponentCode === componentCode;
        if (isSelfReference) {
          recordTransportAmount(subcomponentCode, transportAmount ?? netAmount);
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
          recordProcessesContribution,
          nextTransportAmount,
          hasGrossAfterTransport ||
            (transportAmount !== undefined && !transportOnNetWeight)
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
  NestedRecord<string, number>,
  NestedRecord<string, number>,
  Record<string, number>,
] {
  const processesAmounts: NestedRecord<string, number> = {};
  const transportAmounts: Record<string, number> = {};

  // Helper function  called for all processes found when traversing the
  // recipes, adding to the above map under its L1 code.
  const recordProcessContribution = (
    code: string,
    facetCode: string,
    amount: number
  ) => {
    const level1Category = getRpcCodeSubset(code, 1, true);
    processesAmounts[level1Category] ??= {};

    processesAmounts[level1Category][facetCode] =
      (processesAmounts[level1Category][facetCode] || 0) + amount;
  };

  const recordTransportAmount = (rpcCode: string, amount: number) => {
    transportAmounts[rpcCode] = (transportAmounts[rpcCode] || 0) + amount;
  };

  const rpcAmounts = diet
    .map((rpcDerivative) =>
      reduceToRpcs(
        rpcDerivative,
        recipes,
        recordTransportAmount,
        recordProcessContribution
      )
    )
    .flat(1);

  const packagingAmounts = recordPackaging(diet, packagingCodes);

  return [
    aggregateDuplicateRpcs(rpcAmounts),
    processesAmounts,
    packagingAmounts,
    transportAmounts,
  ];
}
