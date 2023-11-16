import { describe, expect, test } from "vitest";
import reduceDiet from "./rpc-reducer";

// Component, Facet, proportion ([0, 1]%), reverse yield
type FoodsRecipe = [string, string[], number, number][];
type FoodsRecipes = { [foodexCode: string]: FoodsRecipe };

describe("RPC reducer", () => {
  test("Handles direct RPCs", () => {
    const recipes: FoodsRecipes = {};
    const diet: Diet = [
      ["foo", 100],
      ["bar", 200],
    ];

    const [rpcs, facets] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(2);

    expect(rpcs[0]).toEqual(["foo", 100]);
    expect(rpcs[1]).toEqual(["bar", 200]);

    // No facets.
    expect(Object.keys(facets)).toHaveLength(0);
  });

  test("Handles direct RPCs (with facets)", () => {
    const recipes: FoodsRecipes = {
      "A.01.example": [["A.01.example", ["facetA"], 1, 1]],
    };
    const diet: Diet = [["A.01.example", 100]];

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

    // Couscous
    const diet: Diet = [["A.01.03.001.007", 1000]];

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

    const diet: Diet = [["A.01.Pizza", 1000]];

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

    const baseAmount = 100;

    const diet: Diet = [["A.01.02.003", baseAmount]];

    const [rpcs, processes] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(3);

    // RPC 1
    expect(rpcs[0][0]).toEqual("A.01.11");
    expect(rpcs[0][1]).toEqual(baseAmount * 0.2 * 10 * 1 * 1.7);
    // RPC 2
    expect(rpcs[1][0]).toEqual("A.01.12");
    expect(rpcs[1][1]).toBeCloseTo(baseAmount * 0.8 * 1 * 0.5 * 2);
    // RPC 3
    expect(rpcs[2][0]).toEqual("A.01.13");
    expect(rpcs[2][1]).toBeCloseTo(baseAmount * 0.8 * 1 * 0.5 * 3);

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
    expect(processes["A.01"].facetA).toBeCloseTo(baseAmount);
    // FacetB
    expect(processes["A.01"].facetB).toBeCloseTo(
      baseAmount * 0.2 * 10 + // A.01.0.1
        baseAmount * 0.8 * 1 * 0.5
    );
    // FacetC
    expect(processes["A.01"].facetC).toBeCloseTo(baseAmount * 0.8 * 0.5);
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
    const baseAmount = 100;

    const diet: Diet = [["a", baseAmount]];

    const [rpcs, _facets] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(2);
    // RPC 1
    expect(rpcs[0][0]).toEqual("rpc1");
    expect(rpcs[0][1]).toEqual(
      baseAmount * 0.8 * 1 * 0.5 * 3 + baseAmount * 0.2 * 10 * 1 * 1.7
    );
    // RPC 2
    expect(rpcs[1][0]).toEqual("rpc2");
    expect(rpcs[1][1]).toBeCloseTo(baseAmount * 0.8 * 1 * 0.5 * 2);
  });

  test("Handles combined facets", () => {
    const recipes: FoodsRecipes = {
      "A.01.123.01": [["A.01.123", ["facetA", "facetB", "facetC"], 0.8, 10]],
    };

    const diet: Diet = [["A.01.123.01", 100]];

    const [rpcs, processes] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(1);
    // RPC 1
    expect(rpcs[0][0]).toEqual("A.01.123");
    expect(rpcs[0][1]).toEqual(100 * 0.8 * 10);

    // We should add netAmount for all three facets
    expect(Object.keys(processes["A.01"])).toHaveLength(3);
    expect(processes["A.01"].facetA).toBeCloseTo(100 * 0.8);
    expect(processes["A.01"].facetB).toBeCloseTo(100 * 0.8);
    expect(processes["A.01"].facetC).toBeCloseTo(100 * 0.8);
  });

  test("Adds processes for self-referencing recipes", () => {
    const recipes: FoodsRecipes = {
      "A.01": [
        ["A.01", ["facetA"], 0.2, 10],
        ["A.02", ["facetB"], 0.8, 1],
      ],
    };

    const diet: Diet = [["A.01", 100]];

    const [rpcs, processes] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(2);
    // RPC 1
    expect(rpcs[0][0]).toEqual("A.01");
    expect(rpcs[0][1]).toEqual(100 * 0.2 * 10);
    // RPC 2
    expect(rpcs[1][0]).toEqual("A.02");
    expect(rpcs[1][1]).toBeCloseTo(100 * 0.8 * 1);

    expect(processes["A.01"].facetA).toEqual(100 * 0.2);
    expect(processes["A.01"].facetB).toEqual(100 * 0.8);
  });

  describe("Preparation processes", () => {
    test("Direct: Adds processes to diet on L3 level", () => {
      const pizza: Diet = [["A.19.01.002", 1000]];
      const preparationProcesses = {
        "A.19.01.002": "F28.A07GY",
      };
      const recipes: FoodsRecipes = {
        "A.19.01.002": [["A.19.01.002", [], 1, 1]],
      };

      const [_rpcs, processes] = reduceDiet(
        pizza,
        recipes,
        preparationProcesses
      );

      expect(processes["A.19"]).toHaveProperty("F28.A07GY");
      expect(processes["A.19"]["F28.A07GY"]).toEqual(1000);
    });
    test("Direct: Adds processes to diet entered > L3 level", () => {
      // pizza derivative
      const diet: Diet = [["A.19.01.002.003", 1234]];
      const recipes: FoodsRecipes = {
        "A.19.01.002.003": [["A.19.01.002.003", [], 1, 1]],
      };
      const preparationProcesses = { "A.19.01.002": "F28.A07GY" };

      const [_rpcs, processes] = reduceDiet(
        diet,
        recipes,
        preparationProcesses
      );

      expect(processes["A.19"]).toHaveProperty("F28.A07GY");
      expect(processes["A.19"]["F28.A07GY"]).toEqual(1234);
    });

    test("Indirect: Adds processes to diet entered > L3 level", () => {
      // Dummy product
      const diet: Diet = [["I.20.01.001.001", 1000]];

      // Let's pretend this leads to a pizza
      const recipes: FoodsRecipes = {
        "I.20.01.001.001": [["A.19.01.002.003", [], 0.5, 3]],
        "A.19.01.002.003": [["A.19.01.002.003", [], 1, 1]],
      };
      const preparationProcesses = { "A.19.01.002": "F28.A07GY" };

      const [_rpcs, processes] = reduceDiet(
        diet,
        recipes,
        preparationProcesses
      );

      expect(processes["A.19"]).toHaveProperty("F28.A07GY");
      expect(processes["A.19"]["F28.A07GY"]).toEqual(1000 * 0.5 * 3);
    });
  });

  describe("Packaging", () => {
    test("Direct: Adds packaging to diet on L2 level", () => {
      const diet: Diet = [["A.19.01", 1000]];
      const preparationProcesses = {
        "A.19.01": "P2",
      };
      const recipes: FoodsRecipes = {
        "A.19.01": [["A.19.01", [], 1, 1]],
      };

      const [_rpcs, _processes, packaging] = reduceDiet(
        diet,
        recipes,
        preparationProcesses
      );

      expect(packaging["A.19"]).toHaveProperty("P2");
      expect(packaging["A.19"]["P2"]).toEqual(1000);
    });
    test("Direct: Adds packaging to diet entered > L2 level", () => {
      // pizza derivative
      const diet: Diet = [["A.19.01.002.003", 1234]];
      const recipes: FoodsRecipes = {
        "A.19.01.002.003": [["A.19.01.002.003", [], 1, 1]],
      };
      const preparationProcesses = { "A.19.01": "P1" };

      const [_rpcs, _processes, packaging] = reduceDiet(
        diet,
        recipes,
        preparationProcesses
      );

      expect(packaging["A.19"]).toHaveProperty("P1");
      expect(packaging["A.19"]["P1"]).toEqual(1234);
    });

    test("Indirect: Adds processes to diet entered > L2 level", () => {
      // Dummy product
      const diet: Diet = [["I.20.01.001.001", 1000]];

      // Let's pretend this translates to a pizza
      const recipes: FoodsRecipes = {
        "I.20.01.001.001": [["A.19.01.002.003", [], 0.5, 3]],
        "A.19.01.002.003": [["A.19.01.002.003", [], 1, 1]],
      };
      const preparationProcesses = { "A.19.01": "P5" };

      const [_rpcs, _processes, packaging] = reduceDiet(
        diet,
        recipes,
        preparationProcesses
      );

      expect(packaging["A.19"]).toHaveProperty("P5");
      expect(packaging["A.19"]["P5"]).toEqual(1000 * 0.5 * 3);
    });
  });

  describe("Transportless Amounts", () => {
    test("A transportless process appears in map", () => {
      const recipes: FoodsRecipes = {
        "A.01.example": [["A.01.example", ["F28.A07KD"], 1, 5]],
      };
      const diet: Diet = [["A.01.example", 1000]];

      const [_rpcs, _processes, _packaging, transportless] = reduceDiet(
        diet,
        recipes,
        {}
      );

      expect(transportless).toHaveProperty("A.01.example");
      expect(transportless["A.01.example"]).toEqual(4000);
    });

    test("The exception of polished rice does not appear in map", () => {
      const recipes: FoodsRecipes = {
        "A.01.example": [["A.01.example", ["F28.A0BZV", "F28.A07GG"], 1, 5]],
      };
      const diet: Diet = [["A.01.example", 1000]];

      const [_rpcs, _processes, _packaging, transportless] = reduceDiet(
        diet,
        recipes,
        {}
      );

      expect(transportless).not.toHaveProperty("A.01.example");
    });

    test("Does not appear in map if yield is 1", () => {
      const recipes: FoodsRecipes = {
        "A.01.example": [["A.01.example", ["F28.A07KD"], 1, 1]],
      };
      const diet: Diet = [["A.01.example", 1000]];

      const [_rpcs, _processes, _packaging, transportless] = reduceDiet(
        diet,
        recipes,
        {}
      );

      expect(transportless).not.toHaveProperty("A.01.example");
    });

    describe("A transportless process appears in map for complex recipes", () => {
      test("Case A: Three steps, process in the middle", () => {
        const recipes: FoodsRecipes = {
          "A.01.foo": [["A.01.bar", [], 1, 1]],
          "A.01.bar": [["A.01.baz", ["F28.A0C0B"], 1, 4]],
          "A.01.baz": [["A.01.qux", [], 1, 1.5]],
        };
        const diet: Diet = [["A.01.foo", 1000]];

        const [_rpcs, _processes, _packaging, transportless] = reduceDiet(
          diet,
          recipes,
          {}
        );

        expect(transportless).toHaveProperty("A.01.qux");
        expect(transportless["A.01.qux"]).toEqual(4500);
      });
    });

    test("Case B: Three steps, with processes on each", () => {
      const recipes: FoodsRecipes = {
        "A.01.foo": [["A.01.bar", ["F28.A0C00"], 1.0, 1.1]],
        "A.01.bar": [["A.01.baz", ["F28.A0C0B"], 1.0, 4]],
        "A.01.baz": [["A.01.qux", ["F28.A0C0B"], 1.0, 1.5]],
      };
      const diet: Diet = [["A.01.foo", 1000]];

      const [_rpcs, _processes, _packaging, transportless] = reduceDiet(
        diet,
        recipes,
        {}
      );

      // The amount from yields is 6600
      // But in each step, some yields are added that should not be transported.
      // 1000 -> 1100 = 100
      // 1100 -> 4400 = 3300
      // 4400 -> 6600 = 2200 -> total to subtract = 5600
      // OR: despite 6600 in yield, we only transport 1000
      expect(transportless).toHaveProperty("A.01.qux");
      expect(transportless["A.01.qux"]).toEqual(5600);
    });

    test("Case B: Three steps, with processes and ratios", () => {
      const recipes: FoodsRecipes = {
        "A.01.foo": [["A.01.bar", ["F28.A0C00"], 1.0, 1.1]],
        "A.01.bar": [["A.01.baz", ["F28.A0C0B"], 0.5, 4]],
        "A.01.baz": [["A.01.qux", ["F28.A0C0B"], 1.0, 1.5]],
      };
      const diet: Diet = [["A.01.foo", 1000]];

      const [_rpcs, _processes, _packaging, transportless] = reduceDiet(
        diet,
        recipes,
        {}
      );

      // The amount from yields is 6600
      // But in each step, some yields are added that should not be transported.
      expect(transportless).toHaveProperty("A.01.qux");
      expect(transportless["A.01.qux"]).toEqual(2300);
    });
  });
});
