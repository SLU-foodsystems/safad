<script setup lang="ts">
import BoundariesChart from "@/lib/charts/BoundariesChart";
import { PLANETARY_BOUNDARY_LIMITS } from "@/lib/constants";
import { useOnResize } from "@/lib/use-on-resize";
import { onMounted, ref, watch } from "vue";

const props = defineProps<{
  data: number[];
}>();

const el = ref<HTMLElement | null>(null);

const pickData = (data: number[]) => [
  {
    value: data[0] / PLANETARY_BOUNDARY_LIMITS.co2e,
    axis: "Carbon footprint",
  },
  {
    value: data[10] / PLANETARY_BOUNDARY_LIMITS.land,
    axis: "Land",
  },
  {
    value: data[11] / PLANETARY_BOUNDARY_LIMITS.n,
    axis: "New N use",
  },
  {
    value: data[12] / PLANETARY_BOUNDARY_LIMITS.p,
    axis: "New P use",
  },
  {
    value: data[13] / PLANETARY_BOUNDARY_LIMITS.h2o,
    axis: "Water",
  },
  {
    value: data[15] / PLANETARY_BOUNDARY_LIMITS.biodiversity,
    axis: "Biodiversity",
  },
];

const drawChart = () => {
  if (!el.value || !props.data) return;

  // Standard values
  const svg = el.value.querySelector("svg");
  if (svg) {
    el.value.removeChild(svg);
  }

  const rect = el.value.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.width); // Square

  const data = pickData(props.data);
  const pad = Math.max(32, width / 8);
  BoundariesChart(el.value, [data], {
    width,
    height,
    padding: { top: pad, right: pad, bottom: pad, left: pad },
  });
};

useOnResize(drawChart);
watch(() => props.data, drawChart);

onMounted(drawChart);
</script>

<template>
  <div class="planetary-boundaries-chart" ref="el" />
</template>

<style lang="scss" scoped>
.planetary-boundaries-chart {
  border-radius: 50%;
  position: relative;
  overflow: hidden;

  &::after {
    content: "";
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    position: absolute;
    box-shadow: inset 0 0 1.5em 1em white;
  }
}
</style>