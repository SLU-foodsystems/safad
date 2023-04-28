// Import processes to energy map here.
import _processEnergyMap from "../data/processes-energy-consumption.json";

const processEnergyMap = _processEnergyMap as Record<string, number[]>;

/**
 * Compute the environmental footprints for each process.
 *
 * Input:
 * - Amount (kg) of each process
 * - Energies Footprints Factors: Contribution of energy type to each GHG.
 * - (static) Process Energy Factors: Contribution of each process to each
 *   energy type.
 *
 * Output: { [process]: [CO2, N2O, CH4, ...] }
 */
export default function computeProcessFootprints(
  processAmountMap: Record<string, number>,
  energiesFootprints: number[][]
) {
  return Object.fromEntries(
    Object.entries(processAmountMap).map(([processId, amount]) => {
      // TODO: maybe add a check if the process does not exist?
      // TODO: Ensure the units are right here.
      // - is the amount in kg or g?
      // - energy in MJ or kWh, and conversion expects what?

      // First, we get the amount of energy for each energy type (in MJ)
      // number[] ([coal, oil, electricity, ...]
      const energyAmounts = processEnergyMap[processId].map((x) => x * amount);

      // Now, we create a 2d array mapping the environmental impacts for each
      // energy type given the amounts above
      const envImpactsPerEnergyType = energyAmounts.map(
        (energyTypeMJ, energyTypeIdx) =>
          energiesFootprints[energyTypeIdx].map(
            (ghgFactor) => ghgFactor * energyTypeMJ
          )
      );

      // And finally, we sum them together across the differeent energy types,
      // ending up with a simple array of environmental footprints
      const envImpacts = envImpactsPerEnergyType
        .slice(1)
        .reduce(
          (acc, footprints) =>
            acc.map((currentValue, i) => currentValue + footprints[i]),
          envImpactsPerEnergyType[0]
        );

      return [processId, envImpacts];
    })
  );
}
