import { sum, vectorsSum } from "@/lib/utils";
import { ENV_FOOTPRINTS_ZERO, CO2E_CONV_FACTORS } from "@/lib/constants";

export const AGGREGATE_HEADERS = [
  "Total CO2e",
  "Total CO2",
  "Total CH4: Fossil",
  "Total CH4: Biogenic",
  "Total N2O",
  "Carbon_Footprint",
  "Carbon_Dioxide",
  "Methane_fossil",
  "Methane_bio",
  "Nitrous_Oxide",
  "HFC",
  "Land",
  "N_input",
  "P_input",
  "Water",
  "Pesticides",
  "Biodiversity",
  "Ammonia",
  "Labour",
  "Animal_Welfare",
  "Antibiotics",
  "Process CO2e",
  "Process CO2",
  "Process CH4",
  "Process N2O",
  "Packaging CO2",
];

export function expandedFootprints(
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
    ["CO2"].map(
      (ghg, i) => (packagingFootprints[i] || 0) * CO2E_CONV_FACTORS[ghg]
    )
  );

  const combinedGhgFootprints = [
    rpcFootprints[0] + processCO2e + packagingCO2e,
    rpcFootprints[1] + processFootprints[0],
    rpcFootprints[2] + processFootprints[1],
    rpcFootprints[3], // biogenic CH4, which is not emitted from processes
    rpcFootprints[4] + processFootprints[2],
  ];

  return [
    ...combinedGhgFootprints,
    ...rpcFootprints,
    processCO2e,
    ...processFootprints,
    ...packagingFootprints.slice(0, 1),
  ];
}

/**
 * Join all footprints into a vector of (numeric) impacts.
 */
export default function aggregateFootprints(
  rpcFootprints: Record<string, number[]>,
  processFootprints: Record<string, Record<string, number[]>>,
  packagingFootprints: Record<string, Record<string, number[]>>
): number[] {
  const totalRpcFootprints =
    Object.values(rpcFootprints).length > 0
      ? vectorsSum(Object.values(rpcFootprints))
      : ENV_FOOTPRINTS_ZERO;
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

  return expandedFootprints(
    totalRpcFootprints,
    totalProcessesFootprints,
    totalPackagingFootprints
  );
}
