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

function reduceToRpcs(
  recipes: FoodsRecipes,
  rpcDerivative: [string, number]
): [string, number][] {
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

  return rpcs;
}

export default function main(diet: Diet, recipes: FoodsRecipes) {
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

  console.log(rpcs);
}
