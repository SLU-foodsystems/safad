<script setup lang="ts">
import BoundariesChart from "@/lib/charts/BoundariesChart";
import { PLANETARY_BOUNDARY_LIMITS } from "@/lib/constants";
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

  const data = pickData(props.data);
  BoundariesChart(el.value, [data], {});
};

watch(() => props.data, drawChart);

onMounted(drawChart);
</script>

<template>
  <div class="planetary-boundaries-chart" ref="el" />
</template>
