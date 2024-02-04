<script setup lang="ts">
import { sum } from "@/lib/utils";
import StackedBarChart from "@/lib/charts/StackedBarChart";
import { onMounted, watch } from "vue";

// Code: aggregated impacts
type GraphData = [string, number[]][];

const props = defineProps<{
  data: GraphData;
}>();

const BASE_OFFSET = 5 /*combined*/ + 14;
// TODO: Alternatively, define labels and use index in header constant
const dataMap: Record<string, number> = {
  "Capital goods": BASE_OFFSET + 1,
  "Energy primary production": BASE_OFFSET + 3,
  "Enteric fermentation": BASE_OFFSET + 5,
  "Land use change": BASE_OFFSET + 4,
  "Manure management": BASE_OFFSET + 6,
  "Mineral fertiliser production": BASE_OFFSET + 0,
  "Primary production": 5,
  "Soil emissions": BASE_OFFSET + 2,
  Processing: 41,
  Packaging: 45,
  Transport: 50,
};

const drawChart = () => {
  if (props.data.length === 0) return;
  const data = props.data.map(([code, impactsArr]: [string, number[]]) => {
    const impactsObj = Object.fromEntries(
      Object.entries(dataMap).map(([k, idx]) => [k, impactsArr[idx]])
    );

    return {
      category: code,
      ...impactsObj,
    };
  });

  const columns = Object.keys(data[0]).filter((x) => x !== "category");

  const maxValue = Math.max(
    0,
    ...data.map((obj: Record<string, number | string>) =>
      sum(Object.values(obj).filter((v): v is number => typeof v === "number"))
    )
  );

  StackedBarChart(".carbon-footprints-chart__canvas", data, columns, {
    maxValue,
    width: 800,
    height: 500,
    margin: {
      top: 20,
      left: 50,
      right: 20,
      bottom: 20,
    },
    labelLayout: "offset",
    axisLabels: {
      y: "kg CO<sup>2</sup>e per kg",
    },
  });
};

watch(
  () => props.data,
  () => drawChart()
);

const labels = Object.keys(dataMap);

onMounted(() => {
  drawChart();
});
</script>

<template>
  <div class="carbon-footprints-chart">
    <div class="carbon-footprints-chart__labels">
      <p v-for="label in labels" v-text="label"></p>
    </div>
    <div class="carbon-footprints-chart__canvas"></div>
  </div>
</template>

<style lang="scss">
.carbon-footprints-chart {
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-end;
  background: white;
  padding: 1em;
  $base-box-shadow: 0 0.3em 0.75em -0.65em rgba(black, 0.5);
  box-shadow: $base-box-shadow;
}

.carbon-footprints-chart__labels {
  flex-basis: 20em;
  flex-grow: 0;
  flex-shrink: 1;
  min-width: 10em;

  p {
    margin-bottom: 0.5em;
  }
}
.carbon-footprints-chart__canvas {
  flex-basis: auto;
  flex-grow: 0;
  flex-shrink: 0;
}
</style>
