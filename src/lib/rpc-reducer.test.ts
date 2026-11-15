import { describe, expect, test } from "vitest";
import _reduceDiet from "./rpc-reducer";

type PartialFoodsRecipeEl = [
  string,
  string[]?,
  number?,
  number?,
  string[]?,
  number?,
  boolean?,
  boolean?,
];

type PartialFoodsRecipe = Record<string, PartialFoodsRecipeEl[]>;
const conditionalRecipeEntry = ([
  rpcCode,
  facets,
  share,
  revYield,
  prepProcs,
  prepRevYield,
  inclCompPrep,
  netWeightTransport,
]: PartialFoodsRecipeEl): FoodsRecipeElement => ({
  rpcCode,
  processFacets: facets || [],
  share: share || 1,
  reverseYield: revYield || 1,
  preparationProcessFacets: prepProcs || [],
  preparationReverseYield: prepRevYield || 1,
  includeComponentPreparation: inclCompPrep || false,
  transportOnNetWeight: netWeightTransport || false,
});

const reduceDiet = (
  diet: Diet,
  recipes: PartialFoodsRecipe,
  packagingCodes: Record<string, string>
) =>
  _reduceDiet(
    diet,
    Object.fromEntries(
      Object.entries(recipes).map(([k, v]) => [
        k,
        v.map((e) => conditionalRecipeEntry(e)),
      ])
    ),
    packagingCodes
  );

