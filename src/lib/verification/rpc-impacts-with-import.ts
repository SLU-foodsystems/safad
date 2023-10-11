/**
 * Computes the impacts of each RPC in the recipe.
 */

import {
  getRpcCodeSubset,
  listAllProcesses,
  maybeQuoteValue,
} from "@/lib/utils";
import { AGGREGATE_HEADERS, aggregateImpacts } from "@/lib/impacts-csv-utils";

import allEnvImpactsJson from "@/data/env-factors.json";
import categoryNamesJson from "@/data/category-names.json";
import foodsRecipesJson from "@/data/foodex-recipes.json";
import namesJson from "@/data/rpc-names.json";
import wasteFactorsJson from "@/data/waste-factors.json";

import ResultsEngine from "@/lib/ResultsEngine";
import { LL_COUNTRY_CODES } from "../constants";

const foodsRecipes = foodsRecipesJson.data as unknown as FoodsRecipes;
const allEnvImpacts = allEnvImpactsJson.data as unknown as EnvFactors;
const wasteFactors = wasteFactorsJson as Record<
  string,
  Record<string, number[]>
>;

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

const rpcFiles = {
  France: import("@/data/rpc-parameters/France-rpc.json"),
  Germany: import("@/data/rpc-parameters/Germany-rpc.json"),
  Greece: import("@/data/rpc-parameters/Greece-rpc.json"),
  Hungary: import("@/data/rpc-parameters/Hungary-rpc.json"),
  Ireland: import("@/data/rpc-parameters/Ireland-rpc.json"),
  Italy: import("@/data/rpc-parameters/Italy-rpc.json"),
  Spain: import("@/data/rpc-parameters/Spain-rpc.json"),
  Sweden: import("@/data/rpc-parameters/Sweden-rpc.json"),
  SwedenBaseline: import("@/data/rpc-parameters/Sweden-rpc.json"),
} as unknown as Record<LlCountryName, Promise<{ data: RpcFactors }>>;

const categoryNames = categoryNamesJson as Record<string, string>;
const getCategoryName = (code: string, level: number) => {
  const levelCode = getRpcCodeSubset(code, level);
  return categoryNames[levelCode] || `NOT FOUND (${levelCode})`;
};

const codesInRecipes = Object.keys(foodsRecipes);

const getWasteFactors = (country: string, rpcCode: string) => {
  const [retailWaste, consumerWaste] = wasteFactors[country][
    getRpcCodeSubset(rpcCode, 2)
  ] || [0, 0];
  return { retailWaste, consumerWaste };
};

export default async function computeFootprintsForEachRpcWithOrigin(
  envFactors?: EnvFactors
): Promise<string[][]> {
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
    if (country === "SwedenBaseline") {
      RE.setCountryCode("SE");
    } else {
      RE.setCountryCode(LL_COUNTRY_CODES[country]);
    }

    RE.setRpcFactors(rpcParameters);

    const diets = codesInRecipes.map((code) => [
      {
        code,
        amount: 1000,
        ...getWasteFactors(country, code),
      },
    ]);

    const impactsPerDiet = diets
      .map((diet) => {
        const rpc = diet[0].code;
        const impacts = RE.computeImpacts(diet);
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

        const combinedWaste =
          ((1 + diet[0].retailWaste) * (1 + diet[0].consumerWaste)) - 1;

        return [
          rpc,
          maybeQuoteValue(names[rpc] || "NAME NOT FOUND"),
          maybeQuoteValue(getCategoryName(rpc, 1)),
          maybeQuoteValue(getCategoryName(rpc, 2)),
          combinedWaste.toFixed(2),
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

    return [country, header.join(",") + "\n" + impactsCsv];
  });

  return results;
}
