<script lang="ts" setup>
import PieChart, { type DataPoint } from "@/lib/charts/PieChart";
import { CO2E_CONV_FACTORS } from "@/lib/constants";
import { aggregateHeaderIndex } from "@/lib/impacts-csv-utils";
import SLU_COLORS from "@/lib/slu-colors";
import { useOnResize } from "@/lib/use-on-resize";
import { reversed, sum } from "@/lib/utils";
import { ref, onMounted, watch, computed } from "vue";
import PlaceholderSvg from "./PlaceholderSvg.vue";
import MissingDataOverlay from "./MissingDataOverlay.vue";

const gasesDataMap: [string, string, number, number][] = [
  [
    "Nitrous oxide",
    SLU_COLORS.Blue.Sky,
    aggregateHeaderIndex("Nitrous oxide, total (kg N2O)"),
    CO2E_CONV_FACTORS.N2O,
  ],
  [
    "Carbon Dioxide",
    SLU_COLORS.Blue.Seabay,
    aggregateHeaderIndex("Carbon dioxide, total (kg CO2)"),
    CO2E_CONV_FACTORS.CO2,
  ],
  [
    "Methane, fossil",
    SLU_COLORS.Red.Coral,
    aggregateHeaderIndex("Methane, fossil, total (kg CH4)"),
    CO2E_CONV_FACTORS.FCH4,
  ],
  [
    "Methane, biogenic",
    SLU_COLORS.Green.Chlorophyll,
    aggregateHeaderIndex("Methane, biogenic, total (kg CH4)"),
    CO2E_CONV_FACTORS.BCH4,
  ],
];

const lifecycleStages: [string, string, number][] = [
  [
    "Transport",
    SLU_COLORS.Blue.Sky,
    aggregateHeaderIndex("Transports (kg CO2e)"),
  ],
  [
    "Packaging",
    SLU_COLORS.Blue.Cyan,
    aggregateHeaderIndex("Packaging (kg CO2e)"),
  ],
  [
    "Processing",
    SLU_COLORS.Blue.Seabay,
    aggregateHeaderIndex("Processing (kg CO2e)"),
  ],
  [
    "Manure management",
    SLU_COLORS.Red.Apricot,
    aggregateHeaderIndex("Manure management (kg CO2e)"),
  ],
  [
    "Enteric fermentation",
    SLU_COLORS.Red.Coral,
    aggregateHeaderIndex("Enteric fermentation (kg CO2e)"),
  ],
  [
    "Land use change",
    SLU_COLORS.Red.Plum,
    aggregateHeaderIndex("Land use change (kg CO2e)"),
  ],
  [
    "Soil emissions",
    SLU_COLORS.Green.Chlorophyll,
    aggregateHeaderIndex("Soil emissions (kg CO2e)"),
  ],
  [
    "Capital goods",
    SLU_COLORS.Gray.Feather,
    aggregateHeaderIndex("Capital goods (kg CO2e)"),
  ],
  [
    "Energy, primary production",
    SLU_COLORS.Gray.Concrete,
    aggregateHeaderIndex("Energy primary production (kg CO2e)"),
  ],
  [
    "Mineral fertiliser",
    SLU_COLORS.Gray.Titan,
    aggregateHeaderIndex("Mineral fertiliser production (kg CO2e)"),
  ],
];

const toRelativeValues = (dataPoints: DataPoint[]) => {
  const total = sum(dataPoints.map((x) => x.value));
  return dataPoints.map((datum) => ({
    ...datum,
    value: datum.value / total,
  }));
};

const props = defineProps<{
  dietFootprints: number[];
  dietMissing: boolean;
}>();

const gasesEl = ref<HTMLDivElement | null>();
const lifecycleEl = ref<HTMLDivElement | null>();

const getGasesData = () =>
  toRelativeValues(
    gasesDataMap.map(([label, color, index, multiplier]) => ({
      label,
      color,
      value: props.dietFootprints[index] * multiplier,
    }))
  );

const getLifecycleStagesData = () =>
  toRelativeValues(
    lifecycleStages.map(([label, color, index]) => ({
      label,
      color,
      value: props.dietFootprints[index],
    }))
  );

const drawChart = (...[el, data, options]: Parameters<typeof PieChart>) => {
  const svg = el.querySelector("svg");
  if (svg) {
    el.removeChild(svg);
  }

  const rect = el.getBoundingClientRect();
  const width = rect.width;
  const height = rect.width * 0.5;

  const drawLabels = width > 600;
  if (!drawLabels && options.padding) {
    Object.assign(options.padding, { left: 10, right: 10 });
  }
  PieChart(el, data, { width, height, drawLabels, ...options });
};

const drawCharts = () => {
  if (!gasesEl.value || !lifecycleEl.value) return;
  if (props.dietFootprints.length === 0) return;
  if (props.dietMissing) return;

  const gasesData = getGasesData();
  const lifecycleStagesData = getLifecycleStagesData();

  const longestLabelWidth =
    8 *
    Math.max(
      ...gasesData.map((d) => d.label.length),
      ...lifecycleStagesData.map((d) => d.label.length)
    );

  const padding = {
    top: 10,
    right: longestLabelWidth,
    bottom: 10,
    left: longestLabelWidth,
  };

  drawChart(gasesEl.value, gasesData, { padding });
  drawChart(lifecycleEl.value, lifecycleStagesData, { padding });
};

useOnResize(drawCharts);
watch(() => props.dietFootprints, drawCharts);

onMounted(drawCharts);

const reverseSecondHalf = <T,>(xs: T[]): T[] => {
  if (xs.length < 3) return xs;

  const midpoint = Math.floor(xs.length / 2);

  const result: T[] = xs.slice(0, midpoint);
  const secondHalf = reversed(xs.slice(midpoint, xs.length));
  result.push(...secondHalf);

  return result;
};
</script>

<template>
  <div class="labels">
    <p
      v-for="d in reverseSecondHalf(gasesDataMap)"
      v-text="d[0]"
      :style="{ color: d[1] }"
    />
  </div>
  <div ref="gasesEl" style="position: relative">
    <PlaceholderSvg :aspect-ratio="0.5" />
    <MissingDataOverlay :show="props.dietMissing">
      No default diet data available for Poland.
    </MissingDataOverlay>
  </div>
  <div ref="lifecycleEl" style="position: relative">
    <PlaceholderSvg :aspect-ratio="0.5" />
    <MissingDataOverlay :show="props.dietMissing">
      No default diet data available for Poland.
    </MissingDataOverlay>
  </div>
  <div class="labels">
    <p
      v-for="d in reverseSecondHalf(lifecycleStages)"
      v-text="d[0]"
      :style="{ color: d[1] }"
    />
  </div>
</template>

<style lang="scss" scoped>
.labels {
  font-weight: bold;

  columns: 2;
  direction: rtl;

  @media (min-width: 601px) {
    display: none;
  }
}
</style>
