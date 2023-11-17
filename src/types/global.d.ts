export {};

type Tuple<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : _TupleOf<T, N, []>
  : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N
  ? R
  : _TupleOf<T, N, [T, ...R]>;

declare global {
  type ValueOf<T> = T[keyof T];

  // Holds the information for a specific diet, i.e. a list of foods.
  type DietElement = [string, number]; // code, amount

  // Collection type
  type Diet = DietElement[];

  // FoodEx2.2 recipes
  // component, facet(s), % share, yield
  // TODO: More readable with named keys, but easier data management like this.
  type FoodsRecipe = [string, string[], number, number][];
  type FoodsRecipes = { [foodexCode: string]: FoodsRecipe };

  // Factors are multiples of impact per kg of food per day.
  interface EnvFactors {
    [rpcCode: string]: { [originCode: string]: number[] };
  }

  // Impacts are the factors multiplied by an amount (kg)
  interface EnvImpacts {
    [rpcCode: string]: number[];
  }

  // RPC factors -
  interface RpcFactors {
    [rpcCode: string]: {
      // share, productionWaste, organic
      [originCode: string]: [number, number];
    };
  }

  interface FactorsOverrides {
    mode: "absolute" | "relative";
    productionWaste: number | null;
    retailWaste: number | null;
    consumerWaste: number | null;
    techincalImprovement: number | null;
  }
}
