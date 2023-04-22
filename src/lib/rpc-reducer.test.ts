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

    const [rpcs, facets] = reduceDietToRPCs(diet, recipes);
    expect(rpcs).toHaveLength(2);
    // First, no waste
    expect(rpcs[0]).toEqual(["no-waste", 100]);

    // Second, correct waste factors
    expect(rpcs[1][0]).toEqual("with-waste");
    expect(rpcs[1][1]).toBeCloseTo(200 / (0.9 * 0.8));

    // No facets.
    expect(Object.keys(facets)).toHaveLength(0);
  });

  test("Handles nested RPCs", () => {
    const recipes: FoodsRecipes = {
      a: [
        ["aa", "facetA", 20, 10],
        ["ab", "facetA", 80, 1],
      ],
      aa: [["rpc1", "facetB", 100, 1.7]],
      ab: [
        ["rpc2", "facetB", 50, 2],
        ["rpc3", "facetC", 50, 3],
      ],
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

    const [rpcs, facets] = reduceDietToRPCs(diet, recipes);
    expect(rpcs).toHaveLength(3);
    // RPC 1
    expect(rpcs[0][0]).toEqual("rpc1");
    expect(rpcs[0][1]).toEqual(baseWasteAmount * 0.2 * 10 * 1 * 1.7);
    // RPC 2
    expect(rpcs[1][0]).toEqual("rpc2");
    expect(rpcs[1][1]).toBeCloseTo(baseWasteAmount * 0.8 * 1 * 0.5 * 2);
    // RPC 3
    expect(rpcs[2][0]).toEqual("rpc3");
    expect(rpcs[2][1]).toBeCloseTo(baseWasteAmount * 0.8 * 1 * 0.5 * 3);

    expect(Object.keys(facets)).toHaveLength(3);
    // FacetA
    expect(facets.facetA).toBeCloseTo(
      baseWasteAmount * 0.2 * 10 + baseWasteAmount * 0.8 * 1
    );
    // FacetB
    expect(facets.facetB).toBeCloseTo(
      baseWasteAmount * 0.2 * 10 * 1.7 + baseWasteAmount * 0.8 * 1 * 0.5 * 2
    );
    // FacetC
    expect(facets.facetC).toBeCloseTo(baseWasteAmount * 0.8 * 1 * 0.5 * 3);
  });

  test("Merges reappering RPCs", () => {
    const recipes: FoodsRecipes = {
      a: [
        ["aa", "", 20, 10],
        ["ab", "", 80, 1],
      ],
      aa: [["rpc1", "", 100, 1.7]],
      ab: [
        ["rpc2", "", 50, 2],
        ["rpc1", "", 50, 3],
      ],
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

    const [rpcs, facets] = reduceDietToRPCs(diet, recipes);
    expect(rpcs).toHaveLength(2);
    // RPC 1
    expect(rpcs[0][0]).toEqual("rpc1");
    expect(rpcs[0][1]).toEqual(
      baseWasteAmount * 0.8 * 1 * 0.5 * 3 + baseWasteAmount * 0.2 * 10 * 1 * 1.7
    );
    // RPC 2
    expect(rpcs[1][0]).toEqual("rpc2");
    expect(rpcs[1][1]).toBeCloseTo(baseWasteAmount * 0.8 * 1 * 0.5 * 2);
  });
});
