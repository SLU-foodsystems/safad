export {};

declare global {
  // Helper type
  type ValueOf<T> = T[keyof T];

  type NestedRecord<K extends string | number, V> = Record<K, Record<K, V>>;

  // A helper type for an [rpcCode, amount] pair
  type FoodEntry = [string, number];

  // Collection type: A diet is a list of food entries
  type Diet = FoodEntry[];

  // FoodEx2.2 recipes
  // component, facet(s), % share, yield
  type FoodsRecipeElement = [string, string[], number, number];
  type FoodsRecipeEntry = FoodsRecipeElement[];
  type FoodsRecipes = {
    [foodexCode: string]: FoodsRecipeEntry
  };

  // Factors are multiples of impact per kg of food per day.
  interface RpcFootprintsByOrigin {
    [rpcCode: string]: { [originCode: string]: number[] };
  }

  // Impacts are the factors multiplied by an amount (kg)
  interface RpcFootprints {
    [rpcCode: string]: number[];
  }

  // RPC factors -
  interface RpcOriginWaste {
    [rpcCode: string]: {
      // share, productionWaste, organic
      [originCode: string]: [number, number];
    };
  }

  type ImpactsTuple = [
    Record<string, number[]>,
    NestedRecord<string, number[]>,
    NestedRecord<string, number[]>,
    Record<string, number[]>,
  ];

  interface SlvRecipeComponent {
    slvCode: string;
    slvName: string;
    foodEx2Code: string;
    process: string;
    grossShare: number;
    netShare: number;
  }

}
