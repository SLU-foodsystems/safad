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
  countriesWithEnvDataPerRpc: Record<string, Set<string>>
): RpcOriginWaste {
  return mapValues(originWasteFactors, (originWasteFactorsPerRpc, rpcCode) => {
    const countriesWithEnvData =
      countriesWithEnvDataPerRpc[rpcCode] || new Set<string>();

    const [rowOriginFactors, nonRoWOriginFactors] = partition(
      Object.entries(originWasteFactorsPerRpc),
      ([countryCode]) =>
        countryCode === "RoW" || !countriesWithEnvData.has(countryCode)
    );

    // The sum of the shares that are not RoW
    const nonRoWShare = sum(
      nonRoWOriginFactors.map(([_countryCode, [share]]) => share)
    );
    // In case we have RoW shares but the nonRoWShares add up to less than
    // 1, we adjust it here.
    const restOfWorldShare = Math.max(0, 1 - nonRoWShare);

    // When we do not have RoW shares from missing env data or explicit RoW
    // data, but we the shares add up to less than 1 (i.e. 1-rowshare > 0)
    // we need to normalize so that we end up with a total share of 1.
    if (rowOriginFactors.length === 0 && nonRoWShare > 0) {
      const normalized = nonRoWOriginFactors.map(
        ([countryCode, [share, waste]]) =>
          [countryCode, [share / nonRoWShare, waste]] as [
            string,
            [number, number],
          ]
      );
      const roundingResidual =
        1 - sum(normalized.map(([_countryCode, [share]]) => share));

      if (roundingResidual !== 0) {
        const largest = normalized.reduce((max, entry) =>
          entry[1][0] > max[1][0] ? entry : max
        );
        largest[1][0] += roundingResidual;
      }

      return Object.fromEntries(normalized);
    }

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
