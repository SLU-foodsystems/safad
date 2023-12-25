/**
 * This file serves to aggregate environmental impacts across origins
 * to a single set of env impacts for each RPC.
 * In other words, it bundles the different origins based on their
 * share of the diet, as well as the assumed waste, to a single
 * list of factors.
 */

import { ROW_THRESHOLD } from "./constants";
import { partition, sum, vectorsSum, weightedArithmeticMean } from "./utils";

function computeRestOfWorldWaste(
  nonRoWOriginFactors: [string, [number, number]][],
  rowOriginFactors: [string, [number, number]][]
): number {
  // Helper function
  const getShareAndWaste = (
    originFactorsEntry: [string, [number, number]]
  ): [number, number] => originFactorsEntry[1];

  // Case 1: No RoW or factors that fall below the threshold: use us a weigthed
  // mean of the other wastes
  if (rowOriginFactors.length === 0) {
    return weightedArithmeticMean(nonRoWOriginFactors.map(getShareAndWaste));
  }

  // Case 2: There are origins that count as RoW due to their thresholds, but no
  // actual RoW. Compute weighted mean over all origins
  if (rowOriginFactors.every(([countryCode]) => countryCode !== "RoW")) {
    return weightedArithmeticMean(
      [...rowOriginFactors, ...nonRoWOriginFactors].map(getShareAndWaste)
    );
  }

  // Case 3: There's a given RoW waste, and at least one other origin that
  // should be treated as RoW. Compute weighted mean over RoW + other RoW-like.
  return weightedArithmeticMean(rowOriginFactors.map(getShareAndWaste));
}

function normalizeOriginFactorsForRoW(
  originFactors: Record<string, [number, number]>,
  envImpactCountries: Set<string>,
  rowThreshold: number
): [string, [number, number]][] {
  const [rowOriginFactors, nonRoWOriginFactors] = partition(
    Object.entries(originFactors),
    ([countryCode, [share]]) =>
      countryCode === "RoW" ||
      (!envImpactCountries.has(countryCode) && share < rowThreshold)
  );

  // The sum of the shares that are not RoW
  const nonRoWShare = sum(
    nonRoWOriginFactors.map(([_countryCode, [share]]) => share)
  );
  const restOfWorldShare = Math.max(0, 1 - nonRoWShare);

  const restOfWorldWaste = computeRestOfWorldWaste(
    nonRoWOriginFactors,
    rowOriginFactors
  );

  return [
    ...nonRoWOriginFactors,
    ["RoW", [restOfWorldShare, restOfWorldWaste]],
  ];
}

// TODO: This function could also take a diet and compute the env impact
// directly, i.e. only computing the factors for the RPCs that are actually
// included in the diet, rather than for all of them. This would be more
// efficient, but I doubt this is the bottleneck. We can see later.
//
// Input:
//  - env impact sheet ((rpc, country) -> impacts)
//  - country distribution: ((rpc, country) -> (ratio, waste))
//
// Output:
//  - (rpc -> env)
export default function flattenEnvironmentalFactors(
  envImpactSheet: RpcFootprintsByOrigin,
  rpcOriginWaste: RpcOriginWaste,
  rowThreshold = ROW_THRESHOLD
): RpcFootprints {
  const rpcCodes = Object.keys(envImpactSheet);

  const entries = rpcCodes
    .map((rpcCode) => {
      const envImpacts = envImpactSheet[rpcCode];
      const originFactors = rpcOriginWaste[rpcCode];

      if (!originFactors) {
        console.warn(`No origin factors found for rpc ${rpcCode}`);
        return null;
      }

      const envImpactCountries = new Set(Object.keys(envImpacts));
      const normalizedOriginFactors = normalizeOriginFactorsForRoW(
        originFactors,
        envImpactCountries,
        rowThreshold
      );

      const joinedEnvFactors = vectorsSum(
        normalizedOriginFactors.map(([origin, [shareRatio, waste]]) => {
          const wasteChangeFactor = 1 / (1 - waste);

          const ratio = shareRatio * wasteChangeFactor;
          // If envImpacts are missing for this origin, fall back to RoW
          if (!envImpacts[origin]) {
            origin = "RoW";
          }

          if (origin === "RoW" && !envImpacts[origin]) {
            console.error("RoW missing for rpc " + rpcCode);
          }
          return envImpacts[origin].map((x) => ratio * x);
        })
      );

      return [rpcCode, joinedEnvFactors];
    })
    .filter((x): x is [string, number[]] => x !== null);

  return Object.fromEntries(entries);
}
