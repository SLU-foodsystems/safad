import { TRANSPORT_EMISSIONS_ZERO } from "./constants";
import { vectorsSum } from "./utils";

// Exclude transport emissions from some products all-together, e.g. tap water.
const EXCLUDED_PRODUCTS = ["A.15.01"];

/**
 * Compute the transport emissions of a rpc-level item and its amount.
 */
export default function computeTransportEmissions(
  rpcCode: string,
  amount: number, // in grams
  rpcOriginWaste: RpcOriginWaste,
  transportEmissionsFactors: Record<string, number[]> // per kg
): number[] | null {
  if (!rpcCode || rpcCode === "0") {
    return null;
  }

  if (EXCLUDED_PRODUCTS.includes(rpcCode)) {
    return TRANSPORT_EMISSIONS_ZERO;
  }

  // Get the RPC Origin Waste data - we want the "share" specifically
  const factorsPerOrigin = rpcOriginWaste[rpcCode];
  if (!factorsPerOrigin) {
    // console.error(`No origin found for rpc ${rpcCode}.`);
    return null;
  }

  // Amounts are in grams, but impact-factors per kg - adjust for this.
  const amountKg = amount / 1000;

  // Handle the case where there's only data for RoW, which there will be e.g.
  // when we don't have any import data at all.
  if (Object.keys(factorsPerOrigin).length === 1 && factorsPerOrigin.RoW) {
    return transportEmissionsFactors.RoW!.map((x) => x * amountKg);
  }

  // Finally, sum all of the emissions for each origin, adjusted by share.
  return vectorsSum(
    Object.entries(factorsPerOrigin)
      .map(([originCode, [share]]) => {
        const emissionsFactors =
          originCode in transportEmissionsFactors
            ? transportEmissionsFactors[originCode]
            : transportEmissionsFactors.RoW;

        if (!emissionsFactors) {
          console.error(
            `Transport Emissions Factors: RoW missing for origin ${originCode}. RPC code is ${rpcCode}.`
          );
          return null;
        }

        return emissionsFactors.map(
          (emissionsFactor) => amountKg * share * emissionsFactor
        );
      })
      .filter((emissions): emissions is number[] => emissions !== null)
  );
}
