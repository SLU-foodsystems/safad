/**
 * Computes the footprints of each rpc in the recipe.
 */

import reduceDiet from "@/lib/rpc-reducer";
import ResultsEngine from "@/lib/ResultsEngine";

import allEnvImpactsJson from "@/data/env-factors.json";
import foodsRecipesJson from "@/data/foodex-recipes.json";
import rpcNamesJson from "@/data/rpc-names.json";

import franceDiet from "@/data/diets/France.json";
import germanyDiet from "@/data/diets/Germany.json";
import greeceDiet from "@/data/diets/Greece.json";
import hungaryDiet from "@/data/diets/Hungary.json";
import irelandDiet from "@/data/diets/Ireland.json";
import italyDiet from "@/data/diets/Italy.json";
import spainDiet from "@/data/diets/Spain.json";
import swedenDiet from "@/data/diets/Sweden.json";
import swedenBaselineDiet from "@/data/diets/SwedenBaseline.json";

import processesAndPackagingData from "@/data/processes-and-packaging.json";
import { emissionsFactorsEnergy, emissionsFactorsPackaging } from "../default-files-importer";

const recipes = foodsRecipesJson.data as unknown as FoodsRecipes;
const allEnvImpacts = allEnvImpactsJson.data as unknown as EnvFactors;
const rpcNames = rpcNamesJson as Record<string, string>;

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

export default async function computeFootprintsForEachRpcWithOrigin(): Promise<
  string[][]
> {
  const HEADER = [
    "Code",
    "Name",
    "Amount",
    "Breaks down into code",
    "Name",
    "Amount",
  ];

  const RE = new ResultsEngine();
  RE.setEnvFactors(allEnvImpacts);
  RE.setEmissionsFactorsPackaging(await emissionsFactorsPackaging());
  RE.setEmissionsFactorsEnergy(await emissionsFactorsEnergy());

  const allResults = LL_COUNTRIES.map((country) => {
    const subDiets = Object.entries(dietFiles[country])
      .map(([code, [amount, retailWaste, consumerWaste]]) => ({
        code,
        amount,
        retailWaste,
        consumerWaste,
      }))
      .map((d) => [
        d.code,
        d.amount,
        reduceDiet([d], recipes, processesAndPackagingData)[0],
      ]);

    const subDietRows: string[] = [];
    subDiets.forEach(([code, amount, rpcs]) => {
      const rpcs_ = rpcs as [string, number][];
      const code_ = code as string;
      rpcs_.forEach(([rpcCode, rpcAmount]) => {
        subDietRows.push(
          [
            code,
            `"${rpcNames[code_]}"`,
            amount,
            rpcCode,
            `"${rpcNames[rpcCode]}"`,
            rpcAmount,
          ].join(",")
        );
      });
    });

    const csv = subDietRows.join("\n");
    return [country, HEADER.join(",") + "\n" + csv];
  });

  return allResults;
}
