import { N_PROCESS_GHGS } from "@/lib/constants";
import { mapValues } from "@/lib/utils";

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
] as const;

const hasCountryDependentDemands = (
  carrier: string,
  demands: number[] | Record<string, number[]>
): demands is Record<string, number[]> => carrier === "Electricity";

/**
 * Create a mapping between processes and ghg impacts per kilo for a given
 * country.
 */
export function getProcessEnvFactors(
  countryCode: string,
  processEnergyDemands: Record<string, number[]>,
  emissionsFactors: Record<string, number[] | Record<string, number[]>>
): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  Object.entries(processEnergyDemands).forEach(
    ([processCode, demandPerCarrier]) => {
      const factors = Array.from({ length: N_PROCESS_GHGS }).map((_) => 0);
      demandPerCarrier.forEach((mjPerKg, carrierIdx) => {
        // Exit early if it's not using this energyType
        if (mjPerKg === 0) return;

        const carrier = CARRIER_ORDER[carrierIdx];
        const demands = emissionsFactors[carrier];
        const ghgsPerMj: number[] = hasCountryDependentDemands(carrier, demands)
          ? demands[countryCode]
          : demands;

        if (!ghgsPerMj) {
          throw new Error(
            `Could not find process carrier impacts for ` +
              `(carrier, country) = (${carrier}, ${countryCode}).`
          );
        }

        ghgsPerMj.forEach((factor, i) => {
          factors[i] += factor * mjPerKg;
        });
      });

      result[processCode] = factors;
    }
  );

  return result;
}

/**
 * Compute the environmental impacts for each process.
 *
 * Input:
 * - Amount (kg) of each process
 * - Energies impact Factors: Contribution of energy type to each GHG.
 * - (static, impure) Process Energy Factors: Contribution of each process to
 *   each energy type.
 *
 * Output: { [l1Category]: { [processId]: [CO2, N2O, CH4, ...] } }
 */
export const computeProcessImpacts = (
  processAmountsMap: NestedRecord<string, number>,
  processFactors: Record<string, number[]>
): Record<string, { [k: string]: number[] }> =>
  mapValues(processAmountsMap, (processAmounts) =>
    Object.fromEntries(
      Object.entries(processAmounts)
        // TODO: We could/should warn when processId is _not_ in processAmounts,
        // as that may indicate a malformatted/invalid/unexpected process, which
        // can be difficult to debug / detect.
        .filter(([processId]) => processId in processFactors)
        .map(([processId, amountGram]) => [
          processId,
          processFactors[processId].map((x) => (x * amountGram) / 1000),
        ])
    )
  );