describe("RPC reducer", () => {
  test("Handles direct RPCs", () => {
    const recipes: PartialFoodsRecipe = {};
    const diet: Diet = [
      ["foo", 100],
      ["bar", 200],
    ];

    const [rpcs, processLocations] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(2);

    expect(rpcs[0]).toEqual(["foo", 100]);
    expect(rpcs[1]).toEqual(["bar", 200]);

    // No facets.
    expect(Object.keys(processLocations)).toHaveLength(0);
  });

  test("Handles direct RPCs (with facets)", () => {
    const recipes: PartialFoodsRecipe = {
      "A.01.example": [["A.01.example", ["facetA"], 1, 1]],
    };
    const diet: Diet = [["A.01.example", 100]];

    const [[rpc], processLocations] = reduceDiet(diet, recipes, {});
    expect(rpc![0]).toEqual("A.01.example");
    expect(rpc![1]).toBeCloseTo(100);

    expect(processLocations).toEqual({
      "A.01.example": {
        consumer: { "A.01": { facetA: 100 } },
        producer: {},
      },
    });
  });

  test("Carries first-boundary transport through nested yields", () => {
    const recipes: PartialFoodsRecipe = {
      product: [["ingredient", [], 1, 2, [], 0, true, true]],
      ingredient: [["raw", [], 1, 0.5, [], 0, true, false]],
    };

    const [rpcs, _processes, _packaging, transportAmounts] = reduceDiet(
      [["product", 1000]],
      recipes,
      {}
    );

    expect(rpcs).toEqual([["raw", 1000]]);
    expect(transportAmounts).toEqual({ raw: 1000 });
  });

  test("Records process location per terminal RPC", () => {
    const recipes: PartialFoodsRecipe = {
      "A.01.food": [
        ["A.01.ingredient", ["F28.CONSUMER"], 1, 1, [], 0, false, false],
      ],
      "A.01.ingredient": [["raw", ["F28.PRODUCER"], 1, 2, [], 0, false, true]],
      raw: [["raw", [], 1, 1, [], 0, false, false]],
    };

    const [, processLocationAmounts] = reduceDiet(
      [["A.01.food", 1000]],
      recipes,
      {}
    );

    expect(processLocationAmounts).toEqual({
      raw: {
        consumer: {
          "A.01": {
            "F28.CONSUMER": 1000,
          },
        },
        producer: {
          "A.01": {
            "F28.PRODUCER": 2000,
          },
        },
      },
    });
  });

  test("Facet amounts based on output", () => {
    const recipes: PartialFoodsRecipe = {
      // Couscous to Wheat Semolina
      "A.01.03.001.007": [["A.01.03.001.012", [], 1, 1]],
      // Wheat Semolina to Wheat Grain
      "A.01.03.001.012": [["A.01.02.001.002", ["F28.A0C03"], 1, 1.3013]],
      // Wheat Grain to Dummy extra product
      "A.01.02.001.002": [["A.01.02.001.003", ["F28.A0C04"], 1, 2]],
    };

    // Couscous
    const diet: Diet = [["A.01.03.001.007", 1000]];

    const [rpcs, processLocations] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(1);
    const [rpcCode, rpcAmount] = rpcs[0]!;

    expect(rpcCode).toEqual("A.01.02.001.003");
    expect(rpcAmount).toEqual(1000 * 1.3013 * 2);

    expect(processLocations).toEqual({
      "A.01.02.001.003": {
        consumer: {
          "A.01": {
            "F28.A0C03": 1000 * 1.3013,
            "F28.A0C04": 1000 * 1.3013 * 2,
          },
        },
        producer: {},
      },
    });
  });

  test("Processes with ratios", () => {
    const recipes: PartialFoodsRecipe = {
      // Couscous to Wheat Semolina
      "A.01.Pizza": [
        ["A.02.Tomatoes", ["Cooking"], 0.3, 3],
        ["A.01.Bread", ["Baking"], 0.7, 1],
      ],
    };

    const diet: Diet = [["A.01.Pizza", 1000]];

    const [rpcs, processLocations] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(2);

    expect(rpcs![0]![0]).toEqual("A.02.Tomatoes");
    expect(rpcs![0]![1]).toBeCloseTo(1000 * 0.3 * 3);

    expect(rpcs![1]![0]).toEqual("A.01.Bread");
    expect(rpcs![1]![1]).toBeCloseTo(1000 * 0.7 * 1);

    expect(processLocations).toMatchObject({
      "A.02.Tomatoes": {
        consumer: { "A.01": { Cooking: expect.any(Number) } },
        producer: {},
      },
      "A.01.Bread": {
        consumer: { "A.01": { Baking: 700 } },
        producer: {},
      },
    });
    expect(
      processLocations["A.02.Tomatoes"]!.consumer["A.01"]!.Cooking
    ).toBeCloseTo(900);
  });

  test("Handles nested RPCs", () => {
    const recipes: PartialFoodsRecipe = {
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

    const [rpcs, processLocations] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(3);

    // RPC 1
    expect(rpcs[0]![0]).toEqual("A.01.11");
    expect(rpcs[0]![1]).toEqual(baseAmount * 0.2 * 10 * 1 * 1.7);
    // RPC 2
    expect(rpcs[1]![0]).toEqual("A.01.12");
    expect(rpcs[1]![1]).toBeCloseTo(baseAmount * 0.8 * 1 * 0.5 * 2);
    // RPC 3
    expect(rpcs[2]![0]).toEqual("A.01.13");
    expect(rpcs[2]![1]).toBeCloseTo(baseAmount * 0.8 * 1 * 0.5 * 3);

    expect(processLocations).toEqual({
      "A.01.11": {
        consumer: {
          "A.01": { facetA: 200, facetB: 340 },
        },
        producer: {},
      },
      "A.01.12": {
        consumer: {
          "A.01": { facetA: 40, facetB: 80 },
        },
        producer: {},
      },
      "A.01.13": {
        consumer: {
          "A.01": { facetA: 40, facetC: 120 },
        },
        producer: {},
      },
    });
  });

  test("Merges reappering RPCs", () => {
    const recipes: PartialFoodsRecipe = {
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
    // RPC 1
    expect(rpcs).toEqual([
      [
        "rpc1",
        baseAmount * 0.8 * 1 * 0.5 * 3 + baseAmount * 0.2 * 10 * 1 * 1.7,
      ],
      ["rpc2", baseAmount * 0.8 * 1 * 0.5 * 2],
    ]);
  });

  test("Handles combined facets", () => {
    const recipes: PartialFoodsRecipe = {
      "A.01.123.01": [["A.01.123", ["facetA", "facetB", "facetC"], 0.8, 10]],
    };

    const diet: Diet = [["A.01.123.01", 100]];

    const [rpcs, processLocations] = reduceDiet(diet, recipes, {});
    expect(rpcs).toHaveLength(1);
    // RPC 1
    expect(rpcs).toEqual([["A.01.123", 100 * 0.8 * 10]]);

    expect(processLocations).toEqual({
      "A.01.123": {
        consumer: {
          "A.01": {
            facetA: 100 * 0.8 * 10,
            facetB: 100 * 0.8 * 10,
            facetC: 100 * 0.8 * 10,
          },
        },
        producer: {},
      },
    });
  });

  test("Adds processes for self-referencing recipes", () => {
    const recipes: PartialFoodsRecipe = {
      "A.01": [
        ["A.01", ["facetA"], 0.2, 10],
        ["A.02", ["facetB"], 0.8, 1],
      ],
    };

    const diet: Diet = [["A.01", 100]];

    const [rpcs, processLocations] = reduceDiet(diet, recipes, {});
    expect(rpcs).toEqual([
      ["A.01", 100 * 0.2 * 10],
      ["A.02", 100 * 0.8 * 1],
    ]);

    expect(processLocations).toEqual({
      "A.01": {
        consumer: { "A.01": { facetA: 100 * 0.2 * 10 } },
        producer: {},
      },
      "A.02": {
        consumer: { "A.01": { facetB: 100 * 0.8 } },
        producer: {},
      },
    });
  });

  describe("Packaging", () => {
    test("Direct: Adds packaging to diet on L3 level", () => {
      const diet: Diet = [["A.19.01.001", 1000]];
      const packagingCodes = {
        "A.19.01.001": "P2",
      };

      const [_rpcs, _processes, packaging] = reduceDiet(
        diet,
        {},
        packagingCodes
      );

      expect(packaging).toEqual({
        "A.19": {
          P2: 1000,
        },
      });
    });

    test("Inherits packing from lower levels", () => {
      // pizza derivative
      const diet: Diet = [
        ["A.17.01.002.003", 1000],
        ["A.18.01.002", 1000],
        ["A.19.01", 1000],
        ["A.20", 1000],
      ];
      const packagingCodes = {
        "A.17": "P1",
        "A.18.01": "P2",
        "A.19": "P3",
        "A.20": "P4",
      };

      const [_rpcs, _processes, packaging] = reduceDiet(
        diet,
        {},
        packagingCodes
      );

      expect(packaging).toEqual({
        "A.17": { P1: 1000 },
        "A.18": { P2: 1000 },
        "A.19": { P3: 1000 },
        "A.20": { P4: 1000 },
      });
    });

    test("Inherits packing from nearest level", () => {
      // pizza derivative
      const diet: Diet = [["A.17.01.002.003.004", 1000]];
      const packagingCodes = {
        "A.17": "P1",
        "A.17.01": "P2",
        "A.17.01.002": "P3",
        "A.17.01.002.003": "P4",
      };

      const [_rpcs, _processes, packaging] = reduceDiet(
        diet,
        {},
        packagingCodes
      );

      expect(packaging).toEqual({
        "A.17": { P4: 1000 },
      });
    });

    test("Does not translate I-codes to A-codes, yet stores under A-level", () => {
      // pizza derivative
      const diet: Diet = [["I.19.01.002.003", 1234]];
      const preparationProcesses = { "I.19.01.002": "P1" };

      const [_rpcs, _processes, packaging] = reduceDiet(
        diet,
        {},
        preparationProcesses
      );

      expect(packaging).toEqual({ "A.19": { P1: 1234 } });
    });

    test("Only records packaging for the entry-diet", () => {
      // Dummy product
      const diet: Diet = [["A.20.01.001.001", 1000]];

      // Let's pretend this translates to a pizza
      const recipes: PartialFoodsRecipe = {
        "A.20.01.001.001": [
          ["A.19.01.002.003", [], 0.5, 3],
          ["A.19.02.003.004", [], 0.5, 3],
        ],
        "A.19.01.002.003": [["A.19.01.002.003", [], 1, 1]],
      };
      const packagingCodes = {
        "A.20.01.001": "P5",
        "A.19.01.002.003": "P1",
        "A.19.02.003.004": "P2",
      };

      const [_rpcs, _processes, packaging] = reduceDiet(
        diet,
        recipes,
        packagingCodes
      );

      expect(packaging).toEqual({
        "A.20": {
          P5: 1000,
        },
      });
    });
  });

  describe("Transport amounts", () => {
    test("Rejects a second net boundary after gross transport", () => {
      const recipes: PartialFoodsRecipe = {
        product: [["processed", [], 1, 1, [], 0, false, true]],
        processed: [["raw", [], 1, 2, [], 0, false, false]],
        raw: [["source", [], 1, 1, [], 0, false, true]],
      };

      expect(() => reduceDiet([["product", 1000]], recipes, {})).toThrow(
        "Invalid transport path"
      );
    });

    test("A first net-weight boundary records the row amount", () => {
      const recipes: PartialFoodsRecipe = {
        "A.01.example": [
          ["A.01.example", ["F28.NOT_HARDCODED"], 1, 5, [], 0, true, true],
        ],
      };
      const diet: Diet = [["A.01.example", 1000]];

      const [_rpcs, _processes, _packaging, transportAmount] = reduceDiet(
        diet,
        recipes,
        {}
      );

      expect(transportAmount).toEqual({ "A.01.example": 5000 });
    });

    test("A gross-weight-only branch transports the terminal amount", () => {
      const recipes: PartialFoodsRecipe = {
        "A.01.example": [
          ["A.01.example", ["F28.A07KD"], 1, 5, [], 0, true, false],
        ],
      };
      const diet: Diet = [["A.01.example", 1000]];

      const [_rpcs, _processes, _packaging, transportAmount] = reduceDiet(
        diet,
        recipes,
        {}
      );

      expect(transportAmount).toEqual({ "A.01.example": 5000 });
    });

    test("A net boundary with yield 1 still records transport", () => {
      const recipes: PartialFoodsRecipe = {
        "A.01.example": [
          ["A.01.example", ["F28.A07KD"], 1, 1, [], 0, true, true],
        ],
      };
      const diet: Diet = [["A.01.example", 1000]];

      const [_rpcs, _processes, _packaging, transportAmount] = reduceDiet(
        diet,
        recipes,
        {}
      );

      expect(transportAmount).toEqual({ "A.01.example": 1000 });
    });

    describe("First-boundary transport for complex recipes", () => {
      test("Case A: Three steps, process in the middle", () => {
        const recipes: PartialFoodsRecipe = {
          // No change
          "A.01.foo": [["A.01.bar", [], 1, 1, [], 1, false, false]],
          // The first net boundary transports the pre-yield amount.
          "A.01.bar": [["A.01.baz", ["F28.A0C0B"], 1, 4, [], 1, false, true]],
          // Later gross processing does not change the transported amount.
          "A.01.baz": [["A.01.qux", [], 1, 1.5, [], 1, false, false]],
        };
        const diet: Diet = [["A.01.foo", 1000]];

        const [rpcs, _processes, _packaging, transportAmount] = reduceDiet(
          diet,
          recipes,
          {}
        );

        expect(rpcs).toEqual([["A.01.qux", 6000]]);
        expect(transportAmount).toEqual({ "A.01.qux": 1000 });
      });
    });

    describe("All steps use net-weight transport", () => {
      test("Case B: Three steps, with processes on each", () => {
        const recipes: PartialFoodsRecipe = {
          "A.01.foo": [
            ["A.01.bar", ["F28.A0C00"], 1.0, 1.1, [], 0, true, true],
          ],
          "A.01.bar": [["A.01.baz", ["F28.A0C0B"], 1.0, 4, [], 0, true, true]],
          "A.01.baz": [
            ["A.01.qux", ["F28.A0C0B"], 1.0, 1.5, [], 0, true, true],
          ],
        };
        const diet: Diet = [["A.01.foo", 1000]];

        const [_rpcs, _processes, _packaging, transportAmount] = reduceDiet(
          diet,
          recipes,
          {}
        );

        // Despite the downstream yields, only the first row amount is
        // transported.
        expect(transportAmount).toEqual({ "A.01.qux": 1000 });
      });

      test("Case B: Three steps, with processes and ratios", () => {
        const recipes: PartialFoodsRecipe = {
          // 1000 transported; later yields do not alter it.
          "A.01.foo": [
            ["A.01.bar", ["F28.A0C00"], 1.0, 1.1, [], 0, true, true],
          ],
          "A.01.bar": [["A.01.baz", ["F28.A0C0B"], 0.5, 4, [], 0, true, true]],
          "A.01.baz": [
            ["A.01.qux", ["F28.A0C0B"], 1.0, 1.5, [], 0, true, true],
          ],
        };
        const diet: Diet = [["A.01.foo", 1000]];

        const [rpcs, _processes, _packaging, transportAmount] = reduceDiet(
          diet,
          recipes,
          {}
        );

        expect(rpcs).toEqual([["A.01.qux", 3300]]);

        // The amount from yields is 3300, but only the first row amount moves.
        expect(transportAmount).toEqual({ "A.01.qux": 1000 });
      });
    });

    describe("Transportless, mixing ratio and yield", () => {
      test("Case C: Ratio but yield is 1, one step", () => {
        const recipes: PartialFoodsRecipe = {
          "I.19.04.002.002": [
            ["A.16.02.028", ["F28.A07KG"], 0.004, 1, [], 0, true, true],
          ],
          "A.16.02.028": [["A.16.02.028", [], 1, 1]],
        };
        const diet: Diet = [["I.19.04.002.002", 1000]];

        const [_rpcs, _processes, _packaging, transportAmount] = reduceDiet(
          diet,
          recipes,
          {}
        );

        expect(transportAmount).toEqual({ "A.16.02.028": 4 });
      });

      test("Case C: Ratio and yield, one step", () => {
        const recipes: PartialFoodsRecipe = {
          "I.19.04.002.002": [
            ["A.16.02.028", ["F28.A07KG"], 0.004, 1.5, [], 0, true, true],
          ],
          "A.16.02.028": [["A.16.02.028", [], 1, 1]],
        };
        const diet: Diet = [["I.19.04.002.002", 1000]];

        const [_rpcs, _processes, _packaging, transportAmount] = reduceDiet(
          diet,
          recipes,
          {}
        );

        expect(transportAmount).toEqual({ "A.16.02.028": 4 });
      });

      /**
       * This one took me quite some time to wrap my head around.
       *
       * A first net boundary transports the selected ingredient amount, even
       * when its yield is 1.
       */
      test("Case C: Ratio but yield is 1, multi-step", () => {
        const recipes: PartialFoodsRecipe = {
          "I.19.04.002.002": [
            ["A.16.02.028", ["F28.A07KG"], 0.004, 1, [], 0, true, true],
          ],
          "A.16.02.028": [
            ["A.16.foo", ["F28.A07KG"], 1, 10, [], 0, true, true],
          ],
          "A.16.foo": [
            ["A.16.bar", ["F28.A07KG"], 0.5, 1.1, [], 0, true, true],
          ],
        };
        const diet: Diet = [["I.19.04.002.002", 1000]];

        const [_rpcs, _processes, _packaging, transportAmount] = reduceDiet(
          diet,
          recipes,
          {}
        );

        expect(transportAmount).toEqual({ "A.16.bar": 4 });
      });

      test("Case D: Ratio but yield is 1, one step", () => {
        const recipes: PartialFoodsRecipe = {
          "I.19.04.002.002": [
            ["A.16.02.028", ["F28.A07KG"], 0.004, 10, [], 0, true, true],
          ],
          "A.16.02.028": [["A.16.02.028", [], 1, 1]],
        };
        const diet: Diet = [["I.19.04.002.002", 1000]];

        const [rpcs, _processes, _packaging, transportAmount] = reduceDiet(
          diet,
          recipes,
          {}
        );

        expect(rpcs).toEqual([["A.16.02.028", 40]]);

        expect(transportAmount).toEqual({
          "A.16.02.028": 4,
        });
      });
    });
  });

  describe("PDF transport examples", () => {
    test("1. Transports a raw RPC", () => {
      const recipes: PartialFoodsRecipe = {
        apple: [["apple", [], 1, 1, [], 0, false, false]],
      };

      const [rpcs, , , transportAmounts] = reduceDiet(
        [["apple", 1000]],
        recipes,
        {}
      );

      expect(rpcs).toEqual([["apple", 1000]]);
      expect(transportAmounts).toEqual({ apple: 1000 });
    });

    test("2. Net 0 transports the raw amount with yield and allocation", () => {
      const recipes: PartialFoodsRecipe = {
        flour: [["wheat", [], 1, 1.43 * 0.86, [], 0, false, false]],
        wheat: [["wheat", [], 1, 1, [], 0, false, false]],
      };

      const [rpcs, , , transportAmounts] = reduceDiet(
        [["flour", 1000]],
        recipes,
        {}
      );

      expect(rpcs).toEqual([["wheat", 1.43 * 0.86 * 1000]]);
      expect(transportAmounts).toEqual({ wheat: 1.43 * 0.86 * 1000 });
    });

    test("3. Net 1 transports the whole product before yield", () => {
      const recipes: PartialFoodsRecipe = {
        juice: [["apple", [], 1, 1.54, [], 0, false, true]],
        apple: [["apple", [], 1, 1, [], 0, false, false]],
      };

      const [rpcs, , , transportAmounts] = reduceDiet(
        [["juice", 1000]],
        recipes,
        {}
      );

      expect(rpcs).toEqual([["apple", 1540]]);
      expect(transportAmounts).toEqual({ apple: 1000 });
    });

    test("4. Consecutive Net 1 rows transport only at the first row", () => {
      const recipes: PartialFoodsRecipe = {
        powder: [["milk", [], 1, 9.16, [], 0, false, true]],
        milk: [["wholeMilk", [], 1, 1.05 * 0.76, [], 0, false, true]],
        wholeMilk: [["wholeMilk", [], 1, 1, [], 0, false, false]],
      };

      const [rpcs, , , transportAmounts] = reduceDiet(
        [["powder", 1000]],
        recipes,
        {}
      );

      expect(rpcs).toEqual([["wholeMilk", 9.16 * 1.05 * 0.76 * 1000]]);
      expect(transportAmounts).toEqual({ wholeMilk: 1000 });
    });

    test("5. Mixed branches use their own first transport boundary", () => {
      const recipes: PartialFoodsRecipe = {
        compote: [
          ["apple", [], 0.962, 1.35, [], 0, false, false],
          ["sugar", [], 0.038, 1, [], 0, false, false],
        ],
        apple: [["apple", [], 1, 1, [], 0, false, false]],
        sugar: [
          ["beet", [], 0.5, 7.63 * 0.8, [], 0, false, true],
          ["cane", [], 0.5, 9.7 * 0.8, [], 0, false, true],
        ],
        beet: [["beet", [], 1, 1, [], 0, false, false]],
        cane: [["cane", [], 1, 1, [], 0, false, false]],
      };

      const [rpcs, , , transportAmounts] = reduceDiet(
        [["compote", 1000]],
        recipes,
        {}
      );

      expect(rpcs).toEqual([
        ["apple", 0.962 * 1.35 * 1000],
        ["beet", 0.038 * 0.5 * 7.63 * 0.8 * 1000],
        ["cane", 0.038 * 0.5 * 9.7 * 0.8 * 1000],
      ]);
      expect(transportAmounts).toEqual({
        apple: 0.962 * 1.35 * 1000,
        beet: 0.038 * 0.5 * 1000,
        cane: 0.038 * 0.5 * 1000,
      });
    });

    test("6. Multiple Net 1 branches add their transported amounts", () => {
      const recipes: PartialFoodsRecipe = {
        vinegar: [
          ["whiteWine", [], 0.5, 1, [], 0, false, true],
          ["redWine", [], 0.5, 1, [], 0, false, true],
        ],
        whiteWine: [["grapes", [], 1, 1.43, [], 0, false, true]],
        redWine: [["grapes", [], 1, 1.43, [], 0, false, true]],
        grapes: [["grapes", [], 1, 1, [], 0, false, false]],
      };

      const [rpcs, , , transportAmounts] = reduceDiet(
        [["vinegar", 1000]],
        recipes,
        {}
      );

      expect(rpcs).toEqual([["grapes", 1430]]);
      expect(transportAmounts).toEqual({ grapes: 1000 });
    });

    test("7. Applies the first-boundary rule through a complex recipe", () => {
      const recipes: PartialFoodsRecipe = {
        strudel: [
          ["driedFruit", [], 0.02, 1, [], 0, false, false],
          ["compote", [], 0.48, 1, [], 0, false, false],
          ["pastry", [], 0.5, 1, [], 0, false, false],
        ],
        driedFruit: [["grapes", [], 1, 4, [], 0, false, true]],
        grapes: [["grapes", [], 1, 1, [], 0, false, false]],
        compote: [
          ["apple", [], 0.962, 1.35, [], 0, false, false],
          ["sugar", [], 0.038, 1, [], 0, false, false],
        ],
        apple: [["apple", [], 1, 1, [], 0, false, false]],
        sugar: [
          ["beet", [], 0.5, 7.63 * 0.8, [], 0, false, true],
          ["cane", [], 0.5, 9.7 * 0.8, [], 0, false, true],
        ],
        beet: [["beet", [], 1, 1, [], 0, false, false]],
        cane: [["cane", [], 1, 1, [], 0, false, false]],
        pastry: [
          ["flour", [], 0.3985, 1, [], 0, false, false],
          ["butter", [], 0.2895, 1, [], 0, false, false],
          ["water", [], 0.302, 1, [], 0, false, false],
          ["salt", [], 0.01, 1, [], 0, false, false],
        ],
        flour: [["wheat", [], 1, 1.43 * 0.86, [], 0, false, false]],
        wheat: [["wheat", [], 1, 1, [], 0, false, false]],
        butter: [["cream", [], 1, 2 * 0.91, [], 0, false, true]],
        cream: [["milk", [], 1, 13.17 * 0.24, [], 0, false, true]],
        milk: [["milk", [], 1, 1, [], 0, false, false]],
        water: [["water", [], 1, 1, [], 0, false, false]],
        salt: [["salt", [], 1, 1, [], 0, false, false]],
      };

      const [rpcs, , , transportAmounts] = reduceDiet(
        [["strudel", 1000]],
        recipes,
        {}
      );

      const expectedRpcs: Diet = [
        ["grapes", 20 * 4],
        ["apple", 0.48 * 0.962 * 1.35 * 1000],
        ["beet", 0.48 * 0.038 * 0.5 * 7.63 * 0.8 * 1000],
        ["cane", 0.48 * 0.038 * 0.5 * 9.7 * 0.8 * 1000],
        ["wheat", 0.5 * 0.3985 * 1.43 * 0.86 * 1000],
        ["milk", 0.5 * 0.2895 * 2 * 0.91 * 13.17 * 0.24 * 1000],
        ["water", 0.5 * 0.302 * 1000],
        ["salt", 0.5 * 0.01 * 1000],
      ];
      expect(rpcs).toHaveLength(expectedRpcs.length);
      expectedRpcs.forEach(([code, amount], index) => {
        expect(rpcs[index]?.[0]).toBe(code);
        expect(rpcs[index]?.[1]).toBeCloseTo(amount);
      });
      const expectedTransportAmounts: Record<string, number> = {
        grapes: 0.02 * 1000,
        apple: 0.48 * 0.962 * 1.35 * 1000,
        beet: 0.48 * 0.038 * 0.5 * 1000,
        cane: 0.48 * 0.038 * 0.5 * 1000,
        wheat: 0.5 * 0.3985 * 1.43 * 0.86 * 1000,
        milk: 0.5 * 0.2895 * 1000,
        water: 0.5 * 0.302 * 1000,
        salt: 0.5 * 0.01 * 1000,
      };
      expect(Object.keys(transportAmounts)).toEqual(
        Object.keys(expectedTransportAmounts)
      );
      Object.entries(expectedTransportAmounts).forEach(([code, amount]) => {
        expect(transportAmounts[code]).toBeCloseTo(amount);
      });
    });
  });
});
