import { describe, expect, test } from "vitest";
import reduceDietToRPCs from "./rpc-reducer";

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

describe("RPC reducer", () => {
  test("Handles direct RPCs", () => {
    const recipes: FoodsRecipes = {};
    const diet: Diet = [
      {
        code: "no-waste",
        amount: 100,
        organic: 10,
        retailWaste: 0,
        consumerWaste: 0,
      },
      {
        code: "with-waste",
        amount: 200,
        organic: 10,
        retailWaste: 10,
        consumerWaste: 20,
      },
    ];

    const [rpcs, _facets] = reduceDietToRPCs(diet, recipes);
    expect(rpcs).toHaveLength(2);
    // First, no waste
    expect(rpcs[0]).toEqual(["no-waste", 100]);

    // Second, correct waste factors
    expect(rpcs[1][0]).toEqual("with-waste");
    expect(rpcs[1][1]).toBeCloseTo(200 / (0.9 * 0.8));
  });

  test("Handles nested RPCs", () => {
    const recipes: FoodsRecipes = {
      "a": [
        ["aa", "facet1", 20, 10],
        ["ab", "facet1", 80, 1],
      ],
      "aa": [
        ["rpc1", "facet2", 100, 1.7],
      ],
      "ab": [
        ["rpc2", "facet2", 50, 2],
        ["rpc3", "facet2", 50, 3],
      ]
    };
    const diet: Diet = [
      {
        code: "a",
        amount: 100,
        organic: 10,
        retailWaste: 10,
        consumerWaste: 30,
      },
    ];

    const baseWasteAmount = 100 / (0.9 * 0.7);

    const [result, _facets] = reduceDietToRPCs(diet, recipes);
    expect(result).toHaveLength(3);
    // RPC 1
    expect(result[0][0]).toEqual("rpc1");
    // RPC 2
    expect(result[1][0]).toEqual("rpc2");
    expect(result[1][1]).toBeCloseTo(baseWasteAmount * 0.8 * 1 * 0.5 * 2);
    // RPC 3
    expect(result[2][0]).toEqual("rpc3");
    expect(result[2][1]).toBeCloseTo(baseWasteAmount * 0.8 * 1 * 0.5 * 3);
  });
});
