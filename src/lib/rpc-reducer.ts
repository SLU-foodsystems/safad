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
  preparationAndPackagingList: Record<string, string[]>
): NestedRecord<string, number> {
  const packagingContributions: NestedRecord<string, number> = {};
  diet.forEach(([code, amount]) => {
    const level = getRpcCodeLevel(code);
    if (level < 3) return;

    const l1Code = getRpcCodeSubset(code, 1);
    if (!l1Code) return; // What

    const l3Code = getRpcCodeSubset(code, 3);
    const specials = preparationAndPackagingList[l3Code];
    if (!specials) return;

    const packagingSpecials = specials.filter(isPackagingCode);
    if (!packagingSpecials) return;

    if (!packagingContributions[l1Code]) {
      packagingContributions[l1Code] = {};
    }

    packagingSpecials.forEach((packagingCode) => {
      packagingContributions[l1Code][packagingCode] =
        (packagingContributions[l1Code][packagingCode] || 0) + amount;
    });
  });

  return packagingContributions;
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
 * It will also record any preparation processes and packaging.
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
  preparationAndPackagingList: Record<string, string[]>
): [
  Diet,
  NestedRecord<string, number>,
  NestedRecord<string, number>,
  Record<string, number>,
] {
  const packagingMap = recordPackaging(diet, preparationAndPackagingList);

  const processesMap: NestedRecord<string, number> = {};
  const transportlessMap: Record<string, number> = {};

  // Helper function  called for all processes found when traversing the
  // recipes, adding to the above map under its L1 code.
  const recordProcessContribution = (
    code: string,
    facetCode: string,
    amount: number
  ) => {
    const level1Category = getRpcCodeSubset(code, 1);
    if (!(level1Category in processesMap)) {
      processesMap[level1Category] = {};
    }

    processesMap[level1Category][facetCode] =
      (processesMap[level1Category][facetCode] || 0) + amount;
  };

  const recordTransportless = (rpcCode: string, amount: number) => {
    transportlessMap[rpcCode] = (transportlessMap[rpcCode] || 0) + amount;
  };

  const rpcs = diet
    .map((rpcDerivative) =>
      reduceToRpcs(
        rpcDerivative,
        recipes,
        preparationAndPackagingList,
        recordTransportless,
        recordProcessContribution
      )
    )
    .flat(1);

  return [
    aggregateDuplicateRpcs(rpcs),
    processesMap,
    packagingMap,
    transportlessMap,
  ];
}
