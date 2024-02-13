<script setup lang="ts">
import { debounce, sum } from "@/lib/utils";
import StackedBarChart from "@/lib/charts/StackedBarChart";
import { useOnResize } from "@/lib/use-on-resize";
import { onMounted, ref, watch } from "vue";

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

const canvasEl = ref<HTMLDivElement | null>(null);
const drawChart = () => {
  if (props.data.length === 0 || !canvasEl.value) return;
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

  // Standard values
  let [width, height] = [800, 500];
  if (canvasEl.value) {
    const svg = canvasEl.value.querySelector("svg");
    if (svg) {
      canvasEl.value.removeChild(svg);
    }

    const rect = canvasEl.value.getBoundingClientRect();

    width = rect.width;
    height = rect.width * 0.6;
  }

  StackedBarChart(canvasEl.value, data, columns, {
    maxValue,
    width,
    height,
    labelLayout: "offset",
    axisLabels: {
      y: "kg CO<sup>2</sup>e per kg",
    },
  });
};

watch(() => props.data, drawChart);

const labels = Object.keys(dataMap);

useOnResize(debounce(drawChart, 200));

onMounted(() => drawChart());
</script>

<template>
  <div class="carbon-footprints-chart">
    <div class="carbon-footprints-chart__labels">
      <p v-for="label in labels" v-text="label"></p>
    </div>
    <div class="carbon-footprints-chart__canvas" ref="canvasEl"></div>
  </div>
</template>

<style lang="scss">
.carbon-footprints-chart {
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-end;
  //padding: 1em;
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
  flex-grow: 1;
  flex-shrink: 0;
}
</style>
