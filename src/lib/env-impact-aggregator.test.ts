import { describe, test, expect } from "vitest";
import joinEnvImpactSheet from "./env-impact-aggregator";
import { N_ENV_FOOTPRINTS } from "./constants";

const constEnvFactors = (x: number) =>
  Array.from({ length: N_ENV_FOOTPRINTS }).map((_) => x);

describe("env-impacts.ts", () => {
  test("basic functionality", () => {
    const rpcFactors: RpcFactors = {
      a: {
        se: [0.2, 0.1, 0],
        es: [0.5, 0.15, 0],
        RoW: [0.3, 0.2, 0],
      },
      b: {
        en: [0.5, 0, 0],
        fr: [0.4, 0.15, 0],
        RoW: [0.1, 0.2, 0],
      },
    };

    const envImpactSheet = {
      a: {
        se: constEnvFactors(1) as EnvFactors,
        es: constEnvFactors(3) as EnvFactors,
        RoW: constEnvFactors(8) as EnvFactors,
      },
      b: {
        en: constEnvFactors(1) as EnvFactors,
        fr: constEnvFactors(4) as EnvFactors,
        RoW: constEnvFactors(10) as EnvFactors,
      },
    };

    const result = joinEnvImpactSheet(
      envImpactSheet,
      rpcFactors,
      "conventional"
    );
    expect(result).toHaveProperty("a");
    expect(result).toHaveProperty("b");

    expect(result.a).toHaveLength(N_ENV_FOOTPRINTS);
    expect(result.b).toHaveLength(N_ENV_FOOTPRINTS);

    const expectedAs = constEnvFactors(
      (0.2 * 1) / 0.9 + (0.5 * 3) / 0.85 + (0.3 * 8) / 0.8
    );

    const expectedBs = constEnvFactors(
      (0.5 * 1) / 1.0 + (0.4 * 4) / 0.85 + (0.1 * 10) / 0.8
    );

    expect(result.a).toEqual(expectedAs);
    expect(result.b).toEqual(expectedBs);
  });

  describe("organic and conventional split", () => {
    const rpcFactors = (shareOrganic: number): RpcFactors => ({
      a: {
        se: [0.2, 0.1, shareOrganic],
        es: [0.5, 0.15, shareOrganic],
        RoW: [0.3, 0.2, shareOrganic],
      },
    });

    const envImpactSheet = {
      a: {
        se: constEnvFactors(1) as EnvFactors,
        es: constEnvFactors(2) as EnvFactors,
        RoW: constEnvFactors(3) as EnvFactors,
      },
    };

    const getExpected = (ratio: number) =>
      constEnvFactors(
        (0.2 * 1 * ratio) / (1 - 0.1) +
          (0.5 * 2 * ratio) / (1 - 0.15) +
          (0.3 * 3 * ratio) / (1 - 0.2)
      );

    test("Pure conventional", () => {
      const result = joinEnvImpactSheet(
        envImpactSheet,
        rpcFactors(0),
        "conventional"
      );
      expect(result).toHaveProperty("a");

      const expectedAs = getExpected(1);
      result.a.forEach((x, i) => {
        expect(x, `Mismatch on factor of index ${i}`).toBeCloseTo(
          expectedAs[i]
        );
      });
    });

    test("Pure organic", () => {
      const result = joinEnvImpactSheet(
        envImpactSheet,
        rpcFactors(1),
        "organic"
      );
      expect(result).toHaveProperty("a");

      const expectedAs = getExpected(1);
      result.a.forEach((x, i) => {
        expect(x, `Mismatch on factor of index ${i}`).toBeCloseTo(
          expectedAs[i]
        );
      });
    });

    test("Even split", () => {
      const resultC = joinEnvImpactSheet(
        envImpactSheet,
        rpcFactors(0.5),
        "conventional"
      );
      const resultO = joinEnvImpactSheet(
        envImpactSheet,
        rpcFactors(0.5),
        "organic"
      );
      expect(resultC).toHaveProperty("a");
      expect(resultO).toHaveProperty("a");

      const expectedAs = getExpected(0.5);
      expectedAs.forEach((x, i) => {
        expect(resultC.a[i], `Mismatch on factor of index ${i}`).toBeCloseTo(x);
        expect(resultO.a[i], `Mismatch on factor of index ${i}`).toBeCloseTo(x);
      });
    });

    test("Uneven split", () => {
      const _rpcFactors = rpcFactors(0.3);
      const resultC = joinEnvImpactSheet(
        envImpactSheet,
        _rpcFactors,
        "conventional"
      );
      const resultO = joinEnvImpactSheet(
        envImpactSheet,
        _rpcFactors,
        "organic"
      );
      expect(resultC).toHaveProperty("a");
      expect(resultO).toHaveProperty("a");

      const expectedConvAs = getExpected(0.7);
      const expectedOrgAs = getExpected(0.3);
      resultC.a.forEach((x, i) => {
        expect(x, `Mismatch on conv. factor of index ${i}`).toBeCloseTo(
          expectedConvAs[i]
        );
      });
      resultO.a.forEach((x, i) => {
        expect(x, `Mismatch on org. factor of index ${i}`).toBeCloseTo(
          expectedOrgAs[i]
        );
      });
    });
  });
});
