<script setup lang="ts">
import { debounce, sum } from "@/lib/utils";
import { useOnResize } from "@/lib/use-on-resize";
import { onMounted, ref, watch } from "vue";
import BarChart from "@/lib/charts/BarChart";

// Code: aggregated impacts
type GraphData = [string, number[]][];

const props = defineProps<{
  data: GraphData;
  title: string;
  index: number;
  color: string;
  yLabel: string;
}>();

const truncate = (text: string, length = 20) =>
  text.length > length ? text.slice(0, length) + "..." : text;

const el = ref<HTMLDivElement | null>(null);
const drawChart = () => {
  if (!el.value) return;
  if (props.data.length === 0) return;

  const data = props.data.map(([label, impactsArr]: [string, number[]]) => ({
    category: truncate(label),
    value: impactsArr[props.index],
  }));

  const maxValue = Math.max(0, ...data.map((obj) => obj.value));

  const svg = el.value.querySelector("svg");
  if (svg) {
    el.value.removeChild(svg);
  }

  const rect = el.value.getBoundingClientRect();
  const width = rect.width;
  const height = rect.width * 0.9;

  BarChart(el.value, data, {
    maxValue,
    width,
    height,
    labelLayout: "slanted",
    color: props.color,
    axisLabels: {
      y: props.yLabel,
    },
  });
};

watch(
  () => props.data,
  () => drawChart()
);

useOnResize(debounce(drawChart, 200));

onMounted(() => drawChart());
</script>

<template>
  <div class="env-footprint-graph">
    <h4 v-text="title" />
    <div ref="el" />
  </div>
</template>

<style lang="scss">
.env-footprint-graph {
  padding: 0.5em;
  text-align: center;

  h4 {
    font-weight: bold;
  }
}
</style>
