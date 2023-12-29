import { mapValues, partition, sum, weightedArithmeticMean } from "./utils";

function computeRestOfWorldWaste(
  nonRoWOriginFactors: [string, [number, number]][],
  rowOriginFactors: [string, [number, number]][]
): number {
  // Helper function
  const getShareAndWaste = (
    originFactorsEntry: [string, [number, number]]
  ): [number, number] => originFactorsEntry[1];

  // Case 1: No RoW or factors that fall below the threshold: use a weigthed
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

/**
 * Compute the grouping of origins (country data) into RoW depending on a
 * threshold (decimal, 0-1).
 */
export default function originWasteFactorsRestOfWorldAggregator(
  originWasteFactors: RpcOriginWaste,
  countriesWithEnvDataPerRpc: Record<string, Set<string>>,
  rowThreshold: number
): RpcOriginWaste {
  if (rowThreshold < 0 || rowThreshold > 1) {
    throw new Error(
      "Unexpected RoW-threshold provided. Should be between 0-1, was " +
        rowThreshold
    );
  }

  return mapValues(originWasteFactors, (originWasteFactorsPerRpc, rpcCode) => {
    const countriesWithEnvData =
      countriesWithEnvDataPerRpc[rpcCode] || new Set<string>();

    const [rowOriginFactors, nonRoWOriginFactors] = partition(
      Object.entries(originWasteFactorsPerRpc),
      ([countryCode, [share]]) =>
        countryCode === "RoW" ||
        (!countriesWithEnvData.has(countryCode) && share < rowThreshold)
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

    return Object.fromEntries([
      ...nonRoWOriginFactors,
      ["RoW", [restOfWorldShare, restOfWorldWaste]],
    ]);
  });
}
