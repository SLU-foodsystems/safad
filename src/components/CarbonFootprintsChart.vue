<script setup lang="ts">
import { debounce, sum, truncate } from "@/lib/utils";
import StackedBarChart from "@/lib/charts/StackedBarChart";
import { useOnResize } from "@/lib/use-on-resize";
import { onMounted, ref, watch } from "vue";
import { aggregateHeaderIndex } from "@/lib/impacts-csv-utils";
import SLU_COLORS from "@/lib/slu-colors";

import DownloadableSvg from "@/components/DownloadableSvg.vue";
import PlaceholderSvg from "@/components/PlaceholderSvg.vue";
import MissingDataOverlay from "./MissingDataOverlay.vue";
import { defaultRpcNames } from "@/lib/efsa-names";

// Code: aggregated impacts
type GraphData = [string, number[]][];

const props = defineProps<{
  data: GraphData;
}>();

type Color = string;
const dataMap: [string, number, Color][] = [
  [
    "Transport",
    aggregateHeaderIndex("Transports (kg CO2e)"),
    SLU_COLORS.Blue.Sky,
  ],
  [
    "Packaging",
    aggregateHeaderIndex("Packaging (kg CO2e)"), // "#7ad172",
    SLU_COLORS.Blue.Cyan,
  ],
  [
    "Processing",
    aggregateHeaderIndex("Processing (kg CO2e)"), // "#cdba6c",
    SLU_COLORS.Blue.Seabay,
  ],
  [
    "Manure management",
    aggregateHeaderIndex("Manure management (kg CO2e)"),
    SLU_COLORS.Red.Apricot,
  ],
  [
    "Enteric fermentation",
    aggregateHeaderIndex("Enteric fermentation (kg CO2e)"),
    "rgb(175, 40, 52)",
  ],
  [
    "Land use change",
    aggregateHeaderIndex("Land use change (kg CO2e)"),
    SLU_COLORS.Red.Plum,
  ],
  [
    "Soil emissions",
    aggregateHeaderIndex("Soil emissions (kg CO2e)"),
    "rgb(84, 130, 53)",
  ],
  [
    "Capital goods",
    aggregateHeaderIndex("Capital goods (kg CO2e)"),
    SLU_COLORS.Gray.Feather,
  ],
  [
    "Energy, primary production",
    aggregateHeaderIndex("Energy primary production (kg CO2e)"),
    SLU_COLORS.Gray.Concrete,
  ],
  [
    "Mineral fertiliser production",
    aggregateHeaderIndex("Mineral fertiliser production (kg CO2e)"),
    SLU_COLORS.Gray.Titan,
  ],
];

const labels = dataMap.map((kv) => kv[0]);
const colors = dataMap.map((kvc) => kvc[2]);

const hasLoadedOnce = ref(false);

const svgContainer = ref<HTMLDivElement | null>(null);
const drawChart = async () => {
  if (props.data.length === 0 || !svgContainer.value) return;
  const data = props.data.map(([code, impactsArr]: [string, number[]]) => {
    const impactsObj = Object.fromEntries(
      dataMap.map(([k, idx]) => [k, impactsArr[idx]])
    );

    return {
      category: code,
      ...impactsObj,
    };
  });

  if (data.length === 0 || !data[0]) return;

  const columns = Object.keys(data[0]).filter((x) => x !== "category");

  const maxValue = Math.max(
    0,
    ...data.map((obj: Record<string, number | string>) =>
      sum(Object.values(obj).filter((v): v is number => typeof v === "number"))
    )
  );

  const svg = svgContainer.value.querySelector("svg");
  if (svg) {
    svgContainer.value.removeChild(svg);
  }

  const rect = svgContainer.value.getBoundingClientRect();

  const width = rect.width;
  const height = rect.width * 0.75;

  const rpcNames = await defaultRpcNames();

  const labelTextMapper = (code: string) =>
    rpcNames[code] ? truncate(rpcNames[code], 30) : code;

  StackedBarChart(svgContainer.value, data, columns, {
    maxValue,
    width,
    height,
    labelLayout: "slanted",
    labelTextMapper,
    axisLabels: {
      y: "kg CO2e per kg",
    },
    tooltipUnit: "kg CO2e per kg",
    colors,
  });

  hasLoadedOnce.value = true;
};

watch(() => props.data, drawChart);
useOnResize(debounce(drawChart, 200));
onMounted(drawChart);
</script>

<template>
  <DownloadableSvg
    class="carbon-footprints-chart"
    mode="html"
    filename="carbon-footprints"
  >
    <div class="carbon-footprints-chart__labels">
      <p><strong>Lifecycle Stage</strong></p>
      <p v-for="(label, i) in labels">
        <span :style="{ background: colors[i] }" />
        {{ label }}
      </p>
    </div>
    <div class="carbon-footprints-chart__canvas" ref="svgContainer">
      <PlaceholderSvg :aspect-ratio="0.6" />
    </div>
    <MissingDataOverlay :show="props.data.length === 0 && hasLoadedOnce">
      Select at least one food item in the list.
    </MissingDataOverlay>
  </DownloadableSvg>
</template>

<style lang="scss">
.carbon-footprints-chart {
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-end;
  position: relative;

  @media (max-width: 40em) {
    flex-direction: column;
  }
}

.carbon-footprints-chart__labels {
  flex-basis: 18em;
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
