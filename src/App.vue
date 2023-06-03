<script lang="ts">
import { defineComponent } from "vue";

import namesJson from "@/data/rpc-names.json";
import categoryNamesJson from "@/data/category-names.json"

import ChartContainer from "@/components/ChartContainer.vue";
import getBenchmark from "@/lib/diet-benchmarker";

import { downloadAsPlaintext } from "@/lib/csv-io";

const categoryNames = categoryNamesJson as Record<string, string>;
const getCategoryName = (code: string, level: number) => {
  const levelCode = code.substring(0, 4 + (level - 1) * 3);
  return categoryNames[levelCode] || `NOT FOUND (${levelCode})`;
}

const BENCHMARK_HEADERS = [
  "Total CO2e",
  "Total CO2",
  "Total CH4: Fossil",
  "Total CH4: Biogenic",
  "Total N2O",
  "Carbon_Footprint",
  "Carbon_Dioxide",
  "Methane_fossil",
  "Methane_bio",
  "Nitrous_Oxide",
  "HFC",
  "Land",
  "N_input",
  "P_input",
  "Water",
  "Pesticides",
  "Biodiversity",
  "Ammonia",
  "Labour",
  "Animal_Welfare",
  "Antibiotics",
  "Process CO2e",
  "Process CO2",
  "Process CH4",
  "Process N2O",
  "Processes",
];

const maybeQuoteValue = (str: string) =>
  str && str.includes(",") ? `"${str}"` : str;

export default defineComponent({
  components: { ChartContainer },

  data() {
    return {};
  },

  methods: {
    run() {
      let LL_COUNTRIES = [
        "France",
        "Germany",
        "Greece",
        "Hungary",
        "Ireland",
        "Italy",
        "Poland",
        "Spain",
        "Sweden",
        "RoW",
      ];
      LL_COUNTRIES = ["Spain"];
      const names = namesJson as Record<string, string>;

      LL_COUNTRIES.forEach((country) => {
        const [benchmark, failedRpcs] = getBenchmark(country);
        const rpcs = Object.keys(benchmark);

        const header = [
          "Code",
          "Name",
          "L1 Category",
          "L2 Category",
          ...BENCHMARK_HEADERS,
        ];
        const impactsCsv = rpcs
          .sort()
          .sort((a, b) => b.length - a.length)
          .map((rpc) =>
            [
              rpc,
              maybeQuoteValue(names[rpc]) || "NAME NOT FOUND",
              getCategoryName(rpc, 1),
              getCategoryName(rpc, 2),
              ...benchmark[rpc],
            ].join(",")
          )
          .join("\n");

        const failedCsv = [...Object.keys(failedRpcs)]
          .sort()
          .sort((a, b) => a.length - b.length)
          .map((rpc) => [rpc, maybeQuoteValue(names[rpc]), failedRpcs[rpc].join(" ")].join(","))
          .join("\n");

        console.log(impactsCsv);

        //downloadAsPlaintext(
          //header.join(",") + "\n" + impactsCsv,
          //country + ".csv"
        //);
        //downloadAsPlaintext("Code,Name\n" + failedCsv, country + "-failed.csv");
      });
    },
  },

  mounted() {
    this.run();
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
