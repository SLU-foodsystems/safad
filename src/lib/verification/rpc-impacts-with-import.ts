/**
 * Computes the footprints of each rpc in the recipe.
 */

import {
  getRpcCodeSubset,
  listAllProcesses,
  maybeQuoteValue,
} from "@/lib/utils";
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
  const levelCode = getRpcCodeSubset(code, level);
  return categoryNames[levelCode] || `NOT FOUND (${levelCode})`;
};

const codesInRecipes = Object.keys(foodsRecipes);

export default async function computeFootprintsForEachRpcWithOrigin(envFactors?: EnvOriginFactors): Promise<
  string[][]
> {
  const header = [
    "Code",
    "Name",
    "L1 Category",
    "L2 Category",
    ...AGGREGATE_HEADERS,
    "Processes",
    "Packeting",
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

  const RE = new ResultsEngine();
  RE.setEnvFactors(envFactors || allEnvImpacts);

  const syncRpcFiles = await Promise.all(
    LL_COUNTRIES.map(
      async (country: LlCountryName): Promise<[string, RpcFactors]> => {
        const rpcParameters = (
          (await rpcFiles[country]) as unknown as { data: RpcFactors }
        ).data;
        return [country, rpcParameters];
      }
    )
  );

  const results = syncRpcFiles.map(([country, rpcParameters]) => {
    RE.setCountry(country);
    RE.setRpcFactors(rpcParameters);

    const impactsPerDiet = diets
      .map((diet) => {
        const rpc = diet[0].code;
        const footprints = RE.computeFootprints(diet);
        if (footprints === null) {
          return null;
        }
        const [rpcFootprints, processImpacts, packagingImpacts] = footprints;
        const processes = listAllProcesses(processImpacts).join("$");
        const packeting = listAllProcesses(packagingImpacts).join("$");

        return [
          rpc,
          maybeQuoteValue(names[rpc] || "NAME NOT FOUND"),
          maybeQuoteValue(getCategoryName(rpc, 1)),
          maybeQuoteValue(getCategoryName(rpc, 2)),
          ...aggregateFootprints(
            rpcFootprints,
            processImpacts,
            packagingImpacts
          ),
          processes,
          packeting,
        ];
      })
      .filter((x) => x !== null);

    const impactsCsv = impactsPerDiet.map((row) => row!.join(",")).join("\n");

    return [country, header.join(",") + "\n" + impactsCsv];
  });

  return results;
}
