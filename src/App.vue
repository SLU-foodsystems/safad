<script lang="ts">
import { defineComponent } from "vue";

import ChartContainer from "@/components/ChartContainer.vue";
import { downloadAsPlaintext } from "@/lib/csv-io";
import generateValidationFiles from "@/lib/validation/rpc-with-import";
import ResultsEngine from "@/lib/ResultsEngine";
import { expandedFootprints } from "@/lib/footprints-aggregator";
import { uniq } from "./lib/utils";
import { ENV_FOOTPRINTS_ZERO } from "./lib/constants";

import namesJson from "@/data/category-names.json";

export default defineComponent({
  components: { ChartContainer },

  data() {
    return {
      boundaryData: [] as [string, number][],
    };
  },

  methods: {
    async downloadVerificationFiles() {
      const validationFilesPerCountry = await generateValidationFiles();
      validationFilesPerCountry.forEach(([country, csv]) => {
        downloadAsPlaintext(csv, country + ".csv");
      });
    },

    async run() {
      const envFactors = (await import("@/data/env-factors.json")).data;
      const rpcFactors = (await import("@/data/rpc-parameters/Sweden-rpc.json"))
        .data as unknown as RpcFactors;
      const swedishDiet = (await import("@/data/diets/Sweden.json")).default;

      const RE = new ResultsEngine();
      RE.setEnvFactors(envFactors);
      RE.setRpcFactors(rpcFactors);
      RE.setCountry("Sweden");

      const diet = Object.entries(swedishDiet).map(
        ([code, [amount, retailWaste, consumerWaste]]) => ({
          code,
          amount,
          retailWaste,
          consumerWaste,
          organic: 0,
        })
      );

      console.log(diet)

      const results = RE.computeFootprintsWithCategory(diet);
      if (results === null) return;
      const categories = uniq([
        ...Object.keys(results[0]),
        ...Object.keys(results[1]),
      ]);

      const categoryNames = namesJson as Record<string, string>;
      console.log(categoryNames);

      const totals = categories.map((key) => {
        const rpcFootprints = results[0][key];
        const processFootprints = results[1][key];
        return [
          key,
          expandedFootprints(
            rpcFootprints || ENV_FOOTPRINTS_ZERO,
            processFootprints || [0, 0, 0]
          ),
        ];
      });

      const footprints = totals.map(([key, footprints]) => {
        return [
          key,
          {
            co2e: footprints[0],
            land: footprints[11],
            n: footprints[12],
            p: footprints[13],
            h2o: (footprints[14] as number) * 365,
            biodiversity: footprints[16],
          },
        ];
      });

      const totalFootprints = footprints
        .map(([_key, footprints]) => Object.entries(footprints))
        .reduce((acc, curr) => {
          if (acc.length === 0) return curr;
          return acc.map((entry, i) => [entry[0], entry[1] + curr[i][1]]);
        }, []);

      console.log(footprints);
      console.log(totalFootprints);

      this.boundaryData = totalFootprints as [string, number][];

      // 1. Get the env impacts and the rpc factors.
      // 2. Add them to the ResultsEngine
      // 3. get results by category:
      // - List every group, and aggregate over them
      // - Add one row with "category = SUM"
      // 4. Extract the 6 important metrics, and export plots
      // - The PlotManager (or a vue component?) will recieve:
      // - the six footprints as a total - for the boundary graph
      // - the six footprints for each category (and total?) - for the categories
      // - the amounts to extract in kilo
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
        <button
          class="button button--accent"
          @click="downloadVerificationFiles"
        >
          Download Verification Files
        </button>
        <button class="button" @click="run">Run &gt;</button>
      </div>
      <ChartContainer :boundaryData="boundaryData" />
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
