<script setup lang="ts">
import { debounce, sum } from "@/lib/utils";
import StackedBarChart from "@/lib/charts/StackedBarChart";
import { useOnResize } from "@/lib/use-on-resize";
import { onMounted, ref, watch } from "vue";
import { aggregateHeaderIndex } from "@/lib/impacts-csv-utils";

// Code: aggregated impacts
type GraphData = [string, number[]][];

const props = defineProps<{
  data: GraphData;
}>();

const dataMap: Record<string, number> = {
  "Capital goods": aggregateHeaderIndex("Capital goods (kg CO2e)"),
  "Energy primary production": aggregateHeaderIndex(
    "Energy primary production (kg CO2e)"
  ),
  "Enteric fermentation": aggregateHeaderIndex("Enteric fermentation (kg CO2e)"),
  "Land use change": aggregateHeaderIndex("Land use change (kg CO2e)"),
  "Manure management": aggregateHeaderIndex("Manure management (kg CO2e)"),
  "Mineral fertiliser production": aggregateHeaderIndex(
    "Mineral fertiliser production (kg CO2e)"
  ),
  "Primary production": aggregateHeaderIndex(
    "Energy primary production (kg CO2e)"
  ),
  "Soil emissions": aggregateHeaderIndex("Soil emissions (kg CO2e)"),
  Processing: aggregateHeaderIndex("Processing (kg CO2e)"),
  Packaging: aggregateHeaderIndex("Packaging (kg CO2e)"),
  Transport: aggregateHeaderIndex("Transports (kg CO2e)"),
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
      <p><strong>Emissions Source</strong></p>
      <p v-for="label in labels" v-text="label" data-color="#f0f"></p>
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

  @media (max-width: 40em) {
    flex-direction: column;
  }
}

.carbon-footprints-chart__labels {
  flex-basis: 20em;
  flex-grow: 0;
  flex-shrink: 1;
  min-width: 10em;
  font-size: 0.85em;

  p {
    margin-bottom: 0.5em;
    &[data-color] {
      display: flex;
      align-items: center;
      gap: 0.5em;

      &::before {
        $size: 1.25em;
        content: "";
        display: inline-block;
        width: $size;
        height: $size;
        background: gray;
        border-radius: $size;
      }
    }
  }
}
.carbon-footprints-chart__canvas {
  flex-basis: auto;
  flex-grow: 1;
  flex-shrink: 0;
}
</style>
