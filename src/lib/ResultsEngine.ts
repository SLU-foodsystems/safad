import reduceDiet from "./rpc-reducer";

import {
  computeProcessFootprints,
  getProcessFootprintsSheet,
} from "./process-env-impact";

import rpcToSuaMapJson from "@/data/rpc-to-sua.json";
import foodsRecipes from "@/data/foodex-recipes.json";
import flattenEnvironmentalFootprints from "./env-impact-aggregator";
import { aggregateRpcCategories, mapValues, vectorsSum } from "./utils";

const recipes = foodsRecipes.data as unknown as FoodsRecipes;
const rpcToSuaMap = rpcToSuaMapJson as Record<string, string>;

const ENV_IMPACT_ZERO = Array.from({ length: 16 }).map((_) => 0);

/**
 * Ties all parts of computing the results into a singleton.
 */
class ResultsEngine {
  envFootprintsPerOrigin: EnvOriginFactors | null = null;
  flatEnvFootprints: EnvFootprints | null = null;

  rpcParameters: RpcFactors | null = null;

  country: string | null = null;
  processEnvSheet: Record<string, number[]> | null = null;

  factorsOverrides: FactorsOverrides = {
    mode: "absolute",
    productionWaste: null,
    retailWaste: null,
    consumerWaste: null,
    techincalImprovement: null,
  };

  private recomputeEnvFootprints() {
    if (!this.envFootprintsPerOrigin) {
      console.info(
        "Method recomputeEnvFootprints called before footprints file was set."
      );
      return;
    }

    if (!this.rpcParameters) {
      console.info(
        "Method recomputeEnvFootprints called before rpcFactors were set."
      );
      return;
    }

    this.flatEnvFootprints = flattenEnvironmentalFootprints(
      this.envFootprintsPerOrigin,
      this.rpcParameters,
      "conventional"
    );
  }

  // Replace the conventional environmental factors with a new set.
  public setEnvFactors(conventional: EnvOriginFactors) {
    this.envFootprintsPerOrigin = conventional;
    this.recomputeEnvFootprints();
  }

  private getRpcFootprints(
    rpcCode: string,
    amountGram: number
  ): null | number[] {
    if (!this.flatEnvFootprints) {
      throw new Error("getEnvImpact called before sheets were assigned.");
    }

    if (!this.rpcParameters) {
      throw new Error(
        "getEnvImpact called before rpcParameters were assigned."
      );
    }

    const suaCode = rpcToSuaMap[rpcCode];
    if (suaCode === "0") {
      return ENV_IMPACT_ZERO;
    }

    if (!suaCode) {
      // console.warn(`No SUA code found for rpc ${rpcCode}`);
      return null;
    }

    if (!this.flatEnvFootprints[suaCode]) {
      console.warn("Missing factors for " + rpcCode);
      return ENV_IMPACT_ZERO;
    }

    return this.flatEnvFootprints[suaCode].map((x) => (x * amountGram) / 1000);
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
    this.processEnvSheet = getProcessFootprintsSheet(country);
  }

  public isReady() {
    return (
      this.processEnvSheet !== null && this.envFootprintsPerOrigin !== null
    );
  }

  public computeFootprints(
    diet: Diet
  ):
    | null
    | [Record<string, number[]>, Record<string, Record<string, number[]>>] {
    if (!this.envFootprintsPerOrigin) {
      console.error(
        "Compute called when no environmentalFactorsSheet was set."
      );
      return null;
    }

    if (!this.country || !this.processEnvSheet) {
      console.error("Compute called when no country or process was set.");
      return null;
    }

    const [rpcs, processes] = reduceDiet(diet, recipes);

    const rpcImpact = Object.fromEntries(
      rpcs
        .map(([rpc, amountGram]) => [
          rpc,
          this.getRpcFootprints(rpc, amountGram),
        ])
        .filter((x) => x[1] !== null)
    );

    // Per-process impacts
    const processesEnvImpacts = computeProcessFootprints(
      processes,
      this.processEnvSheet
    );

    return [rpcImpact, processesEnvImpacts];
  }

  public computeFootprintsWithCategory(diet: Diet) {
    const impacts = this.computeFootprints(diet);
    if (!impacts) return null;

    const [rpcImpact, processImpacts] = impacts;

    const rpcImpactsByCategory = aggregateRpcCategories(rpcImpact, 1);

    const processImpactsByCategory = mapValues(
      processImpacts,
      (perCategoryProcesses) => vectorsSum(Object.values(perCategoryProcesses))
    );

    return [rpcImpactsByCategory, processImpactsByCategory];
  }

  // Necessary for testing.
  public reset() {
    this.rpcParameters = null;
    this.envFootprintsPerOrigin = null;
  }
}

const singleton = new ResultsEngine();
export default singleton;
