/**
 * Reduces a diet to a list of RPCs. The diet is a list of RPC derivatives,
 * each with a code and an amount (in grams).
 */

import { getRpcCodeLevel, getRpcCodeSubset, parseCsvFile } from "@/lib/utils";
import packagingStopProcessesCsv from "@/data/packaging-stop-processes.csv?raw";

const packagingStopProcesses = new Set(
  parseCsvFile(packagingStopProcessesCsv)
    .slice(1)
    .filter(
      ([_code, _name, stopCode]) => stopCode && stopCode.toLowerCase() === "yes"
    )
    .map(([code]) => code)
);

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

const isPackagingStopCodeProcess = (processes: string[]): boolean =>
  processes.some((p) => packagingStopProcesses.has(p));

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
  recordProcessOrPackagingContribution: (
    code: string,
    facet: string,
    amount: number,
    ignorePackaging?: boolean
  ) => void,

  // State variables
  recordedSpecials: Set<string> = new Set(),
  transportlessAmount: number = 0,
  packagingStopCodeReached = false
): Diet {
  const subcomponents = recipes[componentCode];
  if (!subcomponents) {
    if (transportlessAmount !== 0) {
      recordTransportlessAmount(componentCode, transportlessAmount);
    }
    return [[componentCode, amount]];
  }

  let newRecordedSpecials = recordedSpecials;
  const componentCodeLevel = getRpcCodeLevel(componentCode);

  // Helper function to record the processes and packaging contributions for a
  // given level
  const recordPPContributionHelper = (level: number) => {
    if (componentCodeLevel < level) return;

    const levelCode = getRpcCodeSubset(componentCode, level);
    if (newRecordedSpecials.has(levelCode)) return;

    let specials = preparationProcesses[levelCode];
    if (!specials || specials.length === 0) return;

    newRecordedSpecials = new Set([levelCode, ...newRecordedSpecials]);
    specials.forEach((special) => {
      recordProcessOrPackagingContribution(
        levelCode,
        special,
        amount,
        packagingStopCodeReached
      );
    });
  };

  // We need to handle L2 and L3 PP-contributions in the base-case, i.e. when
  // there are no sub-components.
  recordPPContributionHelper(3);
  recordPPContributionHelper(2);

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
        recordProcessOrPackagingContribution(
          componentCode,
          processId,
          processAmount
        )
      );

      if (isTransportlessProcess(processes)) {
        const preProcessAmount = amount * ratio;
        newTransportAmount += netAmount - preProcessAmount;
      }

      const stopCodeReached =
        packagingStopCodeReached || isPackagingStopCodeProcess(processes);

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
        recordProcessOrPackagingContribution,
        newRecordedSpecials,
        newTransportAmount,
        stopCodeReached
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
  const processesMap: NestedRecord<string, number> = {};
  const packagingMap: NestedRecord<string, number> = {};
  const transportlessMap: Record<string, number> = {};

  // Helper function  called for all processes and packaging found when
  // traversing the recipes, adding to the above two maps under its L1 code.
  const recordProcessOrPackagingContribution = (
    code: string,
    facetOrPackagingCode: string,
    amount: number,
    ignorePackaging = false
  ) => {
    const level1Category = getRpcCodeSubset(code, 1);
    // We use 'real' facets for processing, but made-up ones for packaging. The
    // made-up ones are just e.g. "P1" or "P18", i.e. length of 2 or 3.
    const isPackagingFacet = /^P\d(\d)?$/.test(facetOrPackagingCode);
    if (ignorePackaging && isPackagingFacet) return;

    const map = isPackagingFacet ? packagingMap : processesMap;
    if (!(level1Category in map)) {
      map[level1Category] = {};
    }

    map[level1Category][facetOrPackagingCode] =
      (map[level1Category][facetOrPackagingCode] || 0) + amount;
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
        recordProcessOrPackagingContribution
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
