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

describe("computeDietProcessImpacts", () => {
  test("weights producer-country process impacts by terminal RPC origins", () => {
    const impacts = computeDietProcessImpacts(
      {
        raw: {
          consumer: { "A.01": { "F28.TEST": 500 } },
          producer: { "A.01": { "F28.TEST": 500 } },
        },
      },
      { "F28.TEST": [2, 0, 0, 0, 0, 0, 0, 0, 0] },
      {
        ...emissionsFactors,
        Electricity: { SE: [1, 0, 0], DK: [3, 0, 0] },
      },
      "SE",
      { raw: { DK: [0.25, 0], SE: [0.75, 0] } }
    );

    expect(impacts).toEqual({ "A.01": { "F28.TEST": [2.5, 0, 0] } });
  });
});
