/**
 * Reduces a diet to a list of RPCs. The diet is a list of RPC derivatives, each
 * with an amount, a % organic (ignored right now), and waste.
 */

// TODO: These types should maybe be global.
interface DietComponent {
  code: string;
  amount: number;
  organic: number;
  retailWaste: number;
  consumerWaste: number;
}

type Diet = DietComponent[];

// Component, Facet, proportion ([0, 100]%), reverse yield
type FoodsRecipe = [string, string, number, number][];
type FoodsRecipes = { [foodexCode: string]: FoodsRecipe };

/**
 * Recursive function to reduce one RPC (derivative) to a list of the RPC
 * sub-components that constitute it, respecting the amount, yield, and waste.
 *
 * Ensures each RPC only occures once.
 */
function reduceToRpcs(
  recipes: FoodsRecipes,
  rpcDerivative: [string, number]
): [string, number][] {
  // if (!(rpcDerivative[0] in recipes)) {
  //   return [rpcDerivative];
  // }

  /**
   * Auxiliary function that handles the recursion
   */
  function aux(componentCode: string, amount: number): [string, number][] {
    const subcomponents = recipes[componentCode];
    if (!subcomponents) return [[componentCode, amount]];

    // TODO: Here we're droppning the facet. That's clearly not ideal, maybe we
    // should collect facet-amounts at the same time?
    // Could merge the call to aux(...) below with [facet, amount*ratio*yield]
    return subcomponents
      .map(([subcomponentCode, facet, ratio, yieldFactor]) =>
        aux(subcomponentCode, yieldFactor * (ratio / 100) * amount)
      )
      .flat(1);
  }

  const rpcs = aux(rpcDerivative[0], rpcDerivative[1]);
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

export default function reduceDietToRPCs(diet: Diet, recipes: FoodsRecipes) {
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
    .map((rpcDerivative) => reduceToRpcs(recipes, rpcDerivative))
    .flat(1);

  return rpcs;
}
