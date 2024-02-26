<script setup lang="ts">
import StackedBarChart from "@/lib/charts/StackedBarChart";
import { categoryNames } from "@/lib/efsa-names";
import { aggregateHeaderIndex } from "@/lib/impacts-csv-utils";
import { useOnResize } from "@/lib/use-on-resize";
import { sum } from "@/lib/utils";
import { onMounted, ref, watch } from "vue";

const props = defineProps<{
  impactsPerCategory: Record<string, number[]>;
}>();

const el = ref<HTMLDivElement | null>(null);

const dataMap: [string, number][] = [
  ["Carbon footprint", aggregateHeaderIndex("Carbon footprint, total")],
  ["Land use", aggregateHeaderIndex("Land")],
  ["New N input", aggregateHeaderIndex("N input")],
  ["New P input", aggregateHeaderIndex("P input")],
  ["Blue water use", aggregateHeaderIndex("Water")],
  ["Pesticides use", aggregateHeaderIndex("Pesticides")],
  ["Biodiversity impact", aggregateHeaderIndex("Biodiversity")],
  ["Ammonia emissions", aggregateHeaderIndex("Ammonia")],
];

/**
 * Shorten names by removing everything from the set of parenthesis, if there is
 * one.
 */
const shortName = (metric: string) => {
  const fullName = categoryNames[metric];
  const parenthesisIdx = fullName.indexOf(" (");
  if (parenthesisIdx === -1) {
    return fullName;
  }

  return fullName.substring(0, parenthesisIdx);
};

const formatData = (impactsPerCategory: Record<string, number[]>) => {
  const l1Codes = Object.keys(impactsPerCategory).sort();

  const sumValues = Object.fromEntries(
    dataMap.map(([metric, index]) => [
      metric,
      sum(l1Codes.map((code) => impactsPerCategory[code][index])),
    ])
  );

  return dataMap.map(([metric, index]) => ({
    category: metric,
    ...Object.fromEntries(
      l1Codes.map((code) => [
        shortName(code),
        impactsPerCategory[code][index] / (sumValues[metric] / 100),
      ])
    ),
  }));
};

const drawChart = () => {
  if (!el.value) return;
  const data = formatData(props.impactsPerCategory);

  const svg = el.value.querySelector("svg");
  if (svg) {
    el.value.removeChild(svg);
  }

  const rect = el.value.getBoundingClientRect();

  const width = rect.width;
  const height = rect.width * 0.45;

  const labelLayout =
    width < 1200 ? (width < 900 ? "slanted" : "offset") : "normal";

  StackedBarChart(
    el.value,
    data,
    Object.keys(data[0]).filter((x) => x !== "category"),
    {
      width,
      height,
      maxValue: 100,
      drawLegend: true,
      axisLabels: { y: "Contribution, %" },

      labelLayout,
      legendTitle: "Food Categories",
    }
  );
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
