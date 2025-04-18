import { describe, test, expect } from "vitest";
import {
  aggregateRpcCategories,
  getRpcCodeSubset,
  nthIndexOf,
  filterObject,
  parseCsvFile,
  averages,
} from "./utils";

describe("utils.ts", () => {
  describe("averages", () => {
    test("empty input", () => {
      expect(averages([])).toEqual([]);
    });

    test("single row", () => {
      expect(averages([[1, 2, 3]])).toEqual([1, 2, 3]);
    });

    test("handles when all rows have the same length", () => {
      expect(
        averages([
          [10, 20, 3],
          [1, 15, -3],
          [20, 12, 13],
          [5, 0, 23],
        ])
      ).toEqual([(10 + 1 + 20 + 5) / 4, (20 + 15 + 12 + 0) / 4, (13 + 23) / 4]);
    });

    test("handles when rows have differing lengths", () => {
      expect(
        averages([
          [10, 3],
          [1, 15, -3],
          [20, 12, 13, 5],
          [5, 0, 23],
        ])
      ).toEqual([
        (10 + 1 + 20 + 5) / 4,
        (3 + 15 + 12 + 0) / 4,
        (-3 + 13 + 23) / 3,
        5,
      ]);
    });
  });
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
    expect(nthIndexOf(str, ".", 0)).toEqual(1);
    expect(nthIndexOf(str, ".", 1)).toEqual(4);
    expect(nthIndexOf(str, ".", 2)).toEqual(8);
    expect(nthIndexOf(str, ".", 3)).toEqual(12);
    expect(nthIndexOf(str, ".", 4)).toEqual(16);
    expect(nthIndexOf(str, ".", 5)).toEqual(20);
    expect(nthIndexOf(str, ".", 6)).toEqual(-1);
  });

  test("getRpcCodeSubset", () => {
    const str = "A.03.001.002.123";

    expect(getRpcCodeSubset(str, 1)).toEqual("A.03");
    expect(getRpcCodeSubset(str, 2)).toEqual("A.03.001");
    expect(getRpcCodeSubset(str, 3)).toEqual("A.03.001.002");
    expect(getRpcCodeSubset(str, 4)).toEqual("A.03.001.002.123");
    expect(getRpcCodeSubset(str, 5)).toEqual("A.03.001.002.123");
  });

  test("filterObject", () => {
    const obj = {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
      e: 5,
    };

    expect(filterObject(obj, (_k, v) => v % 2 === 0)).toEqual({
      b: 2,
      d: 4,
    });
  });

  describe("parseCsvFile", () => {
    test("sanity check", () => {
      expect(parseCsvFile("a,b,c\n1,2,3\nfoo bar,,")).toEqual([
        ["a", "b", "c"],
        ["1", "2", "3"],
        ["foo bar", "", ""],
      ]);
    });

    test("it handles uneven lengths", () => {
      expect(parseCsvFile("a,b,c,d,e,f\n1,2,3")).toEqual([
        ["a", "b", "c", "d", "e", "f"],
        ["1", "2", "3"],
      ]);
    });

    test("it handles quoted values with nested delimiters", () => {
      expect(parseCsvFile('a,"hello, world",c')).toEqual([
        ["a", "hello, world", "c"],
      ]);
    });

    test("it trims values", () => {
      expect(parseCsvFile("\t\ta, b,c \n1, 22  ,3 ")).toEqual([
        ["a", "b", "c"],
        ["1", "22", "3"],
      ]);
    });

    test("it can avoid trimming values", () => {
      expect(parseCsvFile("\t\ta, b,c \n1, 22  ,3 ", { trim: false })).toEqual([
        ["\t\ta", " b", "c "],
        ["1", " 22  ", "3 "],
      ]);
    });

    test("it handles other delimiters", () => {
      expect(
        parseCsvFile("a;b;c\n1;2;3\nfoo bar;;", {
          delimiter: ";",
        })
      ).toEqual([
        ["a", "b", "c"],
        ["1", "2", "3"],
        ["foo bar", "", ""],
      ]);
    });

    test("it handles multi-line values", () => {
      expect(parseCsvFile('Hello,World,"Good\nBye"\n1,2,3')).toEqual([
        ["Hello", "World", "Good\nBye"],
        ["1", "2", "3"],
      ]);
    });

    test("drops trailing lines iff option is set", () => {
      const input1 = "a,b,c\n1,2,3\nfoo bar,,\n";
      const input2 = "a,b,c\n1,2,3\nfoo bar,,\n ";
      const input3 = "a,b,c\n1,2,3\nfoo bar,,\n,,,";

      const withRemove = { removeTrailingRows: true };
      expect(parseCsvFile(input1, withRemove)).toHaveLength(3);
      expect(parseCsvFile(input2, withRemove)).toHaveLength(3);
      expect(parseCsvFile(input3, withRemove)).toHaveLength(3);

      const noRemove = { removeTrailingRows: false };
      expect(parseCsvFile(input1, noRemove)).toHaveLength(4);
      expect(parseCsvFile(input2, noRemove)).toHaveLength(4);
      expect(parseCsvFile(input3, noRemove)).toHaveLength(4);
    });
  });
});
