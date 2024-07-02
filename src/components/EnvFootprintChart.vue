<script setup lang="ts">
import { debounce, truncate } from "@/lib/utils";
import { useOnResize } from "@/lib/use-on-resize";
import { onMounted, ref, watch } from "vue";
import BarChart from "@/lib/charts/BarChart";
import PlaceholderSvg from "./PlaceholderSvg.vue";
import MissingDataOverlay from "./MissingDataOverlay.vue";
import DownloadableSvg from "@/components/DownloadableSvg.vue";
import { defaultRpcNames } from "@/lib/efsa-names";

// Code: aggregated impacts
type GraphData = [string, number[]][];

const props = defineProps<{
  data: GraphData;
  title: string;
  index: number;
  color: string;
  yLabel?: string;
}>();

const el = ref<HTMLDivElement | null>(null);
const drawChart = async () => {
  if (!el.value) return;
  if (props.data.length === 0) return;

  const data = props.data.map(([code, impactsArr]: [string, number[]]) => ({
    category: code,
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

  const rpcNames = await defaultRpcNames();

  const labelTextMapper = (code: string) =>
    code in rpcNames ? truncate(rpcNames[code], 30) : code;

  BarChart(el.value, data, {
    maxValue,
    width,
    height,
    labelTextMapper,
    labelLayout: "slanted",
    color: props.color,
    axisLabels: props.yLabel ? { y: props.yLabel } : undefined,
  });
};

watch(() => props.data, drawChart);

useOnResize(debounce(drawChart, 200));

onMounted(drawChart);
</script>

<template>
  <div class="env-footprint-graph">
    <h4 v-text="title" />
    <DownloadableSvg :filename="props.title" mode="svg">
      <div ref="el">
        <PlaceholderSvg :aspect-ratio="0.9" />
      </div>
    </DownloadableSvg>
    <MissingDataOverlay :show="!data || data.length === 0">
      Select at least one food item in the list.
    </MissingDataOverlay>
  </div>
</template>

<style lang="scss">
.env-footprint-graph {
  padding: 0.5em;
  text-align: center;
  position: relative;

  h4 {
    font-weight: bold;
  }
}
</style>
