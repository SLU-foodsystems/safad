import { sum, vectorsSum } from "@/lib/utils";
import {
  ENV_IMPACTS_ZERO,
  CO2E_CONV_FACTORS,
  TRANSPORT_EMISSIONS_ZERO,
} from "@/lib/constants";

import {
  getRpcCodeSubset,
  listAllProcesses,
  maybeQuoteValue,
} from "@/lib/utils";

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
  "Carbon footprint",
  "Carbon dioxide",
  "Methane, fossil",
  "Methane, biogenic",
  "Nitrous oxide",

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
  "CO2e_rm_fert_prod",
  "CO2e_rm_cap_goods",
  "CO2e_rm_soils",
  "CO2e_rm_energy",
  "CO2e_rm_LUC",
  "CO2e_rm_ent_ferm",
  "CO2_rm_fert_prod",
  "CO2_rm_cap_goods",
  "CO2_rm_energy",
  "CO2_rm_LUC",
  "CH4_fossil_rm_fert_prod",
  "CH4_fossil_rm_cap_goods",
  "CH4_fossil_rm_energy",
  "CH4_bio_rm_soils_dir",
  "CH4_bio_rm_ent_ferm",
  "CH4_bio_rm_manure",
  "N2O_rm_fert_prod",
  "N2O_rm_cap_goods",
  "N2O_rm_soils",
  "N2O_rm_energy",
  "N2O_rm_manure",

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

  // Transport
  "CO2e_transp",
  "CO2_transp",
  "CH4_fossil_transp",
  "N2O_transp",
];

export const DETAILED_RESULTS_HEADER = [
  "Code",
  "Name",
  "L1 Category",
  "L2 Category",
  "Amount (g)",
  ...AGGREGATE_HEADERS.map(x => `"${x}"`),
  "Processes",
  "Packeting",
];

const getCategoryName = (code: string, level: number) => {
  const levelCode = getRpcCodeSubset(code, level);
  return categoryNames[levelCode] || `NOT FOUND (${levelCode})`;
};

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

export function labeledImpacts(
  code: string,
  amount: number,
  impacts: ImpactsTuple
): string[] {
  const [rpcImpacts, processImpacts, packagingImpacts, transportEmissions] =
    impacts;
  const processes = listAllProcesses(processImpacts).join("$");
  const packeting = listAllProcesses(packagingImpacts).join("$");

  return [
    code,
    maybeQuoteValue(names[code] || "NAME NOT FOUND"),
    maybeQuoteValue(getCategoryName(code, 1)),
    maybeQuoteValue(getCategoryName(code, 2)),
    amount.toFixed(2),
    ...aggregateImpacts(
      rpcImpacts,
      processImpacts,
      packagingImpacts,
      transportEmissions
    ).map((x) => x.toString()),
    processes,
    packeting,
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

export function getDietBreakdown(disaggregatedDiet: [string, number, Diet][]): string[][] {
  const rows: string[][] = [];
  disaggregatedDiet.forEach(([code, amount, rpcs]) => {
    rpcs.forEach(([rpcCode, rpcAmount]) => {
      rows.push(
        [
          code,
          `"${names[code]}"`,
          String(amount),
          rpcCode,
          `"${names[rpcCode]}"`,
          String(rpcAmount),
        ]
      );
    });
  });
  return rows;
}
