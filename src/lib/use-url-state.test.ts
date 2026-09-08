import { describe, test, expect } from "vitest";
import { parseUrlState, serializeUrlState } from "./use-url-state";

describe("use-url-state.ts", () => {
  describe("parseUrlState", () => {
    test("parses both params", () => {
      expect(parseUrlState("#country=PL&foods=A.1,B.2")).toEqual({
        country: "PL",
        foods: ["A.1", "B.2"],
      });
    });

    test("parses country alone", () => {
      expect(parseUrlState("#country=SE")).toEqual({ country: "SE" });
    });

    test("parses foods alone", () => {
      expect(parseUrlState("#foods=A.1,B.2")).toEqual({ foods: ["A.1", "B.2"] });
    });

    test("empty string yields no state", () => {
      expect(parseUrlState("")).toEqual({});
    });

    test("bare hash yields no state", () => {
      expect(parseUrlState("#")).toEqual({});
    });

    test("handles hash with or without leading #", () => {
      expect(parseUrlState("#country=SE")).toEqual(parseUrlState("country=SE"));
    });

    test("drops an unknown country code", () => {
      expect(parseUrlState("#country=XX")).toEqual({});
    });

    test("uppercases a lowercase country code", () => {
      expect(parseUrlState("#country=se")).toEqual({ country: "SE" });
    });

    test("strips whitespace and empty entries from foods", () => {
      expect(parseUrlState("#foods= A.1 ,,B.2,")).toEqual({
        foods: ["A.1", "B.2"],
      });
    });

    test("dedupes foods", () => {
      expect(parseUrlState("#foods=A.1,A.1,B.2")).toEqual({
        foods: ["A.1", "B.2"],
      });
    });

    test("truncates foods beyond the max", () => {
      const foods = Array.from({ length: 20 }, (_, i) => `F.${i}`);
      const result = parseUrlState(`#foods=${foods.join(",")}`);
      expect(result.foods).toHaveLength(12);
      expect(result.foods).toEqual(foods.slice(0, 12));
    });

    test("ignores unrelated params", () => {
      expect(parseUrlState("#country=SE&other=1")).toEqual({ country: "SE" });
    });
  });

  describe("serializeUrlState", () => {
    test("keeps commas literal, not percent-encoded", () => {
      const hash = serializeUrlState({ country: "SE", foods: ["A.1", "B.2"] });
      expect(hash).toBe("country=SE&foods=A.1,B.2");
    });

    test("handles an empty foods list", () => {
      const hash = serializeUrlState({ country: "SE", foods: [] });
      expect(hash).toBe("country=SE&foods=");
    });

    test("round-trips through parseUrlState", () => {
      const state = { country: "PL", foods: ["A.1", "B.2", "C.3"] };
      expect(parseUrlState(serializeUrlState(state))).toEqual(state);
    });
  });
});
