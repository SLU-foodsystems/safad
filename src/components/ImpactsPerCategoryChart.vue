<script setup lang="ts">
import StackedBarChart from "@/lib/charts/StackedBarChart";
import { categoryNames } from "@/lib/efsa-names";
import { sum } from "@/lib/utils";
import { onMounted, ref, watch } from "vue";

const props = defineProps<{
  impactsPerCategory: Record<string, number[]>;
}>();

const el = ref<HTMLDivElement | null>(null);

const dataMap: [string, number][] = [
  ["Carbon footprint", 0],
  ["Land use", 10],
  ["New N input", 11],
  ["New P input", 12],
  ["Blue water use", 13],
  ["Pesticides use", 14],
  ["Biodiversity impact", 15],
  ["Ammonia emissions", 16],
  // ["Processing", 41],
  // ["Packaging", 45],
  // ["Transport", 50],
];

const neatName = (metric: string) => {
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
        neatName(code),
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

  StackedBarChart(
    el.value,
    data,
    Object.keys(data[0]).filter((x) => x !== "category"),
    {
      width,
      height,
      maxValue: 100,
      drawLegend: true,
      axisLabels: { y: "%" },
    }
  );
};

watch(() => props.impactsPerCategory, drawChart);

onMounted(() => {
  drawChart();
});
</script>

<template>
  <div ref="el"></div>
</template>

<style lang="scss"></style>
