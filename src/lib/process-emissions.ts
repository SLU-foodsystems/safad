import { N_PROCESS_GHGS } from "@/lib/constants";
import { mapValues } from "@/lib/utils";

// Hard-coded to match the order of columns in IP Energy Proc.csv
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

/**
 * Create a mapping between processes and ghg impacts per kilo for a given
 * country.
 */
export function getProcessEnvFactors(
  countryCode: string,
  processEnergyDemands: Record<string, number[]>,
  emissionsFactors: Record<string, Record<string, number[]>>
): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  Object.entries(processEnergyDemands).forEach(
    ([processCode, demandPerCarrier]) => {
      const factors = Array.from({ length: N_PROCESS_GHGS }).map(() => 0);
      demandPerCarrier.forEach((mjPerKg, carrierIdx) => {
        // Exit early if we're not using this energyType
        if (mjPerKg === 0) return;

        const carrier = CARRIER_ORDER[carrierIdx];
        if (!carrier) {
          throw new Error(`Index out of bounds for carrierIdx ${carrierIdx}.`);
        }

        const demands = emissionsFactors[carrier];
        if (!demands) {
          throw new Error(
            `No energy demands found for given carrier ${carrier}`
          );
        }

        const ghgsPerMj: number[] = demands[countryCode] ?? demands.RoW;

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
        .filter(([processId]) => processFactors[processId] !== undefined)
        .map(([processId, amountGram]) => [
          processId,
          processFactors[processId]!.map((x) => (x * amountGram) / 1000),
        ])
    )
  );

function addProcessImpacts(
  target: NestedRecord<string, number[]>,
  source: Record<string, { [k: string]: number[] }>
) {
  Object.entries(source).forEach(([category, processes]) => {
    target[category] ??= {};
    Object.entries(processes).forEach(([process, values]) => {
      target[category]![process] ??= values.map(() => 0);
      values.forEach(
        (value, index) =>
          (target[category]![process]![index] =
            (target[category]![process]![index] || 0) + value)
      );
    });
  });
}

function getOriginWeightedProcessEnvFactors(
  originFactors: RpcOriginWaste[string],
  processEnergyDemands: Record<string, number[]>,
  emissionsFactors: Record<string, Record<string, number[]>>
) {
  const result: Record<string, number[]> = {};

  Object.entries(originFactors).forEach(([origin, [share]]) => {
    const factors = getProcessEnvFactors(
      origin,
      processEnergyDemands,
      emissionsFactors
    );
    Object.entries(factors).forEach(([process, values]) => {
      result[process] ??= values.map(() => 0);
      values.forEach(
        (value, index) => (result[process]![index] += value * share)
      );
    });
  });

  return result;
}

export function computeDietProcessImpacts(
  processLocationAmounts: ProcessLocationAmounts,
  processEnergyDemands: Record<string, number[]>,
  emissionsFactorsEnergy: Record<string, Record<string, number[]>>,
  consumerCountry: string,
  rpcOriginWaste: RpcOriginWaste
): NestedRecord<string, number[]> {
  const result: NestedRecord<string, number[]> = {};
  const consumerFactors = getProcessEnvFactors(
    consumerCountry,
    processEnergyDemands,
    emissionsFactorsEnergy
  );

  Object.entries(processLocationAmounts).forEach(([terminalRpc, locations]) => {
    addProcessImpacts(
      result,
      computeProcessImpacts(locations.consumer, consumerFactors)
    );

    const originFactors = rpcOriginWaste[terminalRpc];
    if (!originFactors) {
      throw new Error(`Missing origin shares for terminal RPC ${terminalRpc}.`);
    }

    addProcessImpacts(
      result,
      computeProcessImpacts(
        locations.producer,
        getOriginWeightedProcessEnvFactors(
          originFactors,
          processEnergyDemands,
          emissionsFactorsEnergy
        )
      )
    );
  });

  return result;
}
