import { vectorsSum } from "./utils";

export function computeTransportEmissions(
  amountsPerOrigin: Record<string, number>,
  transportEmissionsFactors: Record<string, number[]>
): number[] {
  return vectorsSum(
    Object.entries(amountsPerOrigin)
      .map(([originCode, amount]) => {
        const emissionsFactors = transportEmissionsFactors[originCode];
        if (!emissionsFactors) {
          console.error(`Emissions factors missing for origin ${originCode}`);
          return null;
        }

        return emissionsFactors.map((factor) => factor * amount);
      })
      .filter((x): x is number[] => x !== null)
  );
}

/**
 * Compute the total amount (weight) of rpcs from each country,
 * given a list of RPCs and their factors (i.e. the import share)
 * Returns an object with countries as keys (incl. Domestic)
 */
export function aggregateAmountsPerOrigin(
  rpcAmounts: [string, number][],
  rpcParameters: RpcFactors,
  defaultCountry: string
) {
  // You can do a really fancy flatMap+reduce here, but it wouldn't be very readable.

  // Each country with the amount (in grams??)
  const results: Record<string, number> = {};

  rpcAmounts.forEach(([rpcCode, rpcAmount]) => {
    const factorsPerOrigin = rpcParameters[rpcCode];
    if (!factorsPerOrigin) {
      console.error(`No origin found for rpc-code ${rpcCode}.`);
      return;
    }

    // Handle the edge-case where there's only data for RoW
    if (Object.keys(factorsPerOrigin).length === 1 && factorsPerOrigin.RoW) {
      results[defaultCountry] = (results[defaultCountry] || 0) + rpcAmount;
      return;
    }

    // We distribute the RoW import across the other countries
    let rowMultiplier = 1;
    if ("RoW" in factorsPerOrigin) {
      rowMultiplier = 1 / (1 - factorsPerOrigin.RoW[0]);
    }

    Object.entries(factorsPerOrigin).map(([originName, factors]) => {
      if (originName === "RoW") return; // skip, as it's handled above
      const originAmount = factors[0] * rpcAmount * rowMultiplier;
      results[originName] = (results[originName] || 0) + originAmount;
    });
  });

  return results;
}
