/**
 * Computes the footprints of each rpc in the recipe.
 */

import { uniq } from "@/lib/utils";
import { expandedImpacts, AGGREGATE_HEADERS } from "@/lib/impacts-csv-utils";

import categoryNamesJson from "@/data/category-names.json";

import ResultsEngine from "@/lib/ResultsEngine";
import {
  ENV_IMPACTS_ZERO,
  LL_COUNTRY_CODES,
  TRANSPORT_EMISSIONS_ZERO,
} from "../constants";
import {
  diet,
  emissionsFactorsEnergy,
  emissionsFactorsPackaging,
  emissionsFactorsTransport,
  foodsRecipes,
  footprintsRpcs,
  preparationProcessesAndPackaging,
  processesEnergyDemands,
  rpcOriginWaste,
  wasteRetailAndConsumer,
} from "../default-files-importer";

type LlCountryName =
  | "France"
  | "Germany"
  | "Greece"
  | "Hungary"
  | "Ireland"
  | "Italy"
  | "Poland"
  | "Spain"
  | "Sweden"
  | "SwedenBaseline";

const LL_COUNTRIES: LlCountryName[] = [
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

export async function computeFootprintsForDiets(
  envFactors?: RpcFootprintsByOrigin
): Promise<[string, string[][]][]> {
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
  } as Record<LlCountryName, RpcOriginWaste>;

  const dietFiles = {
    France: await diet("FR"),
    Germany: await diet("DE"),
    Greece: await diet("GR"),
    Hungary: await diet("HU"),
    Ireland: await diet("IE"),
    Italy: await diet("IT"),
    Spain: await diet("ES"),
    Sweden: await diet("SE"),
    SwedenBaseline: await diet("SE-B"),
  } as Record<string, Diet>;

  const RE = new ResultsEngine();
  RE.setFoodsRecipes(await foodsRecipes());
  RE.setFootprintsRpcs(envFactors || (await footprintsRpcs()));
  RE.setEmissionsFactorsPackaging(await emissionsFactorsPackaging());
  RE.setEmissionsFactorsEnergy(await emissionsFactorsEnergy());
  RE.setEmissionsFactorsTransport(await emissionsFactorsTransport());
  RE.setProcessesEnergyDemands(await processesEnergyDemands());
  RE.setPrepProcessesAndPackaging(await preparationProcessesAndPackaging());

  const wastesRetailAndConsumer: NestedRecord<string, number[]> = {};
  for (const countryName of LL_COUNTRIES) {
    if (countryName === "SwedenBaseline") continue;
    const countryCode = LL_COUNTRY_CODES[countryName];
    wastesRetailAndConsumer[countryCode] = await wasteRetailAndConsumer(
      countryCode
    );
  }

  const allResults = LL_COUNTRIES.map((countryName) => {
    if (countryName === "SwedenBaseline") {
      RE.setCountryCode("SE");
      RE.setWasteRetailAndConsumer(wastesRetailAndConsumer["SE"]);
    } else {
      const countryCode = LL_COUNTRY_CODES[countryName];
      RE.setWasteRetailAndConsumer(wastesRetailAndConsumer[countryCode]);
      RE.setCountryCode(countryCode);
    }

    RE.setRpcOriginWaste(rpcFiles[countryName]);

    const results = RE.computeImpactsByCategory(dietFiles[countryName]);
    if (results === null) return null;
    const categories = uniq([
      ...Object.keys(results[0]),
      ...Object.keys(results[1]),
    ]).sort();

    const data = categories.map((categoryId) => {
      const [rpcImpacts, processImpacts, packagingImpacts, transportImpacts] =
        results.map((x) => x[categoryId]);

      const footprints = expandedImpacts(
        rpcImpacts || ENV_IMPACTS_ZERO,
        processImpacts || [0, 0, 0],
        packagingImpacts || [0, 0],
        transportImpacts || TRANSPORT_EMISSIONS_ZERO
      );

      return [categoryId, `"${categoryNames[categoryId]}"`, ...footprints];
    });

    return [countryName, data] as [string, string[][]];
  }).filter((x): x is [string, string[][]] => x !== null);

  return allResults;
}

export default async function computeFootprintsForEachRpcWithOrigin(
  envFactors?: RpcFootprintsByOrigin
): Promise<string[][]> {
  const HEADER = ["Category Code", "Category Name", ...AGGREGATE_HEADERS];
  return (await computeFootprintsForDiets(envFactors)).map(
    ([country, data]) => [
      country,
      HEADER + "\n" + data.map((row) => row.join(",")).join("\n"),
    ]
  );
}
