<script lang="ts">
import { defineComponent } from "vue";

import ChartContainer from "./components/ChartContainer.vue";

import { aggregateRpcCategories, vectorSums } from "./lib/utils";

import rpcFactors from "./data/rpc-factors.json";
import envFactors from "./data/env-factors.json";

import ResultsEngine from "./lib/ResultsEngine";

export default defineComponent({
  components: { ChartContainer },

  data() {
    return {};
  },

  methods: {
    run() {
      ResultsEngine.setEnvFactors(
        envFactors.data as unknown as EnvOriginFactors,
        envFactors.data as unknown as EnvOriginFactors
      );
      ResultsEngine.setRpcFactors(rpcFactors.data as unknown as RpcFactors);

      const diet = [
        // food, amount, consumerWaste, retailWaste
        ["A.01.06.001.004", 2000, 10, 33],
        ["A.01.07.001.006", 1000, 20, 0],
        ["I.14.07.001.002", 500, 30, 0],
      ].map((x) => ({
        code: x[0] as string,
        amount: x[1] as number,
        consumerWaste: x[2] as number,
        retailWaste: x[3] as number,
      }));

      const results = ResultsEngine.computeFootprints(diet);
      if (results !== null) {
        const [rpcImpacts, processesEnvImpacts] = results;
        console.log(rpcImpacts);
        console.log(processesEnvImpacts);

        const totalRpcImpacts = vectorSums(Object.values(rpcImpacts));
        const totalProcessesImpacts = vectorSums(
          Object.values(processesEnvImpacts)
        );
        const totalImpacts = totalRpcImpacts.map((x, i) =>
          i < totalProcessesImpacts.length ? x + totalProcessesImpacts[i] : x
        );
        console.log(totalImpacts);

        const categoryImpacts = aggregateRpcCategories(rpcImpacts);
        console.log(categoryImpacts)
        // TODO: Plug these results into the graphs!
      }
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
      <ChartContainer />
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

  >div {
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
