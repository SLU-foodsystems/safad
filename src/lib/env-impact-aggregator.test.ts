import { describe, test, expect } from "vitest";
import joinEnvImpactSheet from "./env-impact-aggregator";

describe("env-impacts.ts", () => {
  test("basic functionality", () => {
    const rpcFactors: {
      [rpc: string]: { [country: string]: [number, number] };
    } = {
      a: {
        se: [20, 10],
        es: [50, 15],
        RoW: [30, 20],
      },
      b: {
        en: [50, 0],
        fr: [40, 15],
        RoW: [10, 20],
      },
    };

    const envImpactSheet = {
      a: {
        se: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] as EnvFactors,
        es: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3] as EnvFactors,
        RoW: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8] as EnvFactors,
      },
      b: {
        en: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] as EnvFactors,
        fr: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4] as EnvFactors,
        RoW: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10] as EnvFactors,
      },
    };

    const result = joinEnvImpactSheet(envImpactSheet, rpcFactors);
    expect(result).toHaveProperty('a');
    expect(result).toHaveProperty('b');

    expect(result.a).toHaveLength(10);
    expect(result.b).toHaveLength(10);

    const expectedAs = Array.from({ length: 10 }).map(_ =>
      (0.2 * 1 / (0.9)) +
      (0.5 * 3 / (0.85)) +
      (0.3 * 8 / (0.8))
    );

    const expectedBs = Array.from({ length: 10 }).map(_ =>
      (0.5 * 1 / (1.00)) +
      (0.4 * 4 / (0.85)) +
      (0.1 * 10 / (0.8))
    );

    expect(result.a).toEqual(expectedAs);
    expect(result.b).toEqual(expectedBs);
  });
});
