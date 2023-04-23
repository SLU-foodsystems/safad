// Import processes to energy map here.
import _processEnergyMap from "../data/processes-energy-consumption.json";

const processEnergyMap = _processEnergyMap as Record<string, number>;

export default function compute(
  processAmountMap: Record<string, number>,
  energyFootprints: number[]
) {
  return Object.fromEntries(
    Object.entries(processAmountMap).map(([processId, amount]) => {
      // TODO: maybe add a check if the process does not exist?
      // TODO: Ensure the units are right here.
      // - is the amount in kg or g?
      // - energy in MJ or kWh, and conversion expects what?
      const energy = amount * processEnergyMap[processId];
      const envImpacts = energyFootprints.map((factor) => factor * energy);
      return [processId, envImpacts];
    })
  );
}
