import { sum, vectorsSum } from "@/lib/utils";
import { ENV_IMPACTS_ZERO, CO2E_CONV_FACTORS } from "@/lib/constants";

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
];

export function expandedImpacts(
  rpcFootprints: number[],
  processFootprints: number[],
  packagingFootprints: number[]
) {
  const processCO2e = sum(
    ["CO2", "FCH4", "N2O"].map(
      (ghg, i) => (processFootprints[i] || 0) * CO2E_CONV_FACTORS[ghg]
    )
  );

  const packagingCO2e = sum(
    ["CO2", "FCH4", "N2O"].map(
      (ghg, i) => (packagingFootprints[i] || 0) * CO2E_CONV_FACTORS[ghg]
    )
  );

  const combinedGhgFootprints = [
    rpcFootprints[0] + processCO2e + packagingCO2e, // CO2e
    rpcFootprints[1] + processFootprints[0], // CO2
    rpcFootprints[2] + processFootprints[1], // FCH4
    rpcFootprints[3], // biogenic CH4, which is not emitted from processes
    rpcFootprints[4] + processFootprints[2], // N2O
  ];

  return [
    ...combinedGhgFootprints,
    ...rpcFootprints,
    processCO2e,
    ...processFootprints,
    packagingCO2e,
    ...packagingFootprints
  ];
}

/**
 * Join all footprints into a vector of (numeric) impacts.
 */
export default function aggregateImpacts(
  rpcFootprints: Record<string, number[]>,
  processFootprints: Record<string, Record<string, number[]>>,
  packagingFootprints: Record<string, Record<string, number[]>>
): number[] {
  const totalRpcFootprints =
    Object.values(rpcFootprints).length > 0
      ? vectorsSum(Object.values(rpcFootprints))
      : ENV_IMPACTS_ZERO;

  const processValues = Object.values(processFootprints)
    .map((obj) => Object.values(obj))
    .flat(1);

  const totalProcessesFootprints = vectorsSum(processValues);
  while (totalProcessesFootprints.length < 3) {
    totalProcessesFootprints.push(0);
  }

  const packagingValues = Object.values(packagingFootprints)
    .map((obj) => Object.values(obj))
    .flat(1);
  const totalPackagingFootprints = vectorsSum(packagingValues);
  while (totalPackagingFootprints.length < 2) {
    totalPackagingFootprints.push(0);
  }

  return expandedImpacts(
    totalRpcFootprints,
    totalProcessesFootprints,
    totalPackagingFootprints
  );
}
