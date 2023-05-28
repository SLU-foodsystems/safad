import { mapValues, vectorSums } from "@/lib/utils";
import foodsRecipesJson from "@/data/foodex-recipes.json";
import rpcToSuaMapJson from "@/data/rpc-to-sua.json";

import allEnvImpactsJson from "@/data/env-factors-flat.json";
import reduceDiet from "./rpc-reducer";
import { getProcessFootprintsSheet } from "./process-env-impact";

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
      .filter(([k, v]) => v !== undefined)
  );
}

const codesInRecipes = Object.keys(foodsRecipes);

function getRpcImpact(
  rpcCode: string,
  amountGram: number,
  envFactors: Record<string, number[]>
): number[] | null {
  const suaCode = rpcToSuaMap[rpcCode];
  if (suaCode === "0") {
    console.log("SUA was 0 for", rpcCode)
    return ENV_ZERO_IMPACT;
  }

  if (!suaCode) {
    // console.warn(`No SUA code found for rpc ${rpcCode}`);
    return null;
  }

  if (!(suaCode in envFactors)) {
    // console.warn(`No factors found for ${rpcCode}.`);
    return null;
  }

  return envFactors[suaCode].map((k) => (k * amountGram) / 1000);
}

function computeProcessFootprints(
  processAmountsMap: Record<string, Record<string, number>>,
  processFootprints: Record<string, number[]>
): Record<string, { [k: string]: number[] }> {
  return mapValues(processAmountsMap, (processAmounts) =>
    Object.fromEntries(
      Object.entries(processAmounts).map(([processId, amountGram]) => [
        processId,
        processFootprints[processId].map((x) => (x * amountGram) / 1000),
      ])
    )
  );
}

export default function getBenchmark(country: string): [Record<string, (number | string)[]>, Set<string>] {
  // TODO: Figure out the process stuff - my new way of thinking (intuitive?) is
  // at odds with how I had constructed it before.
  // And I might have to convert to kg here somewhere.
  const processesEnvImpacts = getProcessFootprintsSheet(country);
  const envImpacts = getFlattenedRpcFootprints(country);

  const diets = codesInRecipes.map((code) => ({
    code,
    amount: 1000,
    consumerWaste: 0,
    retailWaste: 0,
  }));

  const aggregateResults: Record<string, (number | string)[]> = {};
  const failedRpcs = new Set<string>();
  diets.forEach((diet) => {
    const [rpcs, processes] = reduceDiet([diet], foodsRecipes);

    const impacts = rpcs.map(([rpc, amountGram]) => [
      rpc,
      getRpcImpact(rpc, amountGram, envImpacts),
    ]);

    if (impacts.some(([k, v]) => v === null)) {
      const missingItems = impacts.filter((kv) => kv[1] === null).map(kv => kv[0])
      missingItems.forEach(rpc => failedRpcs.add(String(rpc)));
      // console.warn(
      //   `Diet for ${diet.code} failed for items: ${missingItems.join(", ")}`
      // );
      return;
    }

    const rpcFootprints = Object.fromEntries(impacts);
    const totalRpcFootprints = vectorSums(Object.values(rpcFootprints));
    // console.log(totalRpcFootprints)

    const processFootprints = computeProcessFootprints(
      processes,
      processesEnvImpacts
    );
    const processList = Object.values(processFootprints)
      .map((obj) => Object.keys(obj))
      .flat(1);
    const processValues = Object.values(processFootprints)
      .map((obj) => Object.values(obj))
      .flat(1);
    const totalProcessesFootprints = vectorSums(processValues);
    while (totalProcessesFootprints.length < 3) {
      totalProcessesFootprints.push(0);
    }

    aggregateResults[diet.code] = [
      ...totalRpcFootprints,
      ...totalProcessesFootprints,
      processList.join("$"),
    ];
  });

  return [aggregateResults, failedRpcs];
}
