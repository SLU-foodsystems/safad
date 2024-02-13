<script setup lang="ts">
import EnvFootprintChart from "./EnvFootprintChart.vue";

import { sample } from "@/lib/charts/cmc-colors";

const props = defineProps<{
  data: [string, number[]][];
}>();

const colors = sample("Roma", 8);

const charts = [
  {
    index: 10,
    color: colors[0],
    title: "Land",
    yLabel: "m2 per year per kg",
  },
  {
    index: 13,
    color: colors[3],
    title: "Blue Water Use",
    yLabel: "L per kg",
  },
  {
    index: 11,
    color: colors[1],
    title: "New N use",
    yLabel: "m3 per kg",
  },
  {
    index: 12,
    color: colors[2],
    title: "New P use",
    yLabel: "m3 per kg",
  },
  {
    index: 14,
    color: colors[4],
    title: "Pesticides",
    yLabel: "m3 per kg",
  },
  {
    index: 15,
    color: colors[5],
    title: "Biodiversity",
    yLabel: "m3 per kg",
  },
  {
    index: 16,
    color: colors[6],
    title: "Ammonia",
    yLabel: "m3 per kg",
  },
  {
    index: 17,
    color: colors[7],
    title: "Animal welfare",
    yLabel: "m3 per kg",
  },
];

charts.forEach((c, i) => c.color = colors[i]);
</script>

<template>
  <EnvFootprintChart
    v-for="chart in charts"
    :key="chart.title"

    :index="chart.index"
    :color="chart.color"
    :title="chart.title"
    :y-label="chart.yLabel"

    :data="props.data"
  />
</template>
