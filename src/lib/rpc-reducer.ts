/**
 * Reduces a diet to a list of RPCs. The diet is a list of RPC derivatives, each
 * with an amount, and waste.
 */

// Component, Facet,   proportion, reverse yield
// string   , string[], number   , number

type FlatProcessesMap = Record<string, number>;
type ProcessesMap = Record<string, Record<string, number>>;

function mergeRpcs(rpcs: [string, number][]) {
  // Merge all RPCs, to avoid duplicate entries
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
 * It also MUTATES the outside argument "processesMap", adding the amount for
 * each process it encounters along the way.
 *
 * Code-style, this is a bit criminal. It'd be 'prettier' to send along the
 * facets object, but it also just introduces a lot of passing around for
 * nothing.
 */

type RPC = [string, number]; // Code, Amount

function reduceToRpcs(
  recordProcessContribution: (
    code: string,
    facet: string,
    amount: number
  ) => void,
  recipes: FoodsRecipes,
  [componentCode, amount]: RPC
): RPC[] {
  const subcomponents = recipes[componentCode];
  if (!subcomponents) return [[componentCode, amount]];

  return subcomponents
    .map(([subcomponentCode, processes, ratio, yieldFactor]): RPC[] => {
      const netAmount = yieldFactor * (ratio / 100) * amount;
      // Facets can be empty strings, for meaningless processes.
      processes.map((facet) => {
        recordProcessContribution(subcomponentCode, facet, netAmount);
      });

      // Some recipes will include references back to themselves, in which
      // case we do not want to recurse any further (otherwise: loop).
      // additional process.
      const isSelfReference = subcomponentCode === componentCode;
      if (isSelfReference) return [[subcomponentCode, netAmount]];

      return reduceToRpcs(recordProcessContribution, recipes, [
        subcomponentCode,
        netAmount,
      ]);
    })
    .flat(1);
}

export default function reduceDietToRPCs(
  diet: Diet,
  recipes: FoodsRecipes
): [[string, number][], ProcessesMap] {
  const processesMap: ProcessesMap = {};

  const recordProcessContribution = (
    code: string,
    facet: string,
    amount: number
  ) => {
    const level1Category = code.substring(0, 4);
    if (!(level1Category in processesMap)) {
      processesMap[level1Category] = {};
    }

    processesMap[level1Category][facet] =
      (processesMap[level1Category][facet] || 0) + amount;
  };

  const rpcs = diet
    // First, count up the waste factor
    .map((entry): RPC => {
      const wasteChangeFactor =
        1 / ((100 - entry.retailWaste) * (100 - entry.consumerWaste) * 1e-4);

      return [entry.code, entry.amount * wasteChangeFactor];
    })
    // Now, compine with the recipes to get RPCs!
    .map((rpcDerivative) =>
      reduceToRpcs(recordProcessContribution, recipes, rpcDerivative)
    )
    .flat(1);

  const mergedRpcs = mergeRpcs(rpcs);

  return [mergedRpcs, processesMap];
}
