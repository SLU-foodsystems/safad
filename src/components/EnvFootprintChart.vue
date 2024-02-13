<script setup lang="ts">
import { debounce, sum } from "@/lib/utils";
import { useOnResize } from "@/lib/use-on-resize";
import { ref, watch } from "vue";
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

const el = ref<HTMLDivElement | null>(null);
const drawChart = () => {
  if (!el.value) return;
  if (props.data.length === 0) return;

  const data = props.data.map(([code, impactsArr]: [string, number[]]) => ({
    category: code,
    value: impactsArr[props.index],
  }));

  const maxValue = Math.max(
    0,
    ...data.map((obj) =>
      sum(Object.values(obj).filter((v): v is number => typeof v === "number"))
    )
  );

  let [width, height] = [800, 500];
  if (el.value) {
    const svg = el.value.querySelector("svg");
    if (svg) {
      el.value.removeChild(svg);
    }

    const rect = el.value.getBoundingClientRect();
    width = rect.width;
    height = rect.width * 0.8;
  }

  BarChart(el.value, data, {
    maxValue,
    width,
    height,
    labelLayout: "offset",
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
