import { filterObject, sum, uniq, vectorsSum } from "@/lib/utils";
import {
  ENV_IMPACTS_ZERO,
  CO2E_CONV_FACTORS,
  TRANSPORT_EMISSIONS_ZERO,
  N_PACKAGING_GHGS,
  N_PROCESS_GHGS,
} from "@/lib/constants";

import { getRpcCodeSubset, listAllProcesses } from "@/lib/utils";
import { rpcNames, categoryNames } from "@/lib/efsa-names";

export const AGGREGATE_HEADERS = [
  // Aggregate over rpcs, processes, and packaging
  "Carbon footprint, total (kg CO2e)",
  "Carbon dioxide, total (kg CO2)",
  "Methane, fossil, total (kg CH4)",
  "Methane, biogenic, total (kg CH4)",
  "Nitrous oxide, total (kg N2O)",

  // Raw Materials GHGs
  "Carbon footprint, primary production (kg CO2e)",
  "Carbon dioxide, primary production (kg CO2)",
  "Methane, fossil, primary production (kg CH4)",
  "Methane, biogenic, primary production (kg CH4)",
  "Nitrous oxide, primary production (kg N2O)",

  // Key indicators - raw materials
  "Cropland (m2*year/kg)",
  "New N input (kg N/kg)",
  "New P input (kg P/kg)",
  "Water (m3/kg)",
  "Pesticides (g a.i/kg)",
  "Biodiversity (E/MSY/kg)",
  "Ammonia (kg NH3/kg)",
  "Animal welfare (index)",
  "Antibiotics (index)",

  // Disaggregated GHG impacts
  "Mineral fertiliser production (kg CO2e)",
  "Capital goods (kg CO2e)",
  "Soil emissions (kg CO2e)",
  "Energy primary production (kg CO2e)",
  "Land use change (kg CO2e)",
  "Enteric fermentation (kg CO2e)",
  "Manure management (kg CO2e)",
  "Mineral fertiliser production (kg CO2)",
  "Capital goods (kg CO2)",
  "Energy primary production (kg CO2)",
  "Land use change (kg CO2)",
  "Mineral fertiliser production (kg CH4, fossil)",
  "Capital goods (kg CH4, fossil)",
  "Energy primary production (kg CH4, fossil)",
  "Soil emissions (kg CH4, biogenic)",
  "Enteric fermentation (kg CH4, biogenic)",
  "Manure management (kg CH4, biogenic)",
  "Mineral fertiliser production (kg N2O)",
  "Capital goods (kg N2O)",
  "Soil emissions (kg N2O)",
  "Energy primary production (kg N2O)",
  "Manure management (kg N2O)",

  // Processes
  "Processing (kg CO2e)",
  "Processing (kg CO2)",
  "Processing (kg CH4, fossil)",
  "Processing (kg N2O)",

  // Packaging
  "Packaging (kg CO2e)",
  "Packaging (kg CO2)",
  "Packaging (kg CH4, fossil)",
  "Packaging (kg CH4, biogenic)",
  "Packaging (kg N2O)",

  // Transport
  "Transports (kg CO2e)",
  "Transports (kg CO2)",
  "Transports (kg CH4, fossil)",
  "Transports (kg N2O)",
] as const;

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

export const BREAKDOWN_RESULTS_HEADER = [
  "Food Code",
  "Food Name",
  "L1 Category",
  "L2 Category",
  "Food Amount (g)",
  "RPC Code",
  "RPC Name",
  "RPC Amount (g)",
];

const getCategoryName = (code: string, level: number) => {
  const levelCode = getRpcCodeSubset(code, level, true);
  return categoryNames[levelCode] || `NOT FOUND (${levelCode})`;
};

export const aggregateHeaderIndex = (
  header: (typeof AGGREGATE_HEADERS)[number]
) => AGGREGATE_HEADERS.indexOf(header);

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

export function aggregateImpactsByCategory(
  rpcFootprints: Record<string, number[] | null>,
  processEmissions: NestedRecord<string, number[]>,
  packagingEmissions: NestedRecord<string, number[]>,
  transportEmissions: Record<string, number[]>
) {
  const nonNullRpcImpacts: Record<string, number[]> = Object.fromEntries(
    Object.entries(rpcFootprints).filter(
      (kv): kv is [string, number[]] => kv[1] !== null
    )
  );

  const getL1Keys = (obj: Record<string, any>): string[] =>
    Object.keys(obj).map((code) => getRpcCodeSubset(code, 1));

  const l1Codes = uniq([
    ...getL1Keys(nonNullRpcImpacts),
    ...Object.keys(processEmissions),
    ...Object.keys(packagingEmissions),
    ...getL1Keys(transportEmissions),
  ]).sort();

  return Object.fromEntries(
    l1Codes.map((l1Code) => [
      l1Code,
      aggregateImpacts(
        filterObject(nonNullRpcImpacts, (k) => k.startsWith(l1Code)),
        { [l1Code]: processEmissions[l1Code] || {} },
        { [l1Code]: packagingEmissions[l1Code] || {} },
        filterObject(transportEmissions, (k) => k.startsWith(l1Code))
      ),
    ])
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
    rpcNames[code] || "NAME NOT FOUND",
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
        rpcNames[code],
        getCategoryName(code, 1),
        getCategoryName(code, 2),
        String(amount),
        rpcCode,
        rpcNames[rpcCode],
        String(rpcAmount),
      ]);
    });
  });
  return rows;
}
