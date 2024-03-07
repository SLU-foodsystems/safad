<script setup lang="ts">
import BoundariesChart from "@/lib/charts/BoundariesChart";
import { PLANETARY_BOUNDARY_LIMITS } from "@/lib/constants";
import { useOnResize } from "@/lib/use-on-resize";
import { computed, onMounted, ref, watch } from "vue";
import PlaceholderSvg from "./PlaceholderSvg.vue";
import MissingDataOverlay from "./MissingDataOverlay.vue";

const props = defineProps<{
  data: number[];
  dietMissing: boolean;
}>();

const el = ref<HTMLElement | null>();

const pickData = (data: number[]) => [
  {
    value: data[0] / PLANETARY_BOUNDARY_LIMITS.co2e,
    axis: "Carbon footprint",
  },
  {
    value: data[10] / PLANETARY_BOUNDARY_LIMITS.land,
    axis: "Cropland use",
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
  if (!el.value) return;
  if (props.dietMissing) return;

  // Standard values
  const svg = el.value.querySelector("svg");
  if (svg) {
    el.value.removeChild(svg);
  }

  const rect = el.value.getBoundingClientRect();
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.width); // Square

  const data = pickData(props.data);
  const pad = Math.max(32, width / 3);
  BoundariesChart(el.value, data, {
    width,
    height,
    levels: 6,
    padding: { top: pad, right: pad, bottom: pad, left: pad },
  });
};

useOnResize(drawChart);
watch(() => props.data, drawChart);

onMounted(drawChart);
</script>

<template>
  <div class="planetary-boundaries-chart" ref="el">
    <PlaceholderSvg :aspect-ratio="1" />
    <MissingDataOverlay :show="props.dietMissing">
      No default diet data available for Poland.
    </MissingDataOverlay>
  </div>
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
