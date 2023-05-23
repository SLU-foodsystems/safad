// Import processes to energy map here.
import processEnergyDemandsJson from "@/data/processes-energy-demands.json";
import carrierEnergyDemandsJson from "@/data/carrier-footprints.json";

const processEnergyDemands = processEnergyDemandsJson as Record<
  string,
  number[]
>;

const carrierEnergyDemands = carrierEnergyDemandsJson as Record<
  string,
  number[] | Record<string, number[]>
>;

const CARRIER_ORDER = [
  "Electricity",
  "Heating oil",
  "Natural gas",
  "Other fossil energy sources",
  "Bark and chips",
  "Pellets and briquettes",
  "Other renewable energy sources",
  "Diesel fuel",
  "District heating",
];

export function getProcessFootprintsSheet(
  country: string
): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  Object.entries(processEnergyDemands).forEach(
    ([processCode, demandPerCarrier]) => {
      const footprints = [0, 0, 0]; // TODO: This hard-codes us to three footprints
      demandPerCarrier.forEach((mjPerKg, carrierIdx) => {
        // Exit early if it's not using this energyType
        if (mjPerKg === 0) return;

        const carrier = CARRIER_ORDER[carrierIdx];
        let impacts;
        if (carrier === "Electricity") {
          impacts = (carrierEnergyDemands[carrier] as Record<string, number[]>)[
            country
          ];
        } else {
          impacts = carrierEnergyDemands[carrier] as number[];
        }

        impacts.forEach((factor, i) => {
          footprints[i] += factor * mjPerKg;
        });
      });

      result[processCode] = footprints;
    }
  );

  return result;
}
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
  processAmountGramsMap: Record<string, number>,
  country: string
): Record<string, number[]> {
  const footprints = getProcessFootprintsSheet(country);
  return Object.fromEntries(
    Object.entries(processAmountGramsMap).map(([processId, amountMj]) => [
      processId,
      footprints[processId].map((x) => x * amountMj),
    ])
  );
}
