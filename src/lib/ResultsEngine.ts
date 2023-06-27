import reduceDiet from "./rpc-reducer";

import { computeProcessImpacts, getProcessEnvFactors } from "./process-env-impact";

import rpcToSuaMapJson from "@/data/rpc-to-sua.json";
import foodsRecipes from "@/data/foodex-recipes.json";
import processesAndPackagingData from "@/data/processes-and-packaging.json";
import packetingEmissionsFactorsJson from "@/data/packeting-emissions-factors.json";
import flattenEnvironmentalFactors from "./env-impact-aggregator";
import { aggregateRpcCategories, mapValues, vectorsSum } from "./utils";
import { ENV_IMPACTS_ZERO } from "./constants";

const recipes = foodsRecipes.data as unknown as FoodsRecipes;
const rpcToSuaMap = rpcToSuaMapJson as Record<string, string>;
const packetingEmissionsFactors = packetingEmissionsFactorsJson as Record<
  string,
  number[]
>;

/**
 * Ties all parts of computing the results into a singleton.
 */
class ResultsEngine {
  envFactorsPerOrigin: EnvFactors | null = null;
  flatEnvImpacts: EnvImpacts | null = null;

  rpcParameters: RpcFactors | null = null;

  country: string | null = null;
  processEnvFactors: Record<string, number[]> | null = null;

  factorsOverrides: FactorsOverrides = {
    mode: "absolute",
    productionWaste: null,
    retailWaste: null,
    consumerWaste: null,
    techincalImprovement: null,
  };

  private recomputeEnvFootprints() {
    if (!this.envFactorsPerOrigin) {
      console.info(
        "Method recomputeEnvFootprints called before env factors file was set."
      );
      return;
    }

    if (!this.rpcParameters) {
      console.info(
        "Method recomputeEnvFootprints called before rpcFactors were set."
      );
      return;
    }

    this.flatEnvImpacts = flattenEnvironmentalFactors(
      this.envFactorsPerOrigin,
      this.rpcParameters,
      "conventional"
    );
  }

  // Replace the conventional environmental factors with a new set.
  public setEnvFactors(conventional: EnvFactors) {
    this.envFactorsPerOrigin = conventional;
    this.recomputeEnvFootprints();
  }

  private getRpcFootprints(
    rpcCode: string,
    amountGram: number
  ): null | number[] {
    if (!this.flatEnvImpacts) {
      throw new Error("getEnvImpact called before sheets were assigned.");
    }

    if (!this.rpcParameters) {
      throw new Error(
        "getEnvImpact called before rpcParameters were assigned."
      );
    }

    const suaCode = rpcToSuaMap[rpcCode];
    if (suaCode === "0") {
      return ENV_IMPACTS_ZERO;
    }

    if (!suaCode) {
      // console.warn(`No SUA code found for rpc ${rpcCode}`);
      return null;
    }

    if (!this.flatEnvImpacts[suaCode]) {
      // console.warn(`Missing factors for ${rpcCode} (${suaCode})`);
      return ENV_IMPACTS_ZERO;
    }

    return this.flatEnvImpacts[suaCode].map((x) => (x * amountGram) / 1000);
  }

  // Set the rpc-factors, i.e. the origin of each rpc, its share, and its
  // production waste.
  public setRpcFactors(rpcFactors: RpcFactors) {
    this.rpcParameters = rpcFactors;
    this.recomputeEnvFootprints();
  }

  public setFactorsOverrides(overrides: FactorsOverrides) {
    this.factorsOverrides = overrides;
  }

  public setCountry(country: string) {
    this.country = country;
    this.processEnvFactors = getProcessEnvFactors(country);
  }

  public isReady() {
    return this.processEnvFactors !== null && this.envFactorsPerOrigin !== null;
  }

  public computeImpacts(
    diet: Diet
  ):
    | null
    | [
        Record<string, number[]>,
        Record<string, Record<string, number[]>>,
        Record<string, Record<string, number[]>>
      ] {
    if (!this.envFactorsPerOrigin) {
      console.error(
        "Compute called when no environmentalFactorsSheet was set."
      );
      return null;
    }

    if (!this.country || !this.processEnvFactors) {
      console.error("Compute called when no country or process was set.");
      return null;
    }

    const [rpcAmounts, processesAmounts, packetingAmounts] = reduceDiet(
      diet,
      recipes,
      processesAndPackagingData
    );

    const rpcImpact = Object.fromEntries(
      rpcAmounts
        .map(([rpc, amountGram]) => [
          rpc,
          this.getRpcFootprints(rpc, amountGram),
        ])
        .filter((x) => x[1] !== null)
    );

    // Per-process impacts
    const processesEnvImpacts = computeProcessImpacts(
      processesAmounts,
      this.processEnvFactors
    );

    const packagingEnvImpacts = mapValues(packetingAmounts, (amounts) =>
      Object.fromEntries(
        Object.entries(amounts).map(([packetingId, amount]) => [
          packetingId,
          packetingEmissionsFactors[packetingId].map(
            (x) => (x * amount) / 1000
          ),
        ])
      )
    );

    return [rpcImpact, processesEnvImpacts, packagingEnvImpacts];
  }

  public computeImpactsByCategory(diet: Diet) {
    const impacts = this.computeImpacts(diet);
    if (!impacts) return null;

    const [rpcImpacts, processImpacts, packagingImpacts] = impacts;

    const rpcImpactsByCategory = aggregateRpcCategories(rpcImpacts, 1);
    const processImpactsByCategory = mapValues(
      processImpacts,
      (perCategoryProcesses) => vectorsSum(Object.values(perCategoryProcesses))
    );
    const packagingImpactsByCategory = mapValues(
      packagingImpacts,
      (perCategoryPackaging) => vectorsSum(Object.values(perCategoryPackaging))
    );

    return [
      rpcImpactsByCategory,
      processImpactsByCategory,
      packagingImpactsByCategory,
    ];
  }

  // Necessary for testing.
  public reset() {
    this.rpcParameters = null;
    this.envFactorsPerOrigin = null;
  }
}

export default ResultsEngine;
