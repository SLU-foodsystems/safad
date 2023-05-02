<script lang="ts">
import { defineComponent } from "vue";
import RadarChart from "../lib/charts/RadarChart";

export default defineComponent({
  data() {
    return {
      exportHandler: () => {},
    };
  },

  mounted() {
    const data = [
      [
        //iPhone
        { axis: "GHG Emissions", value: 1.22 },
        { axis: "Cropland Use", value: 2.28 },
        { axis: "N Application", value: 2.29 },
        { axis: "P Application", value: 0.77 },
        { axis: "Water Use", value: 2.22 },
        { axis: "Extinction Rate", value: 0.92 },
      ],
    ];
    const x = RadarChart(".chart-container", data, { maxValue: 1 });
    this.exportHandler = () => x.exportAsPng("radar-chart");
  },
});
</script>

<template>
  <div class="chart-container" @click="exportHandler"></div>
</template>

<style lang="scss" scoped>
@import "../styles/constants";
</style>
