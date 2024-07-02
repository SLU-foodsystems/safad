<script setup lang="ts">
import StackedBarChart from "@/lib/charts/StackedBarChart";
import { aggregateHeaderIndex } from "@/lib/impacts-csv-utils";
import { useOnResize } from "@/lib/use-on-resize";
import { sum, vectorSum } from "@/lib/utils";
import { onMounted, ref, watch } from "vue";
import PlaceholderSvg from "../PlaceholderSvg.vue";
import MissingDataOverlay from "../MissingDataOverlay.vue";
import DownloadableSvg from "@/components/DownloadableSvg.vue";

type LabelMap = { color: string; text: string; l1Code: string }[];

const props = defineProps<{
  impactsPerCategory: Record<string, number[]>;
  labels: LabelMap;
  otherLabel: Pick<LabelMap[number], "color" | "text">;
  legendTitle: string;
  dietMissing: boolean;
  filename: string;
}>();

const svgContainer = ref<HTMLDivElement | null>(null);
const labels = [props.otherLabel.text, ...props.labels.map((x) => x.text)];
const colors = [props.otherLabel.color, ...props.labels.map((x) => x.color)];

const dataMap: [string, number][] = [
  [
    "Carbon footprint",
    aggregateHeaderIndex("Carbon footprint, total (kg CO2e)"),
  ],
  ["Cropland use", aggregateHeaderIndex("Cropland (m2*year/kg)")],
  ["New N input", aggregateHeaderIndex("New N input (kg N/kg)")],
  ["New P input", aggregateHeaderIndex("New P input (kg P/kg)")],
  ["Blue water use", aggregateHeaderIndex("Water (m3/kg)")],
  ["Pesticides use", aggregateHeaderIndex("Pesticides (g a.i/kg)")],
  ["Biodiversity impact", aggregateHeaderIndex("Biodiversity (E/MSY/kg)")],
  ["Ammonia emissions", aggregateHeaderIndex("Ammonia (kg NH3/kg)")],
];

const mergeAndRelabelData = (
  impactsPerCategory: Record<string, number[]>,
  codeToLabelMap: Record<string, string>,
  otherKey: string
) => {
  const merged: Record<string, number[]> = {};
  Object.entries(impactsPerCategory).forEach(([l1Code, impacts]) => {
    const label = codeToLabelMap[l1Code];
    if (label) {
      merged[label] = impacts;
      return;
    }

    if (!merged[otherKey]) {
      merged[otherKey] = impacts;
      return;
    }

    try {
      merged[otherKey] = vectorSum(merged[otherKey], impacts);
    } catch {
      console.error(
        "Error: mismatched length.",
        l1Code,
        merged[otherKey],
        impacts
      );
    }
  });

  return merged;
};

const reshapeData = (impactsPerCategory: Record<string, number[]>) => {
  const categories = Object.keys(impactsPerCategory);

  const sumValues = Object.fromEntries(
    dataMap.map(([metric, index]) => [
      metric,
      sum(categories.map((code) => impactsPerCategory[code][index])),
    ])
  );

  return dataMap.map(([metric, index]) => ({
    category: metric,
    ...Object.fromEntries(
      categories.map((code) => [
        code,
        impactsPerCategory[code][index] / (sumValues[metric] / 100),
      ])
    ),
  }));
};

const drawChart = () => {
  if (!svgContainer.value) return;
  if (Object.keys(props.impactsPerCategory).length === 0) return;

  const svg = svgContainer.value.querySelector("svg");
  if (svg) {
    svgContainer.value.removeChild(svg);
  }

  if (props.dietMissing) return;

  const codeToLabelMap = Object.fromEntries(
    props.labels.map(({ text, l1Code }) => [l1Code, text])
  );

  const mergedData = mergeAndRelabelData(
    props.impactsPerCategory,
    codeToLabelMap,
    props.otherLabel.text
  );

  const data = reshapeData(mergedData);

  const rect = svgContainer.value.getBoundingClientRect();

  const width = rect.width;
  let height = rect.width * 0.5;
  let labelLayout: "normal" | "slanted" | "offset" = "normal";
  if (width < 900) {
    labelLayout = "slanted";
    height += 200;
  } else if (width < 1200) {
    labelLayout = "offset";
  }

  StackedBarChart(svgContainer.value, data, labels, {
    width,
    height,
    maxValue: 100,
    axisLabels: { y: "Contribution, %" },
    tooltipUnit: "%",

    labelLayout,
    colors,
  });
};

useOnResize(drawChart);

watch(() => props.impactsPerCategory, drawChart);

onMounted(() => {
  drawChart();
});
</script>

<template>
  <DownloadableSvg
    class="impacts-per-category-chart"
    :filename="props.filename"
    mode="html"
  >
    <div class="impacts-per-category-chart__labels">
      <p><strong v-text="props.legendTitle" /></p>
      <p v-for="(label, i) in labels">
        <span :style="{ background: colors[i] }" />
        {{ label }}
      </p>
    </div>
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
