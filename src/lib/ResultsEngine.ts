import reduceDiet from "./rpc-reducer";

import foodsRecipes from "@/data/foodex-recipes.json";
import computeProcessesFootprints from "./process-env-impact";
import aggregateEnvImpacts from "./env-impact-aggregator";

const recipes = foodsRecipes.data as unknown as FoodsRecipes;

/**
 * Ties all parts of computing the results into a singleton.
 * TODO: Once tests are ready for this, we will want to extend
 *       with conventional and organic environmental factors.
 */
class ResultsEngine {
  envFactors: EnvOriginFactors | null = null;
  rpcFactors: RpcFactors | null = null;

  environmentalFactorsSheet: EnvFootprints | null = null;

  // Replace the base environmental factors with a new set.
  public setBaseEnvFactors(envFactors: EnvOriginFactors) {
    this.envFactors = envFactors;
    this.recomputeEnvSheet();
  }

  // Set the rpc-factors, i.e. the origin of each rpc, its share, and its
  // production waste.
  public setRpcFactors(rpcFactors: RpcFactors) {
    this.rpcFactors = rpcFactors;
    this.recomputeEnvSheet();
  }

  public recomputeEnvSheet() {
    if (!this.envFactors || !this.rpcFactors) {
      return;
    }

    this.environmentalFactorsSheet = aggregateEnvImpacts(
      this.envFactors,
      this.rpcFactors
    );
  }

  public isReady() {
    return this.environmentalFactorsSheet !== null;
  }

  public computeFootprints(
    diet: Diet
  ): [Record<string, number[]>, Record<string, number[]>] | null {
    if (!this.environmentalFactorsSheet) {
      console.error(
        "Compute called when no environmentalFactorsSheet was set."
      );
      return null;
    }

    const [rpcs, processes] = reduceDiet(diet, recipes);

    // TODO: Check if environmentalFactorsSheet is set.
    const envSheet = this.environmentalFactorsSheet!;
    const rpcImpact = Object.fromEntries(
      rpcs.map(([rpc, amount]) => [rpc, envSheet[rpc].map((k) => k * amount)])
    );

    const processesEnvImpact = computeProcessesFootprints(
      processes,
      [1, 1, 1, 1]
    );

    return [rpcImpact, processesEnvImpact];
  }

  // Necessary for testing.
  public reset() {
    this.rpcFactors = null;
    this.envFactors = null;
  }
}

const singleton = new ResultsEngine();
export default singleton;
