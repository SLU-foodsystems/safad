<script setup lang="ts">
import HorizontalBarChart from "@/lib/charts/HorizontalBarChart";
import { useOnResize } from "@/lib/use-on-resize";
import { onMounted, ref, watch } from "vue";
import PlaceholderSvg from "./PlaceholderSvg.vue";
import MissingDataOverlay from "./MissingDataOverlay.vue";
import DownloadableSvg from "@/components/DownloadableSvg.vue";

const SVG_FILENAME = "diet-amounts.svg";

const props = defineProps<{
  amountsPerCategory: Record<string, number>;
  dietMissing: boolean;
}>();

type LabelMap = { color: string; label: string; id: string }[];
const otherLabel: LabelMap[number] = {
  id: "other",
  label: "Other",
  color: "#d9d9d9",
};

const dataMap = [
  otherLabel,
  {
    id: "A.05",
    label: "Fruits",
    color: "#e2f0d9",
  },
  {
    id: "A.02",
    label: "Vegetables",
    color: "#548235",
  },
  {
    id: "A.04",
    label: "Legumes, nuts and oilseeds",
    color: "#385723",
  },
  {
    id: "A.03",
    label: "Roots and tubers",
    color: "#F5D191",
  },
  {
    id: "A.01",
    label: "Grains",
    color: "#f4c055",
  },
  {
    id: "A.08",
    label: "Milk",
    color: "#deebf7",
  },
  { id: "A.09", label: "Eggs", color: "#9dc3e6" },
  {
    id: "A.07",
    label: "Fish and other seafood",
    color: "#2e75b6",
  },
  {
    id: "A.06",
    label: "Meats",
    color: "#af2834",
  },
];

const colors = Object.fromEntries(dataMap.map((d) => [d.id, d.color]));
const labels = Object.fromEntries(dataMap.map((d) => [d.id, d.label]));
const order = Object.fromEntries(dataMap.map((d, index) => [d.id, index]));

const svgContainer = ref<HTMLDivElement | null>(null);

const reshapeData = (amountsPerCategory: Record<string, number>) => {
  const aggregateAmounts: Record<string, number> = {};
  Object.entries(amountsPerCategory).forEach(([l1Code, amount]) => {
    const id = l1Code in order ? l1Code : "other";
    aggregateAmounts[id] = (aggregateAmounts[id] || 0) + amount;
  });

  return dataMap.map((x) => ({
    category: x.id,
    value: aggregateAmounts[x.id] || 0,
  }));
};

/**
 * Get max value, ceil()'d' to the highest significant digit.
 * E.g. if max is 0.312 -> 0.4
 *                193 -> 200
 */
const getRoundedMax = (values: number[]) => {
  const max = Math.max(...values);
  const x = Math.ceil(Math.log10(max)) - 1;
  return Math.ceil(max / 10 ** x) * 10 ** x;
};

const drawChart = () => {
  if (!svgContainer.value) return;
  if (Object.keys(props.amountsPerCategory).length === 0) return;

  const svg = svgContainer.value.querySelector("svg");
  if (svg) {
    svgContainer.value.removeChild(svg);
  }

  if (props.dietMissing) return;

  const data = reshapeData(props.amountsPerCategory);

  const rect = svgContainer.value.getBoundingClientRect();
  const width = rect.width;
  let height = rect.width * 0.9;

  HorizontalBarChart(svgContainer.value, data, {
    width,
    height,
    axisLabels: { x: "Amount in diet, g" },
    maxValue: getRoundedMax(data.map((d) => d.value)),
    tooltipUnit: "g",

    labelTextMapper: (c) => labels[c] || "foo",
    color: (c) => colors[c] || "#f0f",
  });
};

useOnResize(drawChart);

watch(() => props.amountsPerCategory, drawChart);

onMounted(() => {
  drawChart();
});
</script>

<template>
  <DownloadableSvg
    class="impacts-per-category-chart"
    :filename="SVG_FILENAME"
    mode="html"
  >
    <div ref="svgContainer" class="impacts-per-category-chart__canvas">
      <PlaceholderSvg :aspect-ratio="0.5" />
      <MissingDataOverlay :show="props.dietMissing">
        No default diet data available for Poland.
      </MissingDataOverlay>
    </div>
  </DownloadableSvg>
</template>

<style lang="scss" scoped>
.impacts-per-category-chart {
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-end;
  gap: 1em;

  @media (max-width: 40em) {
    flex-direction: column;
  }
}

.impacts-per-category-chart__labels {
  flex-basis: 20em;
  flex-grow: 0;
  flex-shrink: 1;
  min-width: 10em;
  font-size: 0.85em;
  line-height: 1;

  p {
    margin-top: 0;
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

.impacts-per-category-chart__canvas {
  flex-basis: auto;
  flex-grow: 1;
  flex-shrink: 0;
  position: relative;
}
</style>
