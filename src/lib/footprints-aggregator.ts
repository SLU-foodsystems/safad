import { vectorsSum } from "@/lib/utils";
import { ENV_FOOTPRINTS_ZERO } from "./constants";

const CO2E_CONF_FACTORS: Record<string, number> = {
  CO2: 1,
  BCH4: 27,
  FCH4: 29.8,
  N2O: 273,
  HCFC: 1960,
};

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
  "Processes",
];

export default function aggregateFootprints(
  rpcFootprints: Record<string, number[]>,
  processFootprints: Record<string, Record<string, number[]>>
) {
  const totalRpcFootprints =
    Object.values(rpcFootprints).length > 0
      ? vectorsSum(Object.values(rpcFootprints))
      : ENV_FOOTPRINTS_ZERO;
  const processList = Object.values(processFootprints)
    .map((obj) => Object.keys(obj))
    .flat(1);
  const processValues = Object.values(processFootprints)
    .map((obj) => Object.values(obj))
    .flat(1);
  const totalProcessesFootprints = vectorsSum(processValues);
  while (totalProcessesFootprints.length < 3) {
    totalProcessesFootprints.push(0);
  }

  const processCO2e = ["CO2", "FCH4", "N2O"]
    .map((ghg, i) => totalProcessesFootprints[i] * CO2E_CONF_FACTORS[ghg])
    .reduce((a, b) => a + b, 0);

  const combinedGhgFootprints = [
    totalRpcFootprints[0] + processCO2e,
    totalRpcFootprints[1] + totalProcessesFootprints[0],
    totalRpcFootprints[2] + totalProcessesFootprints[1],
    totalRpcFootprints[3],
    totalRpcFootprints[4] + totalProcessesFootprints[2],
  ];

  return [
    ...combinedGhgFootprints,
    ...totalRpcFootprints,
    processCO2e,
    ...totalProcessesFootprints,
    processList.join("$"),
  ];
}
