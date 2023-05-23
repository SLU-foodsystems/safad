import reduceDiet from "./rpc-reducer";

import foodsRecipes from "@/data/foodex-recipes.json";
import computeProcessesFootprints from "./process-env-impact";
import aggregateEnvImpacts from "./env-impact-aggregator";
import { mapValues, vectorSum } from "./utils";

const recipes = foodsRecipes.data as unknown as FoodsRecipes;

const ENV_IMPACT_ZERO = Array.from({ length: 9 }).map((_) => 0);

const withWarn = <T>(message: string, val: T) => {
  console.warn(message);
  return val;
};

/**
 * Ties all parts of computing the results into a singleton.
 * TODO: Once tests are ready for this, we will want to extend
 *       with conventional and organic environmental factors.
 */
class ResultsEngine {
  organicEnvFactors: EnvOriginFactors | null = null;
  convEnvFactors: EnvOriginFactors | null = null;
  rpcFactors: RpcFactors | null = null;

  convEnvFactorsSheet: EnvFootprints | null = null;
  organicEnvFactorsSheet: EnvFootprints | null = null;

  // Replace the conventional environmental factors with a new set.
  public setEnvFactors(
    conventional: EnvOriginFactors,
    organic: EnvOriginFactors
  ) {
    this.convEnvFactors = conventional;
    this.organicEnvFactors = organic;
    this.recomputeEnvSheets();
  }

  private getEnvImpact(rpc: string, amountGram: number) {
    if (!this.convEnvFactorsSheet || !this.organicEnvFactorsSheet) {
      throw new Error("getEnvImpact called before sheets were assigned.");
    }

    const get = (sheet: EnvFootprints) =>
      rpc in sheet
        ? sheet[rpc].map((k) => (k * amountGram) / 1000)
        : withWarn("Missing factors for " + rpc, ENV_IMPACT_ZERO);

    return vectorSum(
      get(this.convEnvFactorsSheet),
      get(this.organicEnvFactorsSheet)
    );
  }

  public setOrganicEnvFactors(envFactors: EnvOriginFactors) {
    this.organicEnvFactors = envFactors;
    this.recomputeEnvSheets();
  }

  // Set the rpc-factors, i.e. the origin of each rpc, its share, and its
  // production waste.
  public setRpcFactors(rpcFactors: RpcFactors) {
    this.rpcFactors = rpcFactors;
    this.recomputeEnvSheets();
  }

  public recomputeEnvSheets() {
    if (!this.convEnvFactors || !this.organicEnvFactors || !this.rpcFactors) {
      return;
    }

    this.convEnvFactorsSheet = aggregateEnvImpacts(
      this.convEnvFactors,
      this.rpcFactors,
      "conventional"
    );
    this.organicEnvFactorsSheet = aggregateEnvImpacts(
      this.convEnvFactors,
      this.rpcFactors,
      "organic"
    );
  }

  public isReady() {
    return this.convEnvFactorsSheet !== null;
  }

  public computeFootprints(
    diet: Diet
  ): [Record<string, number[]>, Record<string, number[]>] | null {
    if (!this.convEnvFactorsSheet || !this.organicEnvFactorsSheet) {
      console.error(
        "Compute called when no environmentalFactorsSheet was set."
      );
      return null;
    }

    const [rpcs, processes] = reduceDiet(diet, recipes);

    const rpcImpact = Object.fromEntries(
      rpcs.map(([rpc, amountGram]) => [rpc, this.getEnvImpact(rpc, amountGram)])
    );

    const processEnvSheet = Array.from({ length: 7 }).map((_1) =>
      Array.from({ length: 4 }).map((_2) => Math.random() * 10)
    );

    // Per-process impacts
    const processesEnvImpacts = mapValues(processes, (p) =>
      computeProcessesFootprints(p, processEnvSheet)
    );

    const flatProcessAmounts: Record<string, number> = {};
    Object.values(processes).forEach((obj) => {
      Object.entries(obj).forEach(([k, v]) => {
        flatProcessAmounts[k] = (flatProcessAmounts[k] || 0) + v;
      });
    });
    const flatProcessImpacts = computeProcessesFootprints(
      flatProcessAmounts,
      processEnvSheet
    );

    return [rpcImpact, flatProcessImpacts];
  }

  // Necessary for testing.
  public reset() {
    this.rpcFactors = null;
    this.convEnvFactors = null;
    this.organicEnvFactors = null;
  }
}

const singleton = new ResultsEngine();
export default singleton;
