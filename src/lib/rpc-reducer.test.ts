import { describe, expect, test } from "vitest";
import reduceDiet from "./rpc-reducer";

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

    const [rpcs, facets] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(2);
    // First, no waste
    expect(rpcs[0]).toEqual(["no-waste", 100]);

    // Second, correct waste factors
    expect(rpcs[1][0]).toEqual("with-waste");
    expect(rpcs[1][1]).toBeCloseTo(200 / (0.9 * 0.8));

    // No facets.
    expect(Object.keys(facets)).toHaveLength(0);
  });

  test("Handles direct RPCs (with facets)", () => {
    const recipes: FoodsRecipes = {
      "A.01.example": [["A.01.example", ["facetA"], 1, 1]],
    };
    const diet: Diet = [
      {
        code: "A.01.example",
        amount: 100,
        organic: 0,
        retailWaste: 0,
        consumerWaste: 0,
      },
    ];

    const [[rpc], processes] = reduceDiet(diet, recipes, {});
    expect(rpc[0]).toEqual("A.01.example");
    expect(rpc[1]).toBeCloseTo(100);

    expect(processes).toHaveProperty("A.01");
    const process = processes["A.01"];
    expect(process.facetA).toEqual(100);
  });

  test("Facet amounts based on output", () => {
    const recipes: FoodsRecipes = {
      // Couscous to Wheat Semolina
      "A.01.03.001.007": [["A.01.03.001.012", [""], 1, 1]],
      // Wheat Semolina to Wheat Grain
      "A.01.03.001.012": [["A.01.02.001.002", ["F28.A0C03"], 1, 1.3013]],
      // Wheat Grain to Dummy extra product
      "A.01.02.001.002": [["A.01.02.001.003", ["F28.A0C04"], 1, 2]],
    };

    const diet: Diet = [
      {
        code: "A.01.03.001.007", // Couscous
        amount: 1000,
        organic: 0,
        retailWaste: 0,
        consumerWaste: 0,
      },
    ];

    const [rpcs, processes] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(1);
    const [rpcCode, rpcAmount] = rpcs[0];

    expect(rpcCode).toEqual("A.01.02.001.003");
    expect(rpcAmount).toEqual(1000 * 1.3013 * 2);

    expect(processes).toHaveProperty("A.01");
    const process = processes["A.01"];
    expect(process["F28.A0C03"]).toEqual(1000);
    expect(process["F28.A0C04"]).toEqual(1301.3);
  });

  test("Processes with ratios", () => {
    const recipes: FoodsRecipes = {
      // Couscous to Wheat Semolina
      "A.01.Pizza": [
        ["A.02.Tomatoes", ["Cooking"], 0.3, 3],
        ["A.01.Bread", ["Baking"], 0.7, 1],
      ],
    };

    const diet: Diet = [
      {
        code: "A.01.Pizza",
        amount: 1000,
        organic: 0,
        retailWaste: 0,
        consumerWaste: 0,
      },
    ];

    const [rpcs, processes] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(2);

    expect(rpcs[0][0]).toEqual("A.02.Tomatoes");
    expect(rpcs[0][1]).toBeCloseTo(1000 * 0.3 * 3);

    expect(rpcs[1][0]).toEqual("A.01.Bread");
    expect(rpcs[1][1]).toBeCloseTo(1000 * 0.7 * 1);

    expect(processes).toHaveProperty("A.01");
    expect(processes["A.01"]["Cooking"]).toEqual(300);
    expect(processes["A.01"]["Baking"]).toEqual(700);
  });

  test("Handles nested RPCs", () => {
    const recipes: FoodsRecipes = {
      "A.01.02.003": [
        ["A.01.01", ["facetA"], 0.2, 10],
        ["A.01.02", ["facetA"], 0.8, 1],
      ],
      "A.01.01": [["A.01.11", ["facetB"], 1, 1.7]],
      "A.01.02": [
        ["A.01.12", ["facetB"], 0.5, 2],
        ["A.01.13", ["facetC"], 0.5, 3],
      ],
    };

    const diet: Diet = [
      {
        code: "A.01.02.003",
        amount: 100,
        organic: 10,
        retailWaste: 0.1,
        consumerWaste: 0.3,
      },
    ];

    const baseWasteAmount = 100 / (0.9 * 0.7);

    const [rpcs, processes] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(3);

    // RPC 1
    expect(rpcs[0][0]).toEqual("A.01.11");
    expect(rpcs[0][1]).toEqual(baseWasteAmount * 0.2 * 10 * 1 * 1.7);
    // RPC 2
    expect(rpcs[1][0]).toEqual("A.01.12");
    expect(rpcs[1][1]).toBeCloseTo(baseWasteAmount * 0.8 * 1 * 0.5 * 2);
    // RPC 3
    expect(rpcs[2][0]).toEqual("A.01.13");
    expect(rpcs[2][1]).toBeCloseTo(baseWasteAmount * 0.8 * 1 * 0.5 * 3);

    // Facets
    const processIds = [
      ...new Set(
        Object.values(processes)
          .map((x) => Object.keys(x))
          .flat(1)
      ),
    ];
    expect(processIds).toHaveLength(3);
    // FacetA: Should be 2 * the amount of A.01
    expect(processes["A.01"].facetA).toBeCloseTo(baseWasteAmount);
    // FacetB
    expect(processes["A.01"].facetB).toBeCloseTo(
      baseWasteAmount * 0.2 * 10 + // A.01.0.1
        baseWasteAmount * 0.8 * 1 * 0.5
    );
    // FacetC
    expect(processes["A.01"].facetC).toBeCloseTo(baseWasteAmount * 0.8 * 0.5);
  });

  test("Merges reappering RPCs", () => {
    const recipes: FoodsRecipes = {
      a: [
        ["aa", [], 0.2, 10],
        ["ab", [], 0.8, 1],
      ],
      aa: [["rpc1", [], 1, 1.7]],
      ab: [
        ["rpc2", [], 0.5, 2],
        ["rpc1", [], 0.5, 3],
      ],
    };
    const diet: Diet = [
      {
        code: "a",
        amount: 100,
        organic: 10,
        retailWaste: 0.1,
        consumerWaste: 0.3,
      },
    ];

    const baseWasteAmount = 100 / (0.9 * 0.7);

    const [rpcs, _facets] = reduceDiet(diet, recipes, {});
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
      "A.01.123.01": [["A.01.123", ["facetA", "facetB", "facetC"], 0.8, 10]],
    };
    const diet: Diet = [
      {
        code: "A.01.123.01",
        amount: 100,
        organic: 10,
        retailWaste: 0.1,
        consumerWaste: 0.3,
      },
    ];

    const outputAmount = 100 / (0.9 * 0.7);
    const inputAmount = outputAmount * 0.8 * 10;

    const [rpcs, processes] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(1);
    // RPC 1
    expect(rpcs[0][0]).toEqual("A.01.123");
    expect(rpcs[0][1]).toEqual(inputAmount);

    // We should add netAmount for all three facets
    expect(Object.keys(processes["A.01"])).toHaveLength(3);
    expect(processes["A.01"].facetA).toBeCloseTo(outputAmount * 0.8);
    expect(processes["A.01"].facetB).toBeCloseTo(outputAmount * 0.8);
    expect(processes["A.01"].facetC).toBeCloseTo(outputAmount * 0.8);
  });

  test("Adds processes for self-referencing recipes", () => {
    const recipes: FoodsRecipes = {
      "A.01": [
        ["A.01", ["facetA"], 0.2, 10],
        ["A.02", ["facetB"], 0.8, 1],
      ],
    };
    const diet: Diet = [
      {
        code: "A.01",
        amount: 100,
        organic: 0,
        retailWaste: 0.1,
        consumerWaste: 0.3,
      },
    ];

    const baseWasteAmount = 100 / (0.9 * 0.7);

    const [rpcs, processes] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(2);
    // RPC 1
    expect(rpcs[0][0]).toEqual("A.01");
    expect(rpcs[0][1]).toEqual(baseWasteAmount * 0.2 * 10);
    // RPC 2
    expect(rpcs[1][0]).toEqual("A.02");
    expect(rpcs[1][1]).toBeCloseTo(baseWasteAmount * 0.8 * 1);

    expect(processes["A.01"].facetA).toEqual(baseWasteAmount * 0.2);
    expect(processes["A.01"].facetB).toEqual(baseWasteAmount * 0.8);
  });

  describe("Preparation processes", () => {
    test("Direct: Adds processes to diet on L3 level", () => {
      const diet: Diet = [
        {
          code: "A.19.01.002", // pizza
          amount: 1000,
          organic: 0,
          retailWaste: 0,
          consumerWaste: 0,
        },
      ];
      const preparationProcesses = {
        "A.19.01.002": "F28.A07GY",
      };

      const [_rpcs, processes] = reduceDiet(diet, {}, preparationProcesses);

      expect(processes["A.19"]).toHaveProperty("F28.A07GY");
      expect(processes["A.19"]["F28.A07GY"]).toEqual(1000);
    });
    test("Direct: Adds processes to diet entered > L3 level", () => {
      const diet: Diet = [
        {
          code: "A.19.01.002.003", // pizza derivative
          amount: 1234,
          organic: 0,
          retailWaste: 0,
          consumerWaste: 0,
        },
      ];
      const preparationProcesses = { "A.19.01.002": "F28.A07GY" };

      const [_rpcs, processes] = reduceDiet(diet, {}, preparationProcesses);

      expect(processes["A.19"]).toHaveProperty("F28.A07GY");
      expect(processes["A.19"]["F28.A07GY"]).toEqual(1234);
    });

    test("Indirect: Adds processes to diet entered > L3 level", () => {
      const diet: Diet = [
        {
          code: "I.20.01.001.001", // Dummy product
          amount: 1000,
          organic: 0,
          retailWaste: 0,
          consumerWaste: 0,
        },
      ];

      // Let's pretend this leads to a pizza
      const recipes: FoodsRecipes = {
        "I.20.01.001.001": [["A.19.01.002.003", [], 0.5, 3]],
      };
      const preparationProcesses = { "A.19.01.002": "F28.A07GY" };

      const [_rpcs, processes] = reduceDiet(diet, recipes, preparationProcesses);

      expect(processes["A.19"]).toHaveProperty("F28.A07GY");
      expect(processes["A.19"]["F28.A07GY"]).toEqual(1000 * 0.5 * 3);
    });
  });
});
