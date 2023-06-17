/**
 * Computes the footprints of each rpc in the recipe.
 */

import reduceDiet from "@/lib/rpc-reducer";
import { maybeQuoteValue } from "@/lib/utils";
import {
  computeProcessFootprints,
  getProcessFootprintsSheet,
} from "@/lib/process-env-impact";
import aggregateFootprints, { AGGREGATE_HEADERS } from "@/lib/footprints-aggregator";

import allEnvImpactsJson from "@/data/env-factors-flat.json";
import categoryNamesJson from "@/data/category-names.json";
import foodsRecipesJson from "@/data/foodex-recipes.json";
import rpcToSuaMapJson from "@/data/rpc-to-sua.json";
import namesJson from "@/data/rpc-names.json";
import processAndPackagingDataJson from "@/data/processes-and-packaging.json"

const processAndPackagingData = processAndPackagingDataJson as unknown as Record<string, Record<string, number[]>>;

const rpcToSuaMap = rpcToSuaMapJson as Record<string, string>;

const foodsRecipes = foodsRecipesJson.data as unknown as FoodsRecipes;

const allEnvImpacts = allEnvImpactsJson as Record<
  string,
  Record<string, number[]>
>;

const ENV_ZERO_IMPACT = Array.from({ length: 16 }).map((_) => 0);

function getFlattenedRpcFootprints(country: string) {
  return Object.fromEntries(
    Object.entries(allEnvImpacts)
      .map(([code, impactPerCountry]) => {
        return [code, impactPerCountry[country]];
      })
      .filter(([_k, v]) => v !== undefined)
  );
}

const categoryNames = categoryNamesJson as Record<string, string>;
const getCategoryName = (code: string, level: number) => {
  const levelCode = code.substring(0, 4 + (level - 1) * 3);
  return categoryNames[levelCode] || `NOT FOUND (${levelCode})`;
};

const codesInRecipes = Object.keys(foodsRecipes);

function getRpcImpact(
  rpcCode: string,
  amountGram: number,
  envFactors: Record<string, number[]>
): number[] | null {
  const suaCode = rpcToSuaMap[rpcCode];
  if (suaCode === "0") {
    // console.info("SUA was 0 for", rpcCode);
    return ENV_ZERO_IMPACT;
  }

  if (!suaCode) {
    // console.warn(`No SUA code found for rpc ${rpcCode}`);
    return null;
  }

  if (!(suaCode in envFactors)) {
    // console.warn(`No factors found for ${rpcCode} (SUA=${suaCode}).`);
    return null;
  }

  return envFactors[suaCode].map((k) => (k * amountGram) / 1000);
}

function getCountryBenchmark(
  country: string
): [Record<string, (number | string)[]>, Record<string, string[]>] {
  const processesEnvImpacts = getProcessFootprintsSheet(country);
  const envImpacts = getFlattenedRpcFootprints(country);

  const diets = codesInRecipes.map((code) => ({
    code,
    amount: 1000,
    consumerWaste: 0,
    retailWaste: 0,
  }));

  const aggregateResults: Record<string, (number | string)[]> = {};
  const failedRpcs: Record<string, string[]> = {};
  diets.forEach((diet) => {
    const [rpcs, processes] = reduceDiet([diet], foodsRecipes, {});

    const impacts = rpcs.map(([rpc, amountGram]) => [
      rpc,
      getRpcImpact(rpc, amountGram, envImpacts),
    ]);

    if (impacts.some(([_k, v]) => v === null)) {
      const missingItems = impacts
        .filter((kv) => kv[1] === null)
        .map((kv) => kv[0]);
      failedRpcs[diet.code as string] = missingItems as string[];

      // console.warn(
      //   `Diet for ${diet.code} failed for items: ${missingItems.join(", ")}`
      // );
      return;
    }

    const rpcFootprints = Object.fromEntries(impacts);

    const processFootprints = computeProcessFootprints(
      processes,
      processesEnvImpacts
    );

    aggregateResults[diet.code] = aggregateFootprints(
      rpcFootprints,
      processFootprints,
      processAndPackagingData
    );
  });

  return [aggregateResults, failedRpcs];
}

export default function getBenchmarks(countries: string[]) {
  const results: Record<string, [string, string]> = {};

  const header = [
    "Code",
    "Name",
    "L1 Category",
    "L2 Category",
    ...AGGREGATE_HEADERS,
  ];

  const names = namesJson as Record<string, string>;

  countries.forEach((country) => {
    const [benchmark, failedRpcs] = getCountryBenchmark(country);
    const rpcs = Object.keys(benchmark);

    const impactsCsv = rpcs
      .sort()
      .sort((a, b) => b.length - a.length)
      .map((rpc) =>
        [
          rpc,
          maybeQuoteValue(names[rpc]) || "NAME NOT FOUND",
          maybeQuoteValue(getCategoryName(rpc, 1)),
          maybeQuoteValue(getCategoryName(rpc, 2)),
          ...benchmark[rpc],
        ].join(",")
      )
      .join("\n");

    const failedCsv = [...Object.keys(failedRpcs)]
      .sort()
      .sort((a, b) => a.length - b.length)
      .map((rpc) =>
        [rpc, maybeQuoteValue(names[rpc]), failedRpcs[rpc].join(" ")].join(",")
      )
      .join("\n");

    results[country] = [
      header.join(",") + "\n" + impactsCsv,
      "Code,Name\n" + failedCsv,
    ];
  });

  return results;
}
