import { mapValues } from "./utils";

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

        if (!impacts) {
          throw new Error(
            `Could not find process carrier impacts for (carrier, country) = (${carrier}, ${country}).`
          );
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
export const computeProcessFootprints = (
  processAmountsMap: Record<string, Record<string, number>>,
  processFootprints: Record<string, number[]>
): Record<string, { [k: string]: number[] }> =>
  mapValues(processAmountsMap, (processAmounts) =>
    Object.fromEntries(
      Object.entries(processAmounts).map(([processId, amountGram]) => [
        processId,
        (!processFootprints[processId] &&
          console.log(processId, processFootprints)) ||
          processFootprints[processId].map((x) => (x * amountGram) / 1000),
      ])
    )
  );
