import { describe, expect, test } from "vitest";
import { computeDietProcessImpacts } from "./process-emissions.ts";

const carriers = [
  "Electricity",
  "Heating oil",
  "Natural gas",
  "Other fossil energy sources",
  "Bark and chips",
  "Pellets and briquettes",
  "Other renewable energy sources",
  "Diesel fuel",
  "District heating",
];

const emissionsFactors = Object.fromEntries(
  carriers.map((carrier) => [carrier, { SE: [1, 0, 0] }])
);

const recipes: FoodsRecipes = {
  "A.01.food": [
    {
      rpcCode: "raw",
      processFacets: ["F28.TEST"],
      share: 1,
      reverseYield: 1,
      preparationProcessFacets: [],
      preparationReverseYield: 1,
      includeComponentPreparation: false,
      transportOnNetWeight: false,
    },
  ],
  "A.01.other": [
    {
      rpcCode: "raw",
      processFacets: ["F28.TEST"],
      share: 1,
      reverseYield: 1,
      preparationProcessFacets: [],
      preparationReverseYield: 1,
      includeComponentPreparation: false,
      transportOnNetWeight: false,
    },
  ],
  "A.02.food": [
    {
      rpcCode: "raw",
      processFacets: ["F28.TEST"],
      share: 1,
      reverseYield: 1,
      preparationProcessFacets: [],
      preparationReverseYield: 1,
      includeComponentPreparation: false,
      transportOnNetWeight: false,
    },
  ],
};

describe("computeDietProcessImpacts", () => {
  test("aggregates process impacts by food category", () => {
    const impacts = computeDietProcessImpacts(
      [
        ["A.01.food", 1000],
        ["A.01.other", 500],
        ["A.02.food", 1000],
      ],
      recipes,
      { "F28.TEST": [2, 0, 0, 0, 0, 0, 0, 0, 0] },
      emissionsFactors,
      "SE"
    );

    expect(impacts).toEqual({
      "A.01": { "F28.TEST": [3, 0, 0] },
      "A.02": { "F28.TEST": [2, 0, 0] },
    });
  });
});
