<script lang="ts">
import { defineComponent, type PropType } from "vue";
import BoundariesChart from "@/lib/charts/BoundariesChart";
import downloadSvgAsImage from "@/lib/charts/d3-exporter";
import { computeFootprintsForDiets } from "@/lib/verification/diet-impacts";

import { PLANETARY_BOUNDARY_LIMITS } from "@/lib/constants";

const countries = [
  "France",
  "Germany",
  "Greece",
  "Ireland",
  "Italy",
  "Spain",
  "Sweden",
  "SwedenBaseline",
];

// Account for insufficient reporting
const SCALEUP_FACTOR = 1.2;

export default defineComponent({
  props: {
    envFactors: Object as PropType<EnvOriginFactors>,
  },

  data() {
    return {
      countries,
    };
  },

  watch: {
    envFactors: 'run',
  },

  methods: {
    async run() {
      const countriesAndDiets = await computeFootprintsForDiets(this.envFactors);
      const limits = PLANETARY_BOUNDARY_LIMITS as Record<string, number>;
      const names: Record<string, string> = {
        co2e: "Carbon Dioxide Equivalents",
        p: "P Application",
        n: "N Application",
        land: "Land Use",
        h2o: "Water",
        biodiversity: "Extinction Rate",
      };

      countriesAndDiets.forEach(async ([country, dataByCategory]) => {
        const totalFootprints = dataByCategory
          .map((row) => ({
            co2e: parseFloat(row[2]),
            land: parseFloat(row[13]),
            n: parseFloat(row[14]),
            p: parseFloat(row[15]),
            h2o: parseFloat(row[16]),
            biodiversity: parseFloat(row[18]),
          }))
          .map((x) => Object.entries(x))
          .reduce((acc, curr) => {
            if (acc.length === 0) return curr;
            return acc.map((entry, i) => [entry[0], entry[1] + curr[i][1]]);
          }, []);

        const chartData = totalFootprints
          .map(([axis, absoluteValue]) => {
            const limitValue = limits[axis];
            if (!limitValue) {
              console.error(`Can't find limit for axis ${axis}.`);
              return null;
            }

            const value = (SCALEUP_FACTOR * absoluteValue) / limitValue;

            return { axis: names[axis], value };
          })
          .filter((x) => x !== null)
          .map((x) => x!); // Fucking typescript

        const divSelector = `.boundaries-charts-container [data-country='${country}']`;
        BoundariesChart(divSelector, [chartData], { maxValue: 8 });
      });
    },

    downloadSvgs() {
      const divSelector = `.boundaries-charts-container div[data-country]`;

      const divs = this.$el.querySelectorAll(divSelector);
      [...divs].map((div) => {
        const country = div.getAttribute("data-country");
        const svg = div.querySelector("svg");
        downloadSvgAsImage(svg, `${country}-chart`, {});
      });
    },
  },

  mounted() {
    this.run();
  },
});
</script>

<template>
  <div class="cluster">
    <div class="center">
      <button class="button" @click="downloadSvgs">Download Charts</button>
    </div>
    <div class="boundaries-charts-container">
      <div v-for="c in countries" :data-country="c" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "../styles/constants";

.boundaries-charts-container>div {
  &::before {
    content: attr(data-country);
    display: block;
    margin-top: 3em;
    font-weight: bold;
    font-size: 1.5em;
  }
}
</style>
