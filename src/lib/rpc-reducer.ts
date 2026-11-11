/**
 * Reduces a diet to a list of RPCs. The diet is a list of RPC derivatives,
 * each with a code and an amount (in grams).
 */

import { getRpcCodeLevel, getRpcCodeSubset } from "@/lib/utils";

const isPackagingCode = (code: string) => code.startsWith("P");
const isNotPackagingCode = (code: string) => !isPackagingCode(code);

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
      if (!mergedRpcs[idx]) return; // TODO: this should not ever occur.
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
 * It will also record any preparation processes.
 */
function reduceToRpcs(
  // Main input: Code and amount of the food to reduce
  [componentCode, amount]: FoodEntry,

  // Static: same throughout recursion
  recipes: FoodsRecipes,
  preparationProcesses: Record<string, string[]>,

  // Modifiers
  recordTransportAdjustment: (rpcCode: string, amount: number) => void,
  recordProcessesContribution: (
    code: string,
    facet: string,
    amount: number
  ) => void,

  // State variables
  recordedSpecialProcesses: Set<string> = new Set(),
  transportAdjustmentAmount: number = 0
): Diet {
  const subcomponents = recipes[componentCode];
  if (!subcomponents) {
    if (transportAdjustmentAmount !== 0) {
      recordTransportAdjustment(componentCode, transportAdjustmentAmount);
    }
    return [[componentCode, amount]];
  }

  // Copy set to avoid modifying in sub-processes
  const updatedRecordedSpecialProcesses = new Set(recordedSpecialProcesses);

  // We handle L3 process-contributions here in the base-case, as they are per
  // RPC-code and not per process (i.e. between codes).
  const recordSpecialProcessesContributions = () => {
    if (getRpcCodeLevel(componentCode) < 3) return;

    const levelCode = getRpcCodeSubset(componentCode, 3);
    if (updatedRecordedSpecialProcesses.has(levelCode)) return;

    const specials = preparationProcesses[levelCode];
    if (!specials) return;
    const specialProcesses = specials.filter(isNotPackagingCode);
    if (specialProcesses.length === 0) return;

    specialProcesses.forEach((special) => {
      updatedRecordedSpecialProcesses.add(special);
      recordProcessesContribution(levelCode, special, amount);
    });
  };
  recordSpecialProcessesContributions();

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
        // Net-weight transport adjustments accumulate across consecutive
        // net-weight steps. Gross-weight steps transform the inherited
        // adjustment into the child units.
        let newTransportAdjustmentAmount = transportOnNetWeight
          ? transportAdjustmentAmount
          : transportAdjustmentAmount * yieldFactor * ratio;

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

        if (transportOnNetWeight) {
          newTransportAdjustmentAmount += netAmount - preProcessAmount;
        }

        // Some recipes will include references back to themselves, in which
        // case we do not want to recurse any further additional process.
        // (otherwise, we'll get an infinite loop).
        const isSelfReference = subcomponentCode === componentCode;
        if (isSelfReference) {
          if (newTransportAdjustmentAmount !== 0) {
            recordTransportAdjustment(
              subcomponentCode,
              newTransportAdjustmentAmount
            );
          }
          return [[subcomponentCode, netAmount]];
        }

        // Recurse!
        return reduceToRpcs(
          [subcomponentCode, netAmount],
          recipes,
          preparationProcesses,
          recordTransportAdjustment,
          recordProcessesContribution,
          updatedRecordedSpecialProcesses,
          newTransportAdjustmentAmount
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
  preparationProcesses: Record<string, string[]>,
  packagingCodes: Record<string, string>
): [
  Diet,
  NestedRecord<string, number>,
  NestedRecord<string, number>,
  Record<string, number>,
] {
  const processesAmounts: NestedRecord<string, number> = {};
  const transportAdjustments: Record<string, number> = {};

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

  const recordTransportAdjustment = (rpcCode: string, amount: number) => {
    transportAdjustments[rpcCode] =
      (transportAdjustments[rpcCode] || 0) + amount;
  };

  const rpcAmounts = diet
    .map((rpcDerivative) =>
      reduceToRpcs(
        rpcDerivative,
        recipes,
        preparationProcesses,
        recordTransportAdjustment,
        recordProcessContribution
      )
    )
    .flat(1);

  const packagingAmounts = recordPackaging(diet, packagingCodes);

  return [
    aggregateDuplicateRpcs(rpcAmounts),
    processesAmounts,
    packagingAmounts,
    transportAdjustments,
  ];
}
