<script setup lang="ts">
import StackedBarChart from "@/lib/charts/StackedBarChart";
import { aggregateHeaderIndex } from "@/lib/impacts-csv-utils";
import { useOnResize } from "@/lib/use-on-resize";
import { sum, vectorSum } from "@/lib/utils";
import { onMounted, ref, watch } from "vue";

type LabelMap = { color: string; text: string; l1Code: string }[];

const props = defineProps<{
  impactsPerCategory: Record<string, number[]>;
  labels: LabelMap;
  otherLabel: Pick<LabelMap[number], "color" | "text">;
  legendTitle: string;
}>();

const el = ref<HTMLDivElement | null>(null);

const dataMap: [string, number][] = [
  ["Carbon footprint", aggregateHeaderIndex("Carbon footprint, total (kg CO2e)")],
  ["Land use", aggregateHeaderIndex("Cropland (m2*year/kg)")],
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
      console.log(l1Code, merged[otherKey], impacts);
      console.log(impactsPerCategory)
      throw Error("mismatched length")
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
  if (!el.value) return;

  const codeToLabelMap = Object.fromEntries(
    props.labels.map(({ text, l1Code }) => [l1Code, text])
  );

  const mergedData = mergeAndRelabelData(
    props.impactsPerCategory,
    codeToLabelMap,
    props.otherLabel.text
  );

  const data = reshapeData(mergedData);
  const labels = [props.otherLabel.text, ...props.labels.map((x) => x.text)];
  const colors = [props.otherLabel.color, ...props.labels.map((x) => x.color)];

  const svg = el.value.querySelector("svg");
  if (svg) {
    el.value.removeChild(svg);
  }

  const rect = el.value.getBoundingClientRect();

  const width = rect.width;
  const height = rect.width * 0.45;

  const labelLayout =
    width < 1200 ? (width < 900 ? "slanted" : "offset") : "normal";

  StackedBarChart(el.value, data, labels, {
    width,
    height,
    maxValue: 100,
    drawLegend: true,
    axisLabels: { y: "Contribution, %" },

    labelLayout,
    legendTitle: props.legendTitle,
    legendColors: colors,
  });
};

useOnResize(drawChart);

watch(() => props.impactsPerCategory, drawChart);

onMounted(() => {
  drawChart();
});
</script>

<template>
  <div ref="el"></div>
</template>

<style lang="scss"></style>
