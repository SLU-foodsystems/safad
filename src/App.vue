<script lang="ts">
import { defineComponent } from "vue";
import reduceDiet from "./lib/rpc-reducer";
import foodsRecipes from "./data/foodex-recipes.json";

import rpcFactors from "./data/rpc-factors.json";
import envFactors from "./data/env-factors.json";
import aggregateEnvImpactsSheet from "./lib/env-impact-aggregator";
import computeProcessesFootprints from "./lib/process-env-impact";

export default defineComponent({
  data() {
    return {};
  },

  methods: {
    run() {
      // Input files are:
      // - Diet
      // - rpc factors (rpc, origin, origin-%, waste)
      //
      // Static files:
      // - Env impacts
      // - Recipes

      const diet = [
        // food, amount, organic, consumerWaste, retailWaste
        ["A.01.06.001.004", 2000, 10, 10, 33],
        ["A.01.07.001.006", 1000, 50, 20, 0],
        ["I.14.07.001.002", 500, 0, 30, 0],
      ].map((x) => ({
        code: x[0] as string,
        amount: x[1] as number,
        organic: x[2] as number,
        consumerWaste: x[3] as number,
        retailWaste: x[4] as number,
      }));
      const recipes = foodsRecipes.data as unknown;

      type FoodsRecipe = [string, string, number, number][];
      type FoodsRecipes = { [foodexCode: string]: FoodsRecipe };
      const [rpcs, processes] = reduceDiet(diet, recipes as FoodsRecipes);

      type EnvImpactEntry = { [originCode: string]: EnvFactors };
      interface EnvImpacts {
        [rpcCode: string]: EnvImpactEntry;
      }

      interface RPCFactors {
        [rpcCode: string]: {
          [originCode: string]: [number, number];
        };
      }

      const envSheet = aggregateEnvImpactsSheet(
        envFactors.data as unknown as EnvImpacts,
        rpcFactors.data as unknown as RPCFactors
      );

      const rpcImpact = Object.fromEntries(
        rpcs.map(([rpc, amount]) => [rpc, envSheet[rpc].map((k) => k * amount)])
      );

      const processesEnvImpact = computeProcessesFootprints(
        processes,
        [1, 1, 1, 1]
      );

      console.log(rpcs, rpcImpact);
      console.log(processesEnvImpact);
    },
  },
});
</script>

<template>
  <section class="start-page">
    <div class="stack u-tac">
      <div class="cluster cluster--center">
        <img src="../assets/slu-logo.svg" class="start-page__logo" />
      </div>
      <h2>SLU Foods Benchmarker</h2>
      <div class="cluster cluster--center">
        <button class="button button--accent" @click="run">Run &gt;</button>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@import "styles/constants";

.start-page {
  grid-row-start: sidebar-start;
  grid-column-start: sidebar-start;
  grid-row-end: results-end;
  grid-column-end: results-end;

  height: 100%;
  width: 100%;

  display: flex;
  justify-content: center;
  align-items: center;

  > div {
    flex-basis: 30em;
  }

  select {
    width: 20em;
    flex-grow: 1;
  }
}

.start-page__logo {
  width: auto;
  height: 4em;
  margin: 0 auto;
  margin-bottom: 2em;
}
</style>
