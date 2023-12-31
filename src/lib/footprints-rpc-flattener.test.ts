import { describe, test, expect } from "vitest";
import flattenEnvFactorsSheet from "./footprints-rpc-flattener";
import { N_ENV_IMPACTS } from "./constants";

const constEnvFactors = (x: number) =>
  Array.from({ length: N_ENV_IMPACTS }).map((_) => x);

describe("footprints-rpc-flattener.ts", () => {
  test("basic functionality", () => {
    const rpcFactors: RpcOriginWaste = {
      a: {
        se: [0.2, 0.1],
        es: [0.5, 0.15],
        RoW: [0.3, 0.2],
      },
      b: {
        en: [0.5, 0],
        fr: [0.4, 0.15],
        RoW: [0.1, 0.2],
      },
    };

    const envImpactSheet = {
      a: {
        se: constEnvFactors(1) as number[],
        es: constEnvFactors(3) as number[],
        RoW: constEnvFactors(8) as number[],
      },
      b: {
        en: constEnvFactors(1) as number[],
        fr: constEnvFactors(4) as number[],
        RoW: constEnvFactors(10) as number[],
      },
    };

    const result = flattenEnvFactorsSheet(envImpactSheet, rpcFactors);
    expect(result).toHaveProperty("a");
    expect(result).toHaveProperty("b");

    expect(result.a).toHaveLength(N_ENV_IMPACTS);
    expect(result.b).toHaveLength(N_ENV_IMPACTS);

    const expectedAs = constEnvFactors(
      (0.2 * 1) / 0.9 + (0.5 * 3) / 0.85 + (0.3 * 8) / 0.8
    );

    const expectedBs = constEnvFactors(
      (0.5 * 1) / 1.0 + (0.4 * 4) / 0.85 + (0.1 * 10) / 0.8
    );

    expect(result.a).toEqual(expectedAs);
    expect(result.b).toEqual(expectedBs);
  });
});
