/**
 * Reduces a diet to a list of RPCs. The diet is a list of RPC derivatives,
 * each with a code and an amount (in grams).
 */

import { getRpcCodeLevel, getRpcCodeSubset } from "@/lib/utils";

// We assume that it is the RPCs, rather than the processed products that are
// transported (e.g. wheat rather than wheat flour or bread) but make exceptions
// for some type of products which are typically processed locally, including
// wine-making, juicing and oil extraction.
const TRANSPORT_NET_WEIGHT_PROCESSES = [
  "F28.A07KD", // Curing
  "F28.A07KF", // Concentration
  "F28.A07KG", // Drying
  "F28.A07KQ", // Dehydration
  "F28.A07LN", // Juicing
  "F28.A07MF", // Destillation
  "F28.A07MH", // Churning
  "F28.A0BZV", // Polishing
  "F28.A0C00", // Winemaking
  "F28.A0C02", // Oil production
  "F28.A0C04", // Sugar production
  "F28.A0C0B", // Starch production
  "F28.A0C6E", // Cheesemking
  "F28.NEW01", // Protein Isolate, plant-protein
  "F28.NEW02", // Extrusion, plant-protein
];

const TRANSPORT_NET_WEIGHT_PROCESS_EXCEPTION = ["F28.A0BZV", "F28.A07GG"];

const isPackagingCode = (code: string) => code.startsWith("P");
const isNotPackagingCode = (code: string) => !isPackagingCode(code);

/**
 * Helper function to check if a combination of processes should be considered
 * 'transportless' or not, based on the two constants above.
 */
const isTransportlessProcess = (processes: string[]): boolean => {
  if (processes.length === 0) return false;
  // Handle the exception of polished rice.
  if (
    processes.length === TRANSPORT_NET_WEIGHT_PROCESS_EXCEPTION.length &&
    processes.every((p) => TRANSPORT_NET_WEIGHT_PROCESS_EXCEPTION.includes(p))
  ) {
    return false;
  }

  return processes.some((p) => TRANSPORT_NET_WEIGHT_PROCESSES.includes(p));
};

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
  recordTransportSubtractionAmount: (rcpCode: string, amount: number) => void,
  recordProcessesContribution: (
    code: string,
    facet: string,
    amount: number
  ) => void,

  // State variables
  recordedSpecialProcesses: Set<string> = new Set(),
  transportSubtractionAmount: number = 0
): Diet {
  const subcomponents = recipes[componentCode];
  if (!subcomponents) {
    if (transportSubtractionAmount !== 0) {
      recordTransportSubtractionAmount(
        componentCode,
        transportSubtractionAmount
      );
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
    .map(([subcomponentCode, processes, ratio, yieldFactor]): Diet => {
      // HERE: check if process is one of the 'inverse-transport' processes.
      // If it is, we save the yieldFactor and pass it on to future recursions.
      const netAmount = yieldFactor * ratio * amount;

      let newTransportAdjustmentAmount = transportSubtractionAmount;

      // Record the output amount for processes
      // This will always be a process, and never a packaging
      const preProcessAmount = ratio * amount;
      processes.forEach((processId) =>
        recordProcessesContribution(componentCode, processId, preProcessAmount)
      );

      if (isTransportlessProcess(processes)) {
        newTransportAdjustmentAmount += netAmount - preProcessAmount;
      }

      // Some recipes will include references back to themselves, in which
      // case we do not want to recurse any further additional process.
      // (otherwise, we'll get an infinite loop).
      const isSelfReference = subcomponentCode === componentCode;
      if (isSelfReference) {
        if (newTransportAdjustmentAmount !== 0) {
          recordTransportSubtractionAmount(
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
        recordTransportSubtractionAmount,
        recordProcessesContribution,
        updatedRecordedSpecialProcesses,
        newTransportAdjustmentAmount
      );
    })
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
  const transportlessAmounts: Record<string, number> = {};

  // Helper function  called for all processes found when traversing the
  // recipes, adding to the above map under its L1 code.
  const recordProcessContribution = (
    code: string,
    facetCode: string,
    amount: number
  ) => {
    const level1Category = getRpcCodeSubset(code, 1, true);
    if (processesAmounts[level1Category] === undefined) {
      processesAmounts[level1Category] = {};
    }

    processesAmounts[level1Category][facetCode] =
      (processesAmounts[level1Category][facetCode] || 0) + amount;
  };

  const recordTransportless = (rpcCode: string, amount: number) => {
    transportlessAmounts[rpcCode] =
      (transportlessAmounts[rpcCode] || 0) + amount;
  };

  const rpcAmounts = diet
    .map((rpcDerivative) =>
      reduceToRpcs(
        rpcDerivative,
        recipes,
        preparationProcesses,
        recordTransportless,
        recordProcessContribution
      )
    )
    .flat(1);

  const packagingAmounts = recordPackaging(diet, packagingCodes);

  return [
    aggregateDuplicateRpcs(rpcAmounts),
    processesAmounts,
    packagingAmounts,
    transportlessAmounts,
  ];
}
