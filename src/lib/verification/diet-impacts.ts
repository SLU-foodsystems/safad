/**
 * Computes the footprints of each rpc in the recipe.
 */

import { uniq } from "@/lib/utils";
import { expandedImpacts, AGGREGATE_HEADERS } from "@/lib/impacts-csv-utils";

import categoryNamesJson from "@/data/category-names.json";

import franceRpcFactors from "@/data/rpc-parameters/France-rpc.json";
import germanyRpcFactors from "@/data/rpc-parameters/Germany-rpc.json";
import greeceRpcFactors from "@/data/rpc-parameters/Greece-rpc.json";
import hungaryRpcFactors from "@/data/rpc-parameters/Hungary-rpc.json";
import irelandRpcFactors from "@/data/rpc-parameters/Ireland-rpc.json";
import italyRpcFactors from "@/data/rpc-parameters/Italy-rpc.json";
import spainRpcFactors from "@/data/rpc-parameters/Spain-rpc.json";
import swedenRpcFactors from "@/data/rpc-parameters/Sweden-rpc.json";

import franceDiet from "@/data/diets/France.json";
import germanyDiet from "@/data/diets/Germany.json";
import greeceDiet from "@/data/diets/Greece.json";
import hungaryDiet from "@/data/diets/Hungary.json";
import irelandDiet from "@/data/diets/Ireland.json";
import italyDiet from "@/data/diets/Italy.json";
import spainDiet from "@/data/diets/Spain.json";
import swedenDiet from "@/data/diets/Sweden.json";
import swedenBaselineDiet from "@/data/diets/SwedenBaseline.json";

import ResultsEngine from "@/lib/ResultsEngine";
import {
  ENV_IMPACTS_ZERO,
  LL_COUNTRY_CODES,
  TRANSPORT_EMISSIONS_ZERO,
} from "../constants";
import {
  emissionsFactorsEnergy,
  emissionsFactorsPackaging,
  emissionsFactorsTransport,
  footprintsRpcs,
  processesAndPackagingData,
  processesEnergyDemands,
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

const rpcFiles = {
  France: franceRpcFactors.data,
  Germany: germanyRpcFactors.data,
  Greece: greeceRpcFactors.data,
  Hungary: hungaryRpcFactors.data,
  Ireland: irelandRpcFactors.data,
  Italy: italyRpcFactors.data,
  Spain: spainRpcFactors.data,
  Sweden: swedenRpcFactors.data,
  SwedenBaseline: swedenRpcFactors.data,
} as unknown as Record<LlCountryName, RpcFactors>;

const dietFiles = {
  France: franceDiet,
  Germany: germanyDiet,
  Greece: greeceDiet,
  Hungary: hungaryDiet,
  Ireland: irelandDiet,
  Italy: italyDiet,
  Spain: spainDiet,
  Sweden: swedenDiet,
  SwedenBaseline: swedenBaselineDiet,
} as unknown as Record<LlCountryName, Record<string, number[]>>;

const categoryNames = categoryNamesJson as Record<string, string>;

export async function computeFootprintsForDiets(
  envFactors?: EnvFactors
): Promise<[string, string[][]][]> {
  const RE = new ResultsEngine();
  RE.setFootprintsRpcs(envFactors || (await footprintsRpcs()));
  RE.setEmissionsFactorsPackaging(await emissionsFactorsPackaging());
  RE.setEmissionsFactorsEnergy(await emissionsFactorsEnergy());
  RE.setEmissionsFactorsTransport(await emissionsFactorsTransport());
  RE.setProcessesEnergyDemands(await processesEnergyDemands());
  RE.setProcessesAndPackaging(await processesAndPackagingData());

  const wastesRetailAndConsumer: Record<string, Record<string, number[]>> = {};
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

    RE.setRpcFactors(rpcFiles[countryName]);

    const diet = Object.entries(dietFiles[countryName]).map(
      ([code, [amount]]): [string, number] => [code, amount]
    );

    const results = RE.computeImpactsByCategory(diet);
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
  envFactors?: EnvFactors
): Promise<string[][]> {
  const HEADER = ["Category Code", "Category Name", ...AGGREGATE_HEADERS];
  return (await computeFootprintsForDiets(envFactors)).map(
    ([country, data]) => [
      country,
      HEADER + "\n" + data.map((row) => row.join(",")).join("\n"),
    ]
  );
}
