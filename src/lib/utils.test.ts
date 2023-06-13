import { describe, test, expect } from "vitest";
import { aggregateRpcCategories, nthIndexOf } from "./utils";

describe("utils.ts", () => {
  test("groupRpcCategories", () => {
    const diet = {
      "A.01.001.001": [1, 2, 1],
      "A.01.001.002": [2, 3, 4],
      "A.01.01": [2, 3, 4],
      "A.03": [1, 1, 1],
      "A.03.foo": [1, 1, 0],
      "A.03.bar": [1, 1, 1],
      "A.03.bar.bar.baz.A02.003": [1, 1, 1],
    };

    const result = aggregateRpcCategories(diet, 1);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result).toHaveProperty("A.01");
    expect(result).toHaveProperty("A.03");

    expect(result["A.01"]).toEqual([1 + 2 + 2, 2 + 3 + 3, 1 + 4 + 4]);
    expect(result["A.03"]).toEqual([4, 4, 3]);
  });

  test("nthIndexOf", () => {
    const str = "A.03.bar.bar.baz.A02.003";
    expect(nthIndexOf(str, ".", 0)).toEqual(1)
    expect(nthIndexOf(str, ".", 1)).toEqual(4)
    expect(nthIndexOf(str, ".", 2)).toEqual(8)
    expect(nthIndexOf(str, ".", 3)).toEqual(12)
    expect(nthIndexOf(str, ".", 4)).toEqual(16)
    expect(nthIndexOf(str, ".", 5)).toEqual(20)
    expect(nthIndexOf(str, ".", 6)).toEqual(-1)
  })
});
