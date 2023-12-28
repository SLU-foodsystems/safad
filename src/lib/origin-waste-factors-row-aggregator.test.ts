import { describe, test, expect } from "vitest";
import originWasteFactorsRestOfWorldAggregator from "./origin-waste-factors-row-aggregator";

describe("origin-waste-factors-row-aggregator.ts", () => {
  test("Does not modify if all above threshold", () => {
    const rpcOriginWasteFactors: RpcOriginWaste = {
      "A.01.02": {
        SE: [0.2, 0.1],
        ES: [0.5, 0.15],
        RoW: [0.3, 0.2],
      },
      "I.02.04.006": {
        EN: [0.5, 0],
        FR: [0.4, 0.15],
        RoW: [0.1, 0.2],
      },
    };
    const results: RpcOriginWaste = originWasteFactorsRestOfWorldAggregator(
      rpcOriginWasteFactors,
      { "A.01.02": new Set(), "I.02.04.006": new Set() },
      0.1
    );

    // Keys
    expect(Object.keys(results)).toEqual(Object.keys(rpcOriginWasteFactors));
    // Check values
    Object.entries(results).forEach(([rpcCode, factors]) => {
      Object.keys(factors).forEach((country) => {
        expect(factors[country][0], "Share").toBeCloseTo(
          rpcOriginWasteFactors[rpcCode][country][0]
        );
        expect(factors[country][1], "Waste").toBeCloseTo(
          rpcOriginWasteFactors[rpcCode][country][1]
        );
      });
    });
  });

  test("computes RoW when missing", () => {
    const rpcFactors: RpcOriginWaste = {
      a: {
        se: [0.2, 0.1],
        es: [0.5, 0.15],
      },
      b: {
        en: [0.5, 0],
        fr: [0.4, 0.15],
      },
    };

    const result = originWasteFactorsRestOfWorldAggregator(
      rpcFactors,
      { a: new Set(), b: new Set() },
      0.1
    );
    expect(result).toHaveProperty("a");
    expect(result).toHaveProperty("b");

    // First, check those that should not be modified
    expect(result.a.se).toEqual([0.2, 0.1]);
    expect(result.a.es).toEqual([0.5, 0.15]);
    expect(result.b.en).toEqual([0.5, 0]);
    expect(result.b.fr).toEqual([0.4, 0.15]);

    // Compute the weighted mean wastes
    const rowWasteA = (0.2 * 0.1 + 0.5 * 0.15) / (0.2 + 0.5);
    const rowWasteB = (0.4 * 0.15) / 0.9;

    // Then, check RoW
    // Compute the expected env footprints for A and B
    expect(result.a.RoW[0]).toBeCloseTo(0.3);
    expect(result.a.RoW[1]).toBeCloseTo(rowWasteA);
    expect(result.b.RoW[0]).toBeCloseTo(0.1);
    expect(result.b.RoW[1]).toBeCloseTo(rowWasteB);
  });

  test("merges into RoW based on threshold and env factors", () => {
    const result: RpcOriginWaste = originWasteFactorsRestOfWorldAggregator(
      {
        a: {
          se: [0.2, 0.1],
          fr: [0.05, 0.1], // Should not be Row, as we have env data
          es: [0.5, 0.15],
          de: [0.08, 0.1], // Should be gruped to RoW
          RoW: [0.17, 0.15],
        },
      },
      { a: new Set(["se", "fr", "es", "RoW"]) },
      0.1
    );

    expect(result).toHaveProperty("a");

    const expectedRoWShare = 0.08 + 0.17; // de + RoW
    const expectedRoWWaste = (0.08 * 0.1 + 0.17 * 0.15) / 0.25;

    const actualKeys = Object.keys(result.a);
    const expectedKeys = ["se", "fr", "es", "RoW"];
    expect(actualKeys).toHaveLength(expectedKeys.length);

    expect(result.a.se[0]).toEqual(0.2);
    expect(result.a.fr[0]).toEqual(0.05);
    expect(result.a.es[0]).toEqual(0.5);
    expect(result.a.RoW[0]).toEqual(expectedRoWShare);

    expect(result.a.se[1]).toEqual(0.1);
    expect(result.a.fr[1]).toEqual(0.1);
    expect(result.a.es[1]).toEqual(0.15);
    expect(result.a.RoW[1]).toBeCloseTo(expectedRoWWaste);
  });

  test("merges into RoW based on threshold and env factors, when RoW missing", () => {
    const results: RpcOriginWaste = originWasteFactorsRestOfWorldAggregator(
      {
        a: {
          se: [0.2, 0.1],
          fr: [0.05, 0.1], // Should not be RoW, as we have env data
          es: [0.5, 0.15],
          de: [0.08, 0.2], // Should be grouped to RoW
        },
      },
      { a: new Set(["se", "fr", "es"]) },
      0.1
    );

    expect(results).toHaveProperty("a");

    const expectedRoWShare = 1 - (0.2 + 0.05 + 0.5);
    // Should be (weighted) average of all wastes
    const expectedRoWWaste =
      (0.2 * 0.1 + 0.05 * 0.1 + 0.5 * 0.15 + 0.08 * 0.2) /
      (0.2 + 0.05 + 0.5 + 0.08);

    expect(results.a.RoW[0]).toEqual(expectedRoWShare);
    expect(results.a.RoW[1]).toBeCloseTo(expectedRoWWaste);
  });
});
