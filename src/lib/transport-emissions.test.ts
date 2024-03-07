import { describe, test, expect } from "vitest";
import computeTransportEmissions from "./transport-emissions";

describe("computeTransportEmissions", () => {
  test("it handles a single product and single country", () => {
    const results = computeTransportEmissions(
      "0111",
      1000, // 1000 g = 1 kg
      {
        "0111": {
          Sweden: [1, 0.5],
        },
      },
      { Sweden: [2, 3] }
    );

    expect(results).toEqual([2, 3]);
  });

  test("it handles a single product with multiple countries", () => {
    const results = computeTransportEmissions(
      "0111",
      1000,
      {
        "0111": {
          Sweden: [0.3, 0],
          France: [0.7, 0],
        },
      },
      { Sweden: [1, 1, 1], France: [2, 3, 4] }
    );

    expect(results).toEqual([
      0.3 * 1 + 0.7 * 2,
      0.3 * 1 + 0.7 * 3,
      0.3 * 1 + 0.7 * 4,
    ]);
  });

  test("it handles the case where there's only RoW", () => {
    const result = computeTransportEmissions(
      "0123",
      1000,
      { "0123": { RoW: [1, 0] } },
      { RoW: [1, 3, 5] }
    );

    expect(result).toEqual([1, 3, 5]);
  });

  test("it uses RoW when country is missing", () => {
    const result = computeTransportEmissions(
      "0123",
      1000,
      { "0123": { Sweden: [0.5, 0], France: [0.5, 0] } },
      { RoW: [1, 3, 5], France: [1, 1, 1] }
    );

    expect(result).toEqual([1, (3 + 1) / 2, (5 + 1) / 2]);
  });
});
