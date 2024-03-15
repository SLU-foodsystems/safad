/**
 * Reduces a diet to a list of RPCs. The diet is a list of RPC derivatives,
 * each with a code and an amount (in grams).
 */

import { getRpcCodeLevel, getRpcCodeSubset } from "@/lib/utils";

// TODO: Ideally we would take these two as parameters instead.
const TRANSPORTLESS_PROCESSES = [
  "F28.A07KD",
  "F28.A07KF",
  "F28.A07KG",
  "F28.A07KQ",
  "F28.A07LN",
  "F28.A07MF",
  "F28.A07MH",
  "F28.A0BZV",
  "F28.A0C00",
  "F28.A0C02",
  "F28.A0C04",
  "F28.A0C0B",
  "F28.A0C6E",
  "F28.NEW01", // Protein Isolate, plant-protein
  "F28.NEW02", // Extrusion, plant-protein
];

const TRANSPORTLESS_PROCESS_EXCEPTION = ["F28.A0BZV", "F28.A07GG"];

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
    processes.length === TRANSPORTLESS_PROCESS_EXCEPTION.length &&
    processes.every((p) => TRANSPORTLESS_PROCESS_EXCEPTION.includes(p))
  ) {
    return false;
  }

  return processes.some((p) => TRANSPORTLESS_PROCESSES.includes(p));
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
      const maybePackagingCode =  packagingCodes[subcode];
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
  recordTransportlessAmount: (rcpCode: string, amount: number) => void,
  recordProcessesContribution: (
    code: string,
    facet: string,
    amount: number
  ) => void,

  // State variables
  recordedSpecialProcesses: Set<string> = new Set(),
  transportlessAmount: number = 0
): Diet {
  const subcomponents = recipes[componentCode];
  if (!subcomponents) {
    if (transportlessAmount !== 0) {
      recordTransportlessAmount(componentCode, transportlessAmount);
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

      let newTransportAmount = transportlessAmount;

      // Record the output amount for processes
      // This will always be a process, and never a packaging
      const processAmount = ratio * amount;
      processes.forEach((processId) =>
        recordProcessesContribution(componentCode, processId, processAmount)
      );

      if (isTransportlessProcess(processes)) {
        const preProcessAmount = amount * ratio;
        newTransportAmount += netAmount - preProcessAmount;
      }

      // Some recipes will include references back to themselves, in which
      // case we do not want to recurse any further additional process.
      // (otherwise, we'll get an infinite loop).
      const isSelfReference = subcomponentCode === componentCode;
      if (isSelfReference) {
        if (newTransportAmount !== 0) {
          recordTransportlessAmount(subcomponentCode, newTransportAmount);
        }
        return [[subcomponentCode, netAmount]];
      }

      // Recurse!
      return reduceToRpcs(
        [subcomponentCode, netAmount],
        recipes,
        preparationProcesses,
        recordTransportlessAmount,
        recordProcessesContribution,
        updatedRecordedSpecialProcesses,
        newTransportAmount
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
    if (!(level1Category in processesAmounts)) {
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
