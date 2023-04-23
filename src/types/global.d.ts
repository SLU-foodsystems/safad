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
  // Holds the information for a specific diet, i.e. a list of foods.
  interface DietElement {
    code: string;
    amount: number;
    organic: number;
    retailWaste: number;
    consumerWaste: number;
  }

  // Collection type
  type Diet = DietComponent[];

  // FoodEx2.2 recipes
  // component, facet(s), % share, yield
  // TODO: More readable with named keys, but easier data management like this.
  type FoodsRecipe = [string, string, number, number][];
  type FoodsRecipes = { [foodexCode: string]: FoodsRecipe };


  type EnvFactors = number[];
  interface EnvOriginFactors {
    [rpcCode: string]: { [originCode: string]: EnvFactors };
  }

  interface EnvFootprints {
    [rpcCode: string]: EnvFactors;
  }

  interface RpcFactors {
    [rpcCode: string]: {
      [originCode: string]: [number, number];
    };
  }
}
