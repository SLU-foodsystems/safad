import { describe, test, expect } from "vitest";
import aggregateAmountsPerOrigin from "./rpcs-per-origin-aggregator";

describe("aggregateAmountsPerOrigin", () => {
  test("it handles a single product and single country", () => {
    const result = aggregateAmountsPerOrigin(
      [["0111", 1000]],
      {
        "0111": {
          "Sweden": [1, 0.5, 0.3],
        },
      },
      "Sweden"
    );

    expect(Object.keys(result)).toHaveLength(1);
    expect(result).toHaveProperty("Sweden");
    expect(result.Sweden).toEqual(1000);
  });

  test("it handles a single product with multiple countries", () => {
    const result = aggregateAmountsPerOrigin(
      [["0111", 1000]],
      {
        "0111": {
          "Sweden": [0.3, 0, 0],
          "France": [0.7, 0, 0],
        },
      },
      "Sweden"
    );

    expect(Object.keys(result)).toHaveLength(2);
    expect(result).toHaveProperty("France");
    expect(result).toHaveProperty("Sweden");
    expect(result.France).toEqual(700);
    expect(result.Sweden).toEqual(300);
  });

  test("it handles a multiple products with multiple countries", () => {
    const result = aggregateAmountsPerOrigin(
      [["0111", 1000], ["0112", 500]],
      {
        "0111": {
          "Sweden": [0.3, 0, 0],
          "France": [0.7, 0, 0],
        },
        "0112": {
          "Germany": [0.7, 0, 0],
          "Sweden": [0.5, 0, 0],
        },
      },
      "Sweden"
    );

    expect(Object.keys(result)).toHaveLength(3);
    expect(result).toHaveProperty("France");
    expect(result).toHaveProperty("Germany");
    expect(result).toHaveProperty("Sweden");
    expect(result.France).toEqual(700);
    expect(result.Germany).toEqual(350);
    expect(result.Sweden).toEqual(550);
  });

  test("it distributes RoW across countries", () => {
    const result = aggregateAmountsPerOrigin(
      [["0111", 1000], ["0112", 1000]],
      {
        "0111": {
          "Sweden": [0.3, 0, 0],
          "France": [0.2, 0, 0],
          "RoW": [0.5, 0, 0],
        },
        "0112": {
          "Germany": [0.3, 0, 0],
          "Sweden": [0.5, 0, 0],
          "RoW": [0.2, 0, 0],
        },
      },
      "Sweden"
    );

    expect(Object.keys(result)).toHaveLength(3);
    expect(result).toHaveProperty("France");
    expect(result).toHaveProperty("Germany");
    expect(result).toHaveProperty("Sweden");
    expect(result.France).toEqual(400);
    expect(result.Germany).toEqual(300 / 0.8);
    expect(result.Sweden).toEqual(300 / 0.5 + 500 / 0.8);
  });

  test("it handles the case where there's only RoW", () => {
    const result = aggregateAmountsPerOrigin(
      [["0111", 1000]],
      { "0111": { "RoW": [1, 0, 0] } },
      "Sweden"
    );

    expect(Object.keys(result)).toHaveLength(1);
    expect(result).toHaveProperty("Sweden");
    expect(result.Sweden).toEqual(1000);
  });
});
