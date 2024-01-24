import { sum, vectorsSum } from "@/lib/utils";
import {
  ENV_IMPACTS_ZERO,
  CO2E_CONV_FACTORS,
  TRANSPORT_EMISSIONS_ZERO,
  N_PACKAGING_GHGS,
  N_PROCESS_GHGS,
} from "@/lib/constants";

import { getRpcCodeSubset, listAllProcesses } from "@/lib/utils";

import categoryNamesJson from "@/data/category-names.json";
import namesJson from "@/data/rpc-names.json";

const categoryNames = categoryNamesJson as Record<string, string>;
const names = namesJson as Record<string, string>;

export const AGGREGATE_HEADERS = [
  // Aggregate over rpcs, processes, and packaging
  "Carbon footprint, total",
  "Carbon dioxide, total",
  "Methane, fossil, total",
  "Methane, biogenic, total",
  "Nitrous oxide, total",

  // Raw Materials GHGs
  "Carbon footprint, primary production",
  "Carbon dioxide, primary production",
  "Methane, fossil, primary production",
  "Methane, biogenic, primary production",
  "Nitrous oxide, primary production",

  // Key indicators - raw materials
  "Land",
  "N input",
  "P input",
  "Water",
  "Pesticides",
  "Biodiversity",
  "Ammonia",
  "Animal welfare",
  "Antibiotics",

  // Disaggregated GHG impacts
  "Mineral fertiliser production (CO2e)",
  "Capital goods (CO2e)",
  "Soil emissions (CO2e)",
  "Energy primary production (CO2e)",
  "Land use change (CO2e)",
  "Enteric fermentation (CO2e)",
  "Manure management (CO2e)",
  "Mineral fertiliser production (CO2)",
  "Capital goods (CO2)",
  "Energy primary production (CO2)",
  "Land use change (CO2)",
  "Mineral fertiliser production (CH4, fossil)",
  "Capital goods (CH4, fossil)",
  "Energy primary production (CH4, fossil)",
  "Soil emissions (CH4, biogenic)",
  "Enteric fermentation (CH4, biogenic)",
  "Manure management (CH4, biogenic)",
  "Mineral fertiliser production (N2O)",
  "Capital goods (N2O)",
  "Soil emissions (N2O)",
  "Energy primary production (N2O)",
  "Manure management (N2O)",

  // Processes
  "Processing (CO2e)",
  "Processing (CO2)",
  "Processing (CH4, fossil)",
  "Processing (N2O)",

  // Packaging
  "Packaging (CO2e)",
  "Packaging (CO2)",
  "Packaging (CH4, fossil)",
  "Packaging (CH4, biogenic)",
  "Packaging (N2O)",

  // Transport
  "Transports (CO2e)",
  "Transports (CO2)",
  "Transports (CH4, fossil)",
  "Transports (N2O)",
];

export const DETAILED_RESULTS_HEADER = [
  "Code",
  "Name",
  "L1 Category",
  "L2 Category",
  "Amount (g)",
  ...AGGREGATE_HEADERS,
  "Processes",
  "Packaging",
  "RPCs with missing data",
];

const getCategoryName = (code: string, level: number) => {
  const levelCode = getRpcCodeSubset(code, level);
  return categoryNames[levelCode] || `NOT FOUND (${levelCode})`;
};

export function expandedImpacts(
  rpcFootprints: number[],
  processEmissions: number[],
  packagingEmissions: number[],
  transportEmissions: number[] // Include co2e in their impacts, while packaging and processes do not
) {
  const toCo2e = (emissions: number[]) => (ghgName: string, i: number) =>
    (emissions[i] || 0) * CO2E_CONV_FACTORS[ghgName];

  const processCO2e = sum(["CO2", "FCH4", "N2O"].map(toCo2e(processEmissions)));

  const packagingCO2e = sum(
    ["CO2", "FCH4", "BCH4", "N2O"].map(toCo2e(packagingEmissions))
  );

  const transportCO2e = sum(
    ["CO2", "FCH4", "N2O"].map(toCo2e(transportEmissions))
  );

  const combinedEmissions = [
    rpcFootprints[0] + processCO2e + packagingCO2e + transportCO2e, // CO2e
    rpcFootprints[1] +
      processEmissions[0] +
      packagingEmissions[0] +
      transportEmissions[0], // CO2
    rpcFootprints[2] +
      processEmissions[1] +
      packagingEmissions[1] +
      transportEmissions[1], // Fossil CH4
    rpcFootprints[3] + packagingEmissions[2], // Biogenic CH4
    rpcFootprints[4] +
      processEmissions[2] +
      packagingEmissions[3] +
      transportEmissions[2], // N2O
  ];

  return [
    ...combinedEmissions,
    ...rpcFootprints,
    processCO2e,
    ...processEmissions,
    packagingCO2e,
    ...packagingEmissions,
    transportCO2e,
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
  while (totalProcessesEmissions.length < N_PROCESS_GHGS) {
    totalProcessesEmissions.push(0);
  }

  const packagingValues = Object.values(packagingEmissions)
    .map((obj) => Object.values(obj))
    .flat(1);
  const totalPackagingEmissions = vectorsSum(packagingValues);
  while (totalPackagingEmissions.length < N_PACKAGING_GHGS) {
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

export function labeledImpacts(
  code: string,
  amount: number,
  impacts: ImpactsTuple
): string[] {
  const [rpcImpacts, processImpacts, packagingImpacts, transportEmissions] =
    impacts;

  const processes = listAllProcesses(processImpacts).join("$");
  const packaging = listAllProcesses(packagingImpacts).join("$");

  const missingRpcImpacts = Object.entries(rpcImpacts).filter(
    (kv) => kv[1] === null
  );

  const aggregatedImpacts: string[] =
    missingRpcImpacts.length > 0
      ? AGGREGATE_HEADERS.map((_) => "NA")
      : aggregateImpacts(
          rpcImpacts as Record<string, number[]>,
          processImpacts,
          packagingImpacts,
          transportEmissions
        ).map((x) => x.toString());

  const failingRpcs = missingRpcImpacts.map(([code]) => code).join("$");

  return [
    code,
    names[code] || "NAME NOT FOUND",
    getCategoryName(code, 1),
    getCategoryName(code, 2),
    amount.toFixed(2),
    ...aggregatedImpacts,
    processes,
    packaging,
    failingRpcs,
  ];
}

export function labeledAndFilteredImpacts(
  entries: [string, number, ImpactsTuple][]
): string[][] {
  return entries
    .map(([code, amount, impacts]) =>
      impacts === null ? null : labeledImpacts(code, amount, impacts)
    )
    .filter((x): x is string[] => x !== null);
}

export function getDietBreakdown(
  disaggregatedDiet: [string, number, Diet][]
): string[][] {
  const rows: string[][] = [];
  disaggregatedDiet.forEach(([code, amount, rpcs]) => {
    rpcs.forEach(([rpcCode, rpcAmount]) => {
      rows.push([
        code,
        names[code],
        String(amount),
        rpcCode,
        names[rpcCode],
        String(rpcAmount),
      ]);
    });
  });
  return rows;
}
