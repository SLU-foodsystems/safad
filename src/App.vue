<script lang="ts">
import { defineComponent } from "vue";

import ChartContainer from "@/components/ChartContainer.vue";
import { downloadAsPlaintext } from "@/lib/csv-io";
import generateValidationFiles from "@/lib/validation/rpc-with-import";


export default defineComponent({
  components: { ChartContainer },

  methods: {
    async run() {
      const results = await generateValidationFiles();
      results.forEach(([country, csv]) => {
        downloadAsPlaintext(csv, country + ".csv");
      });
    },
  },

  mounted() {
    //this.run();
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
