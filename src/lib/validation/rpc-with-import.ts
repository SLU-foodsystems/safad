/**
 * Computes the footprints of each rpc in the recipe.
 */

import { maybeQuoteValue } from "@/lib/utils";
import aggregateFootprints, {
  AGGREGATE_HEADERS,
} from "@/lib/footprints-aggregator";

import allEnvImpactsJson from "@/data/env-factors.json";
import categoryNamesJson from "@/data/category-names.json";
import foodsRecipesJson from "@/data/foodex-recipes.json";
import namesJson from "@/data/rpc-names.json";

import ResultsEngine from "@/lib/ResultsEngine";

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
  "Poland",
  "Spain",
  "Sweden",
];

const rpcFiles = {
  France: import("@/data/rpc-parameters/France-rpc.json"),
  Germany: import("@/data/rpc-parameters/Germany-rpc.json"),
  Greece: import("@/data/rpc-parameters/Greece-rpc.json"),
  Ireland: import("@/data/rpc-parameters/Ireland-rpc.json"),
  Italy: import("@/data/rpc-parameters/Italy-rpc.json"),
  Poland: import("@/data/rpc-parameters/Poland-rpc.json"),
  Spain: import("@/data/rpc-parameters/Spain-rpc.json"),
  Sweden: import("@/data/rpc-parameters/Sweden-rpc.json"),
} as unknown as Record<LlCountryName, Promise<{ data: RpcFactors }>>;

const categoryNames = categoryNamesJson as Record<string, string>;
const getCategoryName = (code: string, level: number) => {
  const levelCode = code.substring(0, 4 + (level - 1) * 3);
  return categoryNames[levelCode] || `NOT FOUND (${levelCode})`;
};

const codesInRecipes = Object.keys(foodsRecipes);

export default async function computeFootprintsForEachRpcWithOrigin(): Promise<
  string[][]
> {
  const header = [
    "Code",
    "Name",
    "L1 Category",
    "L2 Category",
    ...AGGREGATE_HEADERS,
  ];

  const names = namesJson as Record<string, string>;

  const diets = codesInRecipes.map((code) => [
    {
      code,
      amount: 1000,
      consumerWaste: 0,
      retailWaste: 0,
    },
  ]);

  ResultsEngine.setEnvFactors(allEnvImpacts);

  const results = await Promise.all(
    LL_COUNTRIES.map(async (country) => {
      const rpcParameters = (
        (await rpcFiles[country]) as unknown as { data: RpcFactors }
      ).data;
      ResultsEngine.setCountry(country);
      ResultsEngine.setRpcFactors(rpcParameters);

      const impactsPerDiet = diets
        .map((diet) => {
          const rpc = diet[0].code;
          const footprints = ResultsEngine.computeFootprints(diet);
          if (footprints === null) {
            return null;
          }
          const [rpcFootprints, processImpacts] = footprints;

          return [
            rpc,
            maybeQuoteValue(names[rpc] || "NAME NOT FOUND"),
            maybeQuoteValue(getCategoryName(rpc, 1)),
            maybeQuoteValue(getCategoryName(rpc, 2)),
            ...aggregateFootprints(rpcFootprints, processImpacts),
          ];
        })
        .filter((x) => x !== null);

      const impactsCsv = impactsPerDiet.map((row) => row!.join(",")).join("\n");

      return [country, header.join(",") + "\n" + impactsCsv];
    })
  );

  return results;
}
