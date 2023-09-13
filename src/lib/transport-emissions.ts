import { vectorsSum } from "./utils";

/**
 * Compute the transport emissions of a rpc-level item and its amount.
 */
export default function computeTransportEmissions(
  suaCode: string | undefined,
  amount: number,
  suaParameters: RpcFactors,
  transportEmissionsFactors: Record<string, number[]>,
  defaultCountry: string
): number[] | null {
  if (!suaCode || suaCode === "0") {
    return null;
  }

  const factorsPerOrigin = suaParameters[suaCode];
  if (!factorsPerOrigin) {
    console.error(`No origin found for sua-code ${suaCode}.`);
    return null;
  }

  // Handle the case where there's only data for RoW, which there will be e.g.
  // when we don't have any import data at all.
  if (Object.keys(factorsPerOrigin).length === 1 && factorsPerOrigin.RoW) {
    return transportEmissionsFactors[defaultCountry].map((x) => x * amount);
  }

  // In case there's some import from RoW, we distribute it across the other
  // origins via a multiplier
  let rowMultiplier = 1;
  if ("RoW" in factorsPerOrigin) {
    rowMultiplier = 1 / (1 - factorsPerOrigin.RoW[0]);
  }

  // Finally, sum all of the emissions for each origin, adjusted by share.
  return vectorsSum(
    Object.entries(factorsPerOrigin)
      .map(([originCode, [share]]) => {
        if (originCode === "RoW") return null;

        const emissionsFactors = transportEmissionsFactors[originCode];
        if (!emissionsFactors) {
          console.error(`Emissions factors missing for origin ${originCode}`);
          return null;
        }

        return emissionsFactors.map(
          (emissionsFactor) => amount * share * emissionsFactor * rowMultiplier
        );
      })
      .filter((emissions): emissions is number[] => emissions !== null)
  );
}