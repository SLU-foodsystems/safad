<script lang="ts">
import { defineComponent } from "vue";
import RadarChart from "../lib/charts/RadarChart";

export default defineComponent({
  data() {
    return {};
  },



  mounted() {
    const data = [
      [
        //iPhone
        { axis: "GHG Emissions", value: 1.22 },
        { axis: "Cropland Use", value: 0.28 },
        { axis: "N Application", value: 1.29 },
        { axis: "P Application", value: 0.77 },
        { axis: "Water Use", value: 0.22 },
        { axis: "Extinction Rate", value: 0.92 },
      ],
    ];
    RadarChart(".chart-container", data, { maxValue: 1 });
  },
});
</script>

<template>
  <div class="chart-container"></div>
</template>

<style lang="scss" scoped>
@import "../styles/constants";
</style>
