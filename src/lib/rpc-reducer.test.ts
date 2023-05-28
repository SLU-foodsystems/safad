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

// Component, Facet, proportion ([0, 1]%), reverse yield
type FoodsRecipe = [string, string[], number, number][];
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
        retailWaste: 0.1,
        consumerWaste: 0.2,
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
      "A.01": [
        ["A.01.01", ["facetA"], 0.20, 10],
        ["A.01.02", ["facetA"], 0.80, 1],
      ],
      "A.01.01": [["A.01.123.01", ["facetB"], 1, 1.7]],
      "A.01.02": [
        ["A.01.123.02", ["facetB"], 0.50, 2],
        ["A.01.123.03", ["facetC"], 0.50, 3],
      ],
    };
    const diet: Diet = [
      {
        code: "A.01",
        amount: 100,
        organic: 10,
        retailWaste: 0.10,
        consumerWaste: 0.30,
      },
    ];

    const baseWasteAmount = 100 / (0.9 * 0.7);

    const [rpcs, processes] = reduceDietToRPCs(diet, recipes);
    expect(rpcs).toHaveLength(3);

    // RPC 1
    expect(rpcs[0][0]).toEqual("A.01.123.01");
    expect(rpcs[0][1]).toEqual(baseWasteAmount * 0.2 * 10 * 1 * 1.7);
    // RPC 2
    expect(rpcs[1][0]).toEqual("A.01.123.02");
    expect(rpcs[1][1]).toBeCloseTo(baseWasteAmount * 0.8 * 1 * 0.5 * 2);
    // RPC 3
    expect(rpcs[2][0]).toEqual("A.01.123.03");
    expect(rpcs[2][1]).toBeCloseTo(baseWasteAmount * 0.8 * 1 * 0.5 * 3);

    const processIds = [...new Set(Object.values(processes).map(x => Object.keys(x)).flat(1))];
    expect(processIds).toHaveLength(3);
    // FacetA
    expect(processes["A.01"].facetA).toBeCloseTo(
      baseWasteAmount * 0.2 * 10 + baseWasteAmount * 0.8 * 1
    );
    // FacetB
    expect(processes["A.01"].facetB).toBeCloseTo(
      baseWasteAmount * 0.2 * 10 * 1.7 + baseWasteAmount * 0.8 * 1 * 0.5 * 2
    );
    // FacetC
    expect(processes["A.01"].facetC).toBeCloseTo(baseWasteAmount * 0.8 * 1 * 0.5 * 3);
  });

  test("Merges reappering RPCs", () => {
    const recipes: FoodsRecipes = {
      a: [
        ["aa", [], 0.20, 10],
        ["ab", [], 0.80, 1],
      ],
      aa: [["rpc1", [], 1, 1.7]],
      ab: [
        ["rpc2", [], 0.50, 2],
        ["rpc1", [], 0.50, 3],
      ],
    };
    const diet: Diet = [
      {
        code: "a",
        amount: 100,
        organic: 10,
        retailWaste: 0.10,
        consumerWaste: 0.30,
      },
    ];

    const baseWasteAmount = 100 / (0.9 * 0.7);

    const [rpcs, _facets] = reduceDietToRPCs(diet, recipes);
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

  test("Handles combined facets", () => {
    const recipes: FoodsRecipes = {
      "A.01.123": [["A.01.123.423", ["facetA", "facetB", "facetC"], 0.80, 10]],
    };
    const diet: Diet = [
      {
        code: "A.01.123",
        amount: 100,
        organic: 10,
        retailWaste: 0.10,
        consumerWaste: 0.30,
      },
    ];

    const baseWasteAmount = 100 / (0.9 * 0.7);
    const netAmount = baseWasteAmount * 0.8 * 10;

    const [rpcs, processes] = reduceDietToRPCs(diet, recipes);
    expect(rpcs).toHaveLength(1);
    // RPC 1
    expect(rpcs[0][0]).toEqual("A.01.123.423");
    expect(rpcs[0][1]).toEqual(netAmount);

    // We should add netAmount for all three facets
    expect(Object.keys(processes["A.01"])).toHaveLength(3);
    expect(processes["A.01"].facetA).toBeCloseTo(netAmount);
    expect(processes["A.01"].facetB).toBeCloseTo(netAmount);
    expect(processes["A.01"].facetC).toBeCloseTo(netAmount);
  });

  test("Adds processes for self-referencing recipes", () => {
    const recipes: FoodsRecipes = {
      "A.01": [
        ["A.01", ["facetA"], 0.20, 10],
        ["A.02", ["facetB"], 0.80, 1],
      ],
    };
    const diet: Diet = [
      {
        code: "A.01",
        amount: 100,
        organic: 10,
        retailWaste: 0.10,
        consumerWaste: 0.30,
      },
    ];

    const baseWasteAmount = 100 / (0.9 * 0.7);

    const [rpcs, processes] = reduceDietToRPCs(diet, recipes);
    expect(rpcs).toHaveLength(2);
    // RPC 1
    expect(rpcs[0][0]).toEqual("A.01");
    expect(rpcs[0][1]).toEqual(baseWasteAmount * 0.2 * 10);
    // RPC 2
    expect(rpcs[1][0]).toEqual("A.02");
    expect(rpcs[1][1]).toBeCloseTo(baseWasteAmount * 0.8 * 1);

    expect(processes["A.01"].facetA).toEqual(baseWasteAmount * 0.2 * 10);
    expect(processes["A.02"].facetB).toEqual(baseWasteAmount * 0.8 * 1);
  });
});
