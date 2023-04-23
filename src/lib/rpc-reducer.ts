/**
 * Reduces a diet to a list of RPCs. The diet is a list of RPC derivatives, each
 * with an amount, a % organic (ignored right now), and waste.
 */


// Component, Facet, proportion ([0, 100]%), reverse yield

type ProcessesMap = Record<string, number>;

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
 * facets object, but it
 * also just introduces a lot of passing around for nothing - we're in a
 * closed scope and aux function anyways.
 *
 */
function reduceToRpcs(
  processesMap: ProcessesMap,
  recipes: FoodsRecipes,
  [componentCode, amount]: [string, number]
): [string, number][] {
  const subcomponents = recipes[componentCode];
  if (!subcomponents) return [[componentCode, amount]];

  return subcomponents
    .map(([subcomponentCode, facets, ratio, yieldFactor]) => {
      const netAmount = yieldFactor * (ratio / 100) * amount;
      // Facets can be empty strings, for meaningless processes.
      if (facets) {
        facets.split("$").map((facet) => {
          processesMap[facet] = (processesMap[facet] || 0) + netAmount;
        });
      }

      return reduceToRpcs(processesMap, recipes, [subcomponentCode, netAmount]);
    })
    .flat(1);
}

export default function reduceDietToRPCs(
  diet: Diet,
  recipes: FoodsRecipes
): [[string, number][], ProcessesMap] {
  const processesMap: ProcessesMap = {};
  const rpcs = diet
    // First, count up the waste factor
    .map((entry): [string, number] => {
      const wasteChangeFactor =
        1 / ((100 - entry.retailWaste) * (100 - entry.consumerWaste) * 1e-4);

      // TODO: We completely drop the organic part now, but will need to go back
      // and refactor this to pick ut up later in the project
      return [entry.code, entry.amount * wasteChangeFactor];
    })
    // Now, compine with the recipes to get RPCs!
    .map((rpcDerivative) => reduceToRpcs(processesMap, recipes, rpcDerivative))
    .flat(1);

  const mergedRpcs = mergeRpcs(rpcs);

  return [mergedRpcs, processesMap];
}
