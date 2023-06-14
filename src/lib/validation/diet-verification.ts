/**
 * Computes the footprints of each rpc in the recipe.
 */

import {
  getRpcCodeSubset,
  listAllProcesses,
  maybeQuoteValue,
  uniq,
} from "@/lib/utils";
import aggregateFootprints, {
  expandedFootprints,
  AGGREGATE_HEADERS,
} from "@/lib/footprints-aggregator";

import allEnvImpactsJson from "@/data/env-factors.json";
import categoryNamesJson from "@/data/category-names.json";
import foodsRecipesJson from "@/data/foodex-recipes.json";
import namesJson from "@/data/rpc-names.json";

import franceRpcFactors from "@/data/rpc-parameters/France-rpc.json";
import germanyRpcFactors from "@/data/rpc-parameters/Germany-rpc.json";
import greeceRpcFactors from "@/data/rpc-parameters/Greece-rpc.json";
import irelandRpcFactors from "@/data/rpc-parameters/Ireland-rpc.json";
import italyRpcFactors from "@/data/rpc-parameters/Italy-rpc.json";
import spainRpcFactors from "@/data/rpc-parameters/Spain-rpc.json";
import swedenRpcFactors from "@/data/rpc-parameters/Sweden-rpc.json";

import franceDiet from "@/data/diets/France.json";
import germanyDiet from "@/data/diets/Germany.json";
import greeceDiet from "@/data/diets/Greece.json";
import irelandDiet from "@/data/diets/Ireland.json";
import italyDiet from "@/data/diets/Italy.json";
import spainDiet from "@/data/diets/Spain.json";
import swedenDiet from "@/data/diets/Sweden.json";

import ResultsEngine from "@/lib/ResultsEngine";
import { ENV_FOOTPRINTS_ZERO } from "../constants";

const foodsRecipes = foodsRecipesJson.data as unknown as FoodsRecipes;
const allEnvImpacts = allEnvImpactsJson.data as unknown as EnvOriginFactors;

type LlCountryName =
  | "France"
  | "Germany"
  | "Greece"
  | "Ireland"
  | "Italy"
  | "Poland"
  | "Spain"
  | "Sweden";

let LL_COUNTRIES: LlCountryName[] = [
  "France",
  "Germany",
  "Greece",
  "Ireland",
  "Italy",
  "Spain",
  "Sweden",
];

// LL_COUNTRIES = ["Sweden"]

const rpcFiles = {
  France: franceRpcFactors.data,
  Germany: germanyRpcFactors.data,
  Greece: greeceRpcFactors.data,
  Ireland: irelandRpcFactors.data,
  Italy: italyRpcFactors.data,
  Spain: spainRpcFactors.data,
  Sweden: swedenRpcFactors.data,
} as unknown as Record<LlCountryName, RpcFactors>;

const dietFiles = {
  France: franceDiet,
  Germany: germanyDiet,
  Greece: greeceDiet,
  Ireland: irelandDiet,
  Italy: italyDiet,
  Spain: spainDiet,
  Sweden: swedenDiet,
} as unknown as Record<LlCountryName, Record<string, number[]>>;

const categoryNames = categoryNamesJson as Record<string, string>;
const getCategoryName = (code: string, level: number) => {
  const levelCode = getRpcCodeSubset(code, level);
  return categoryNames[levelCode] || `NOT FOUND (${levelCode})`;
};

export default async function computeFootprintsForEachRpcWithOrigin(): Promise<
  string[][]
> {
  const HEADER = ["Category Code", "Category Name", ...AGGREGATE_HEADERS];

  const RE = new ResultsEngine();
  RE.setEnvFactors(allEnvImpacts);

  const allResults = LL_COUNTRIES.map((country) => {
    RE.setCountry(country);
    RE.setRpcFactors(rpcFiles[country]);
    const diet = Object.entries(dietFiles[country]).map(
      ([code, [amount, retailWaste, consumerWaste]]) => ({
        code,
        amount,
        retailWaste,
        consumerWaste,
        organic: 0,
      })
    );

    const results = RE.computeFootprintsWithCategory(diet);
    if (results === null) return null;
    const categories = uniq([
      ...Object.keys(results[0]),
      ...Object.keys(results[1]),
    ]).sort();

    const csv = categories
      .map((categoryId) => {
        const [rpcFootprints, processFootprints, packagingFootprints] =
          results.map((x) => x[categoryId]);

        const footprints = expandedFootprints(
          rpcFootprints || ENV_FOOTPRINTS_ZERO,
          processFootprints || [0, 0, 0],
          packagingFootprints || [0, 0]
        );

        return [
          categoryId,
          `"${categoryNames[categoryId]}"`,
          ...footprints,
        ].join(",");
      })
      .join("\n");

    return [country, HEADER + "\n" + csv];
  })
    .filter((x) => x !== null)
    .map((x) => x!);

  return allResults;
}
