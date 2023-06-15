<script lang="ts">
import { defineComponent } from "vue";

import ChartGenerator from "@/components/ChartGenerator.vue";
import { downloadAsPlaintext } from "@/lib/csv-io";

import getImpactsPerRpc from "@/lib/verification/rpc-impacts-with-import";
import getImpactsPerDiet from "@/lib/verification/diet-impacts";
import getRpcsInDiet from "@/lib/verification/diet-rpc-breakdowns";

export default defineComponent({
  components: { ChartGenerator },

  data() {
    return {
      boundaryData: [] as [string, number][],
    };
  },

  methods: {
    async generateImpactsPerRpc() {
      const validationFilesPerCountry = await getImpactsPerRpc();
      validationFilesPerCountry.forEach(([country, csv]) => {
        downloadAsPlaintext(csv, country + "-rpc-impacts.csv");
      });
    },

    async generateImpactsPerDiet() {
      const validationFilesPerCountry = await getImpactsPerDiet();
      validationFilesPerCountry.forEach(([country, csv]) => {
        downloadAsPlaintext(csv, country + "-category-impacts.csv");
      });
    },

    async generateRpcsPerDiet() {
      const validationFilesPerCountry = await getRpcsInDiet();
      validationFilesPerCountry.forEach(([country, csv]) => {
        downloadAsPlaintext(csv, country + "-diet-breakdown.csv");
      });
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
        <button class="button button--accent" @click="generateImpactsPerRpc">
          RPC Verification
        </button>
        <button class="button button--accent" @click="generateImpactsPerDiet">
          Category Verification
        </button>
        <button class="button button--accent" @click="generateRpcsPerDiet">
          Diet Verification
        </button>
      </div>
      <ChartGenerator />
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
