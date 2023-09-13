/**
 * Reduces a diet to a list of RPCs. The diet is a list of RPC derivatives, each
 * with an amount, and waste.
 */

// Component, Facet,   proportion, reverse yield
// string   , string[], number   , number
import { getRpcCodeSubset } from "@/lib/utils";

type ProcessesMap = Record<string, Record<string, number>>;
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
 */
function reduceToRpcs(
  recordProcessOrPacketingContribution: (
    code: string,
    facet: string,
    amount: number
  ) => void,
  recipes: FoodsRecipes,
  preparationProcesses: Record<string, string>,
  recordedPProcesses: string[],
  [componentCode, amount]: RPC
): RPC[] {
  const subcomponents = recipes[componentCode];
  if (!subcomponents) return [[componentCode, amount]];

  // Handle L3 preparation-processes
  let newRecordedSpecials = recordedPProcesses;
  const componentCodeLevel = getLevel(componentCode);
  if (componentCodeLevel >= 3) {
    const l3Code = getRpcCodeSubset(componentCode, 3);
    const special = preparationProcesses[l3Code];

    if (special && !recordedPProcesses.includes(l3Code)) {
      newRecordedSpecials = [l3Code, ...recordedPProcesses];
      recordProcessOrPacketingContribution(l3Code, special, amount);
    }
  }

  if (componentCodeLevel >= 2) {
    const l2Code = getRpcCodeSubset(componentCode, 2);
    const special = preparationProcesses[l2Code];

    if (special && !recordedPProcesses.includes(l2Code)) {
      newRecordedSpecials = [l2Code, ...recordedPProcesses];
      recordProcessOrPacketingContribution(l2Code, special, amount);
    }
  }

  return subcomponents
    .map(([subcomponentCode, processes, ratio, yieldFactor]): RPC[] => {
      const netAmount = yieldFactor * ratio * amount;

      // Recourd the output amount
      const processAmount = ratio * amount;
      processes.map((processId) => {
        recordProcessOrPacketingContribution(
          componentCode,
          processId,
          processAmount
        );
      });

      // Some recipes will include references back to themselves, in which
      // case we do not want to recurse any further (otherwise: loop).
      // additional process.
      const isSelfReference = subcomponentCode === componentCode;
      if (isSelfReference) return [[subcomponentCode, netAmount]];

      return reduceToRpcs(
        recordProcessOrPacketingContribution,
        recipes,
        preparationProcesses,
        newRecordedSpecials,
        [subcomponentCode, netAmount]
      );
    })
    .flat(1);
}

export default function reduceDietToRpcs(
  diet: Diet,
  recipes: FoodsRecipes,
  preparationAndPackagingList: Record<string, string>
): [[string, number][], ProcessesMap, ProcessesMap] {
  const processesMap: ProcessesMap = {};
  const packetingMap: ProcessesMap = {};

  const recordProcessOrPacketingContribution = (
    code: string,
    facet: string,
    amount: number
  ) => {
    const level1Category = getRpcCodeSubset(code, 1);
    const map = facet.length === 2 ? packetingMap : processesMap;
    if (!(level1Category in map)) {
      map[level1Category] = {};
    }

    map[level1Category][facet] = (map[level1Category][facet] || 0) + amount;
  };

  const rpcs = diet
    // First, count up the waste factor
    .map((entry): RPC => {
      const wasteChangeFactor =
        1 / ((1 - entry.retailWaste) * (1 - entry.consumerWaste));

      return [entry.code, entry.amount * wasteChangeFactor];
    })
    // Now, compine with the recipes to get RPCs!
    .map((rpcDerivative) =>
      reduceToRpcs(
        recordProcessOrPacketingContribution,
        recipes,
        preparationAndPackagingList,
        [],
        rpcDerivative
      )
    )
    .flat(1);

  return [aggregateDuplicateRpcs(rpcs), processesMap, packetingMap];
}
