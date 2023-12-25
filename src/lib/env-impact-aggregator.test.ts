import { describe, test, expect } from "vitest";
import flattenEnvFactorsSheet from "./env-impact-aggregator";
import { N_ENV_IMPACTS } from "./constants";

const constEnvFactors = (x: number) =>
  Array.from({ length: N_ENV_IMPACTS }).map((_) => x);

describe("env-impacts.ts", () => {
  test("basic functionality, no RoW threshold", () => {
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

    const result = flattenEnvFactorsSheet(envImpactSheet, rpcFactors, 0);
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

    // Compute the weighted mean wastes
    const rowWasteA = (0.2 * 0.1 + 0.5 * 0.15) / (0.2 + 0.5);
    const rowWasteB = (0.4 * 0.15) / 0.9;

    // Compute the expected env footprints for A and B
    const expectedAs = constEnvFactors(
      (0.2 * 1) / 0.9 + (0.5 * 3) / 0.85 + (0.3 * 8) / (1 - rowWasteA)
    );
    const expectedBs = constEnvFactors(
      (0.5 * 1) / 1.0 + (0.4 * 4) / 0.85 + (0.1 * 10) / (1 - rowWasteB)
    );

    expect(result.a).toEqual(expectedAs);
    expect(result.b).toEqual(expectedBs);
  });

  test("merges into RoW based on threshold and env factors", () => {
    const rpcFactors: RpcOriginWaste = {
      a: {
        se: [0.2, 0.1],
        fr: [0.05, 0.1], // Should not be Row, as we have env data
        es: [0.5, 0.15],
        de: [0.08, 0.1], // Should be gruped to RoW
        RoW: [0.17, 0.15],
      },
    };

    const envImpactSheet = {
      a: {
        se: constEnvFactors(1) as number[],
        fr: constEnvFactors(2) as number[],
        es: constEnvFactors(3) as number[],
        RoW: constEnvFactors(8) as number[],
      },
    };

    const result = flattenEnvFactorsSheet(envImpactSheet, rpcFactors, 0.1);
    expect(result).toHaveProperty("a");
    expect(result.a).toHaveLength(N_ENV_IMPACTS);

    const expectedRoWShare = rpcFactors.a.de[0] + rpcFactors.a.RoW[0];
    const expectedRoWWaste = (0.08 * 0.1 + 0.17 * 0.15) / 0.25;

    // Compute the expected env footprints for A and B
    const expectedAs = constEnvFactors(
      (0.2 * 1) / 0.9 +
        (0.05 * 2) / 0.9 +
        (0.5 * 3) / 0.85 +
        (expectedRoWShare * 8) / (1 - expectedRoWWaste)
    );

    expect(result.a).toEqual(expectedAs);
  });

  test("merges into RoW based on threshold and env factors, when RoW missing", () => {
    const rpcFactors: RpcOriginWaste = {
      a: {
        se: [0.2, 0.1],
        fr: [0.05, 0.1], // Should not be RoW, as we have env data
        es: [0.5, 0.15],
        de: [0.08, 0.2], // Should be grouped to RoW
      },
    };

    const envImpactSheet = {
      a: {
        se: constEnvFactors(1) as number[],
        fr: constEnvFactors(2) as number[],
        es: constEnvFactors(3) as number[],
        RoW: constEnvFactors(8) as number[],
      },
    };

    const result = flattenEnvFactorsSheet(envImpactSheet, rpcFactors, 0.1);
    expect(result).toHaveProperty("a");
    expect(result.a).toHaveLength(N_ENV_IMPACTS);

    const expectedRoWShare = 1 - (0.2 + 0.05 + 0.5);
    // Should be (weighted) average of all wastes
    const expectedRoWWaste =
      (0.2 * 0.1 + 0.05 * 0.1 + 0.5 * 0.15 + 0.08 * 0.2) /
      (0.2 + 0.05 + 0.5 + 0.08);

    // Compute the expected env footprints for A and B
    const expectedAs = constEnvFactors(
      (0.2 * 1) / 0.9 +
        (0.05 * 2) / 0.9 +
        (0.5 * 3) / 0.85 +
        (expectedRoWShare * 8) / (1 - expectedRoWWaste)
    );

    expect(result.a).toEqual(expectedAs);
  });
});
