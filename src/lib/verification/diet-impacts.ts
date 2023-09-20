/**
 * Computes the footprints of each rpc in the recipe.
 */

import { uniq } from "@/lib/utils";
import {
  expandedImpacts,
  AGGREGATE_HEADERS,
} from "@/lib/impacts-csv-utils";

import allEnvImpactsJson from "@/data/env-factors.json";
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
import { ENV_IMPACTS_ZERO, TRANSPORT_EMISSIONS_ZERO } from "../constants";

const allEnvImpacts = allEnvImpactsJson.data as unknown as EnvFactors;

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
  RE.setEnvFactors(envFactors || allEnvImpacts);

  const allResults = LL_COUNTRIES.map((country) => {
    if (country === "SwedenBaseline") {
      RE.setCountry("Sweden");
    } else {
      RE.setCountry(country);
    }

    RE.setRpcFactors(rpcFiles[country]);

    const diet = Object.entries(dietFiles[country]).map(
      ([code, [amount, retailWaste, consumerWaste]]) => ({
        code,
        amount,
        retailWaste,
        consumerWaste,
      })
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

    return [country, data] as [string, string[][]];
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
