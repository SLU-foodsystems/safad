import { describe, test, expect } from "vitest";
import { expandedImpacts } from "./impacts-csv-utils";
import { CO2E_CONV_FACTORS } from "./constants";

describe("expandedImpacts adds together footprints", () => {
  // co2e, co2, FCH4, BCH4, N2O
  const rpcFootprints = [1000, 2000, 3000, 4000, 5000, 6000 /*...*/];
  // co2, FCH4, N2O
  const processEmissions = [100, 200, 300];
  // co2, FCH4, BCH4, N2O
  const packagingEmissions = [10, 20, 30, 40];
  // co2, FCH4, N2O
  const transportEmissions = [1, 2, 3];

  const actual = expandedImpacts(
    rpcFootprints,
    processEmissions,
    packagingEmissions,
    transportEmissions
  );

  test("CO2e", () => {
    const processCO2e =
      processEmissions[0]! +
      processEmissions[1]! * CO2E_CONV_FACTORS.FCH4 +
      processEmissions[2]! * CO2E_CONV_FACTORS.N2O;
    const packagingCO2e =
      packagingEmissions[0]! +
      packagingEmissions[1]! * CO2E_CONV_FACTORS.FCH4 +
      packagingEmissions[2]! * CO2E_CONV_FACTORS.BCH4 +
      packagingEmissions[3]! * CO2E_CONV_FACTORS.N2O;
    const transportCO2e =
      transportEmissions[0]! +
      transportEmissions[1]! * CO2E_CONV_FACTORS.FCH4 +
      transportEmissions[2]! * CO2E_CONV_FACTORS.N2O;

    const expectedCO2e =
      rpcFootprints[0]! + processCO2e + packagingCO2e + transportCO2e;
    expect(actual[0]).toEqual(expectedCO2e);
  });

  test("CO2", () => {
    const expectedCO2 =
      rpcFootprints[1]! +
      processEmissions[0]! +
      packagingEmissions[0]! +
      transportEmissions[0]!;
    expect(actual[1]).toEqual(expectedCO2);
  });

  test("Fossil CH4", () => {
    const expected =
      rpcFootprints[2]! +
      processEmissions[1]! +
      packagingEmissions[1]! +
      transportEmissions[1]!;
    expect(actual[2]).toEqual(expected);
  });

  test("Biogenic CH4", () => {
    const expected = rpcFootprints[3]! + packagingEmissions[2]!;
    expect(actual[3]).toEqual(expected);
  });

  test("N2O", () => {
    const expected =
      rpcFootprints[4]! +
      processEmissions[2]! +
      packagingEmissions[3]! +
      transportEmissions[2]!;
    expect(actual[4]).toEqual(expected);
  });
});
