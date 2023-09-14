import { describe, test, expect } from "vitest";
import computeTransportEmissions from "./transport-emissions";

describe("computeTransportEmissions", () => {
  test("it handles a single product and single country", () => {
    const results = computeTransportEmissions(
      "0111",
      1000, // 1000 g = 1 kg
      {
        "0111": {
          Sweden: [1, 0.5, 0.3],
        },
      },
      { Sweden: [2, 3, 4] },
      "Sweden"
    );

    expect(results).toEqual([2, 3, 4]);
  });

  test("it handles a single product with multiple countries", () => {
    const results = computeTransportEmissions(
      "0111",
      1000,
      {
        "0111": {
          Sweden: [0.3, 0, 0],
          France: [0.7, 0, 0],
        },
      },
      { Sweden: [1, 1, 1], France: [2, 3, 4] },
      "Sweden"
    );

    expect(results).toEqual([
      0.3 * 1 + 0.7 * 2,
      0.3 * 1 + 0.7 * 3,
      0.3 * 1 + 0.7 * 4,
    ]);
  });

  test("it distributes RoW across countries", () => {
    const result = computeTransportEmissions(
      "0111",
      1000,
      {
        "0111": {
          Sweden: [0.3, 0, 0],
          France: [0.2, 0, 0],
          RoW: [0.4, 0, 0],
        },
      },
      { Sweden: [1, 3, 5], France: [2, 4, 6] },
      "Sweden"
    );

    const multiplier = 1 / (1 - 0.4);

    expect(result!.map(x => x.toFixed(2))).toEqual(
      [
        multiplier * (0.3 * 1 + 0.2 * 2),
        multiplier * (0.3 * 3 + 0.2 * 4),
        multiplier * (0.3 * 5 + 0.2 * 6),
      ].map(x => x.toFixed(2))
    );
  });

  test("it handles the case where there's only RoW", () => {
    const result = computeTransportEmissions(
      "0123",
      1000,
      { "0123": { RoW: [1, 0, 0] } },
      { Sweden: [1, 3, 5] },
      "Sweden"
    );

    expect(result).toEqual([1, 3, 5]);
  });
});
