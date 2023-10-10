/**
 * Reduces a diet to a list of RPCs. The diet is a list of RPC derivatives, each
 * with an amount, and waste.
 */

import { getRpcCodeSubset } from "@/lib/utils";

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

type NestedMap<K extends string | number, V> = Record<K, Record<K, V>>;
type RPC = [string, number]; // Code, Amount

// Get the 'level' of a given food given its id
const getLevel = (str: string) => str.split(".").length - 1;

/**
 * Aggergate a list of rpcs and their amounts by grouping/summing any duplicate
 * entries.
 */
function aggregateDuplicateRpcs(rpcs: [string, number][]) {
  const foundRpcs = new Set();
  const mergedRpcs: [string, number][] = [];
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
  [componentCode, amount]: RPC,
  recordProcessOrPackagingContribution: (
    code: string,
    facet: string,
    amount: number
  ) => void,
  recipes: FoodsRecipes,
  preparationProcesses: Record<string, string>,
  recordedSpecials: Set<string>,
  recordTransportlessAmount: (rcpCode: string, amount: number) => void,
  transportlessYieldAdjustment: number = 1
): RPC[] {
  const subcomponents = recipes[componentCode];
  if (!subcomponents) {
    if (transportlessYieldAdjustment !== 1) {
      // Not sure about this??
      recordTransportlessAmount(
        componentCode,
        amount * (1 - 1 / transportlessYieldAdjustment)
      );
    }
    return [[componentCode, amount]];
  }

  let newRecordedSpecials = recordedSpecials;
  const componentCodeLevel = getLevel(componentCode);

  // Helper function to record the processes and packaging contributions for a
  // given level
  const recordPPContributionHelper = (level: number) => {
    if (componentCodeLevel < level) return;

    const levelCode = getRpcCodeSubset(componentCode, level);
    const special = preparationProcesses[levelCode];
    if (!special || recordedSpecials.has(levelCode)) return;

    newRecordedSpecials = new Set([levelCode, ...recordedSpecials]);
    recordProcessOrPackagingContribution(levelCode, special, amount);
  };

  // We need to handle L2 and L3 PP-contributions in the base-case, i.e. when
  // there are no sub-components.
  recordPPContributionHelper(3);
  recordPPContributionHelper(2);

  return subcomponents
    .map(([subcomponentCode, processes, ratio, yieldFactor]): RPC[] => {
      // HERE: check if process is one of the 'inverse-transport' processes.
      // If it is, we save the yieldFactor and pass it on to future recursions.
      const netAmount = yieldFactor * ratio * amount;

      let newTransportYield = transportlessYieldAdjustment;

      // Record the output amount for processes
      const processAmount = ratio * amount;
      processes.forEach((processId) =>
        recordProcessOrPackagingContribution(
          componentCode,
          processId,
          processAmount
        )
      );

      if (isTransportlessProcess(processes)) {
        // We have to take in the yield into account here as well, otherwise the
        // logic won't branch.
        newTransportYield *= yieldFactor * ratio;
      }

      // Some recipes will include references back to themselves, in which
      // case we do not want to recurse any further additional process.
      // (otherwise, we'll get an infinite loop).
      const isSelfReference = subcomponentCode === componentCode;
      if (isSelfReference) {
        if (newTransportYield !== 1) {
          recordTransportlessAmount(
            subcomponentCode,
            netAmount * (1 - 1 / newTransportYield)
          );
        }
        return [[subcomponentCode, netAmount]];
      }

      // Recurse!
      return reduceToRpcs(
        [subcomponentCode, netAmount],
        recordProcessOrPackagingContribution,
        recipes,
        preparationProcesses,
        newRecordedSpecials,
        recordTransportlessAmount,
        newTransportYield
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
  preparationAndPackagingList: Record<string, string>
): [
  [string, number][],
  NestedMap<string, number>,
  NestedMap<string, number>,
  Record<string, number>
] {
  const processesMap: NestedMap<string, number> = {};
  const packagingMap: NestedMap<string, number> = {};
  const transportlessMap: Record<string, number> = {};

  // This is a helper function that will be called for all processes and
  // packaging found when traversing the recipes, adding to the above two maps.
  const recordProcessOrPackagingContribution = (
    code: string,
    facet: string,
    amount: number
  ) => {
    const level1Category = getRpcCodeSubset(code, 1);
    // We use 'real' facets for processing, but made-up ones for packaging. The
    // made-up ones are just e.g. "P1", i.e. length of 2.
    const map = facet.length === 2 ? packagingMap : processesMap;
    if (!(level1Category in map)) {
      map[level1Category] = {};
    }

    map[level1Category][facet] = (map[level1Category][facet] || 0) + amount;
  };

  const recordTransportless = (rpcCode: string, amount: number) => {
    transportlessMap[rpcCode] = (transportlessMap[rpcCode] || 0) + amount;
  };

  const rpcs = diet
    // First, count up the amounts by the retail- and consumer waste factors
    .map((entry): RPC => {
      const wasteChangeFactor =
        1 / ((1 - entry.retailWaste) * (1 - entry.consumerWaste));

      return [entry.code, entry.amount * wasteChangeFactor];
    })
    // Now, combine with the recipes to get RPCs!
    .map((rpcDerivative) =>
      reduceToRpcs(
        rpcDerivative,
        recordProcessOrPackagingContribution,
        recipes,
        preparationAndPackagingList,
        new Set(),
        recordTransportless
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
