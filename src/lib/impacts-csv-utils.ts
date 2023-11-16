import { sum, vectorsSum } from "@/lib/utils";
import {
  ENV_IMPACTS_ZERO,
  CO2E_CONV_FACTORS,
  TRANSPORT_EMISSIONS_ZERO,
} from "@/lib/constants";

export const AGGREGATE_HEADERS = [
  // Aggregate over rpcs, processes, and packaging
  "Carbon_footprint_tot",
  "CO2_tot",
  "CH4_fossil_tot",
  "CH4_bio_tot",
  "N2O_tot",
  // Raw Materials GHGs
  "CO2e_rm",
  "CO2_rm",
  "CH4_fossil_rm",
  "CH4_bio_rm",
  "N2O_rm",
  "HFC_rm",
  // Key indicators - raw materials
  "Land_use",
  "New_N_input",
  "New_P_input",
  "Blue_water_use",
  "Pesticide_use",
  "Biodiversity_land",
  "Ammonia_emissions",
  "Labour",
  "Animal_welfare",
  "Use_of_antibiotics",
  // Processes
  "CO2e_proc",
  "CO2_proc",
  "CH4_proc",
  "N2O_proc",
  // Packaging
  "CO2e_pack",
  "CO2_pack",
  "CH4_fossil_pack",
  "N2O_pack",
  // transport
  "CO2e_transp",
  "CO2_transp",
  "CH4_fossil_transp",
  "N2O_transp",
];

export function expandedImpacts(
  rpcFootprints: number[],
  processEmissions: number[],
  packagingEmissions: number[],
  transportEmissions: number[]
) {
  const processCO2e = sum(
    ["CO2", "FCH4", "N2O"].map(
      (ghg, i) => (processEmissions[i] || 0) * CO2E_CONV_FACTORS[ghg]
    )
  );

  const packagingCO2e = sum(
    ["CO2", "FCH4", "N2O"].map(
      (ghg, i) => (packagingEmissions[i] || 0) * CO2E_CONV_FACTORS[ghg]
    )
  );

  const combinedEmissions = [
    rpcFootprints[0] + processCO2e + packagingCO2e, // CO2e
    rpcFootprints[1] + processEmissions[0], // CO2
    rpcFootprints[2] + processEmissions[1], // FCH4
    rpcFootprints[3], // biogenic CH4, which is not emitted from processes
    rpcFootprints[4] + processEmissions[2], // N2O
  ];

  return [
    ...combinedEmissions,
    ...rpcFootprints,
    processCO2e,
    ...processEmissions,
    packagingCO2e,
    ...packagingEmissions,
    ...transportEmissions,
  ];
}

/**
 * Join all footprints into a vector of (numeric) impacts.
 */
export function aggregateImpacts(
  rpcFootprints: Record<string, number[]>,
  processEmissions: NestedRecord<string, number[]>,
  packagingEmissions: NestedRecord<string, number[]>,
  transportEmissions: Record<string, number[]>
): number[] {
  const totalRpcFootprints =
    Object.values(rpcFootprints).length > 0
      ? vectorsSum(Object.values(rpcFootprints))
      : ENV_IMPACTS_ZERO;

  const processValues = Object.values(processEmissions)
    .map((obj) => Object.values(obj))
    .flat(1);

  const totalProcessesEmissions = vectorsSum(processValues);
  while (totalProcessesEmissions.length < 3) {
    totalProcessesEmissions.push(0);
  }

  const packagingValues = Object.values(packagingEmissions)
    .map((obj) => Object.values(obj))
    .flat(1);
  const totalPackagingEmissions = vectorsSum(packagingValues);
  while (totalPackagingEmissions.length < 2) {
    totalPackagingEmissions.push(0);
  }

  const totalTransportEmissions =
    Object.values(transportEmissions).length > 0
      ? vectorsSum(Object.values(transportEmissions))
      : TRANSPORT_EMISSIONS_ZERO;

  return expandedImpacts(
    totalRpcFootprints,
    totalProcessesEmissions,
    totalPackagingEmissions,
    totalTransportEmissions
  );
}
