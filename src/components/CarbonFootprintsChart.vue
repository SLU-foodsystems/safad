<script setup lang="ts">
import { debounce, reversed, sum } from "@/lib/utils";
import StackedBarChart from "@/lib/charts/StackedBarChart";
import { useOnResize } from "@/lib/use-on-resize";
import { onMounted, ref, watch } from "vue";
import { aggregateHeaderIndex } from "@/lib/impacts-csv-utils";
import { sample } from "@/lib/charts/cmc-colors";

// Code: aggregated impacts
type GraphData = [string, number[]][];

const props = defineProps<{
  data: GraphData;
}>();

const _colors = reversed(sample("Davos", 10));
type Color = string;
const dataMap: [string, number, Color][] = [
  ["Capital goods", aggregateHeaderIndex("Capital goods (kg CO2e)"),
    _colors[0],
    // "#86cbed"
  ],
  [
    "Enteric fermentation",
    aggregateHeaderIndex("Enteric fermentation (kg CO2e)"),
    // "#a0b81a",
    _colors[1],
  ],
  [
    "Land use change",
    aggregateHeaderIndex("Land use change (kg CO2e)"),
    // "#00674c",
    _colors[2],
  ],
  [
    "Manure management",
    aggregateHeaderIndex("Manure management (kg CO2e)"),
    // "brown",
    _colors[3],
  ],
  [
    "Mineral fertiliser production",
    aggregateHeaderIndex("Mineral fertiliser production (kg CO2e)"),
    // "#d44543",
    _colors[4],
  ],
  [
    "Energy, primary production",
    aggregateHeaderIndex("Energy primary production (kg CO2e)"),
    // "#00757e",
    _colors[5],
  ],
  [
    "Soil emissions",
    aggregateHeaderIndex("Soil emissions (kg CO2e)"),
    // "#999",
    _colors[6],
  ],
  [
    "Processing",
    aggregateHeaderIndex("Processing (kg CO2e)"), // "#cdba6c",
    _colors[7],
  ],
  [
    "Packaging",
    aggregateHeaderIndex("Packaging (kg CO2e)"), // "#7ad172",
    _colors[8],
  ],
  [
    "Transport",
    aggregateHeaderIndex("Transports (kg CO2e)"),
    // "#111",
    _colors[9],
  ],
];

const labels = dataMap.map((kv) => kv[0]);
const colors = dataMap.map((kvc) => kvc[2]);

const canvasEl = ref<HTMLDivElement | null>(null);
const drawChart = () => {
  if (props.data.length === 0 || !canvasEl.value) return;
  const data = props.data.map(([code, impactsArr]: [string, number[]]) => {
    const impactsObj = Object.fromEntries(
      dataMap.map(([k, idx]) => [k, impactsArr[idx]])
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
      y: "kg CO2e per kg",
    },
    legendColors: colors,
  });
};

watch(() => props.data, drawChart);
useOnResize(debounce(drawChart, 200));
onMounted(drawChart);
</script>

<template>
  <div class="carbon-footprints-chart">
    <div class="carbon-footprints-chart__labels">
      <p><strong>Emissions Source</strong></p>
      <p v-for="(label, i) in labels">
        <span :style="{ background: colors[i] }" />
        {{ label }}
      </p>
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
    display: flex;
    align-items: center;
    gap: 0.5em;

    > span {
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

.carbon-footprints-chart__canvas {
  flex-basis: auto;
  flex-grow: 1;
  flex-shrink: 0;
}
</style>
