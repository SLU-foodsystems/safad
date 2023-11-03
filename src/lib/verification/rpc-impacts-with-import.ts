/**
 * Computes the impacts of each RPC in the recipe.
 */

import {
  getRpcCodeSubset,
  listAllProcesses,
  maybeQuoteValue,
} from "@/lib/utils";
import { AGGREGATE_HEADERS, aggregateImpacts } from "@/lib/impacts-csv-utils";

import categoryNamesJson from "@/data/category-names.json";
import foodsRecipesJson from "@/data/foodex-recipes.json";
import namesJson from "@/data/rpc-names.json";

import ResultsEngine from "@/lib/ResultsEngine";
import { LL_COUNTRY_CODES } from "../constants";
import {
  emissionsFactorsEnergy,
  emissionsFactorsPackaging,
  emissionsFactorsTransport,
  footprintsRpcs,
  processesAndPackagingData,
  processesEnergyDemands,
  rpcOriginWaste,
  wasteRetailAndConsumer,
} from "../default-files-importer";

const foodsRecipes = foodsRecipesJson.data as unknown as FoodsRecipes;

type LlCountryName =
  | "France"
  | "Germany"
  | "Greece"
  | "Hungary"
  | "Ireland"
  | "Italy"
  | "Spain"
  | "Sweden"
  | "SwedenBaseline";

let LL_COUNTRIES: LlCountryName[] = [
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Spain",
  "Sweden",
  "SwedenBaseline",
];

const categoryNames = categoryNamesJson as Record<string, string>;
const getCategoryName = (code: string, level: number) => {
  const levelCode = getRpcCodeSubset(code, level);
  return categoryNames[levelCode] || `NOT FOUND (${levelCode})`;
};

const codesInRecipes = Object.keys(foodsRecipes);

export default async function computeFootprintsForEachRpcWithOrigin(
  envFactors?: EnvFactors
): Promise<string[][]> {
  const rpcFiles = {
    France: await rpcOriginWaste("FR"),
    Germany: await rpcOriginWaste("DE"),
    Greece: await rpcOriginWaste("GR"),
    Hungary: await rpcOriginWaste("HU"),
    Ireland: await rpcOriginWaste("IE"),
    Italy: await rpcOriginWaste("IT"),
    Spain: await rpcOriginWaste("ES"),
    Sweden: await rpcOriginWaste("SE"),
    SwedenBaseline: await rpcOriginWaste("SE"),
  } as Record<LlCountryName, RpcFactors>;

  const header = [
    "Code",
    "Name",
    "L1 Category",
    "L2 Category",
    "% Waste (Retail- and consumer)",
    ...AGGREGATE_HEADERS,
    "Processes",
    "Packeting",
  ];

  const names = namesJson as Record<string, string>;

  const RE = new ResultsEngine();

  RE.setFootprintsRpcs(envFactors || (await footprintsRpcs()));
  RE.setEmissionsFactorsPackaging(await emissionsFactorsPackaging());
  RE.setEmissionsFactorsEnergy(await emissionsFactorsEnergy());
  RE.setEmissionsFactorsTransport(await emissionsFactorsTransport());
  RE.setProcessesEnergyDemands(await processesEnergyDemands());
  RE.setProcessesAndPackaging(await processesAndPackagingData());

  const syncWasteFiles = Object.fromEntries(
    await Promise.all(
      LL_COUNTRIES.map(
        async (
          country: LlCountryName
        ): Promise<[string, Record<string, number[]>]> => {
          const wasteCountryCode =
            country === "SwedenBaseline" ? "SE" : LL_COUNTRY_CODES[country];
          const wasteFactors = await wasteRetailAndConsumer(wasteCountryCode);
          return [country, wasteFactors];
        }
      )
    )
  );

  const results = LL_COUNTRIES.map((countryName) => {
    if (countryName === "SwedenBaseline") {
      RE.setCountryCode("SE");
      RE.setWasteRetailAndConsumer(syncWasteFiles["Sweden"]);
    } else {
      RE.setCountryCode(LL_COUNTRY_CODES[countryName]);
      RE.setWasteRetailAndConsumer(syncWasteFiles[countryName]);
    }

    const rpcParameters = rpcFiles[countryName];
    RE.setRpcFactors(rpcParameters);

    const impactsPerDiet = codesInRecipes
      .map((code) => {
        const impacts = RE.computeImpacts([[code, 1000]]);
        if (impacts === null) {
          return null;
        }
        const [
          rpcImpacts,
          processImpacts,
          packagingImpacts,
          transportEmissions,
        ] = impacts;
        const processes = listAllProcesses(processImpacts).join("$");
        const packeting = listAllProcesses(packagingImpacts).join("$");

        return [
          code,
          maybeQuoteValue(names[code] || "NAME NOT FOUND"),
          maybeQuoteValue(getCategoryName(code, 1)),
          maybeQuoteValue(getCategoryName(code, 2)),
          "TODO",
          ...aggregateImpacts(
            rpcImpacts,
            processImpacts,
            packagingImpacts,
            transportEmissions
          ),
          processes,
          packeting,
        ];
      })
      .filter((x): x is string[] => x !== null);

    const impactsCsv = impactsPerDiet.map((row) => row.join(",")).join("\n");

    return [countryName, header.join(",") + "\n" + impactsCsv];
  });

  return results;
}
