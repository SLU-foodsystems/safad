<script setup lang="ts">
import { aggregateHeaderIndex } from "@/lib/impacts-csv-utils";
import EnvFootprintChart from "./EnvFootprintChart.vue";

import { sample } from "@/lib/charts/cmc-colors";

const props = defineProps<{
  data: [string, number[]][];
}>();

const colors = sample("Roma", 8);

const charts = [
  {
    index: aggregateHeaderIndex("Cropland (m2*year/kg)"),
    color: colors[0],
    title: "Land",
    yLabel: "m2 per year per kg",
  },
  {
    index: aggregateHeaderIndex("Water (m3/kg)"),
    color: colors[3],
    title: "Blue Water Use",
    yLabel: "L per kg",
  },
  {
    index: aggregateHeaderIndex("New N input (kg N/kg)"),
    color: colors[1],
    title: "New N use",
    yLabel: "m3 per kg",
  },
  {
    index: aggregateHeaderIndex("New P input (kg P/kg)"),
    color: colors[2],
    title: "New P use",
    yLabel: "m3 per kg",
  },
  {
    index: aggregateHeaderIndex("Pesticides (g a.i/kg)"),
    color: colors[4],
    title: "Pesticides",
    yLabel: "m3 per kg",
  },
  {
    index: aggregateHeaderIndex("Biodiversity (E/MSY/kg)"),
    color: colors[5],
    title: "Biodiversity",
    yLabel: "m3 per kg",
  },
  {
    index: aggregateHeaderIndex("Ammonia (kg NH3/kg)"),
    color: colors[6],
    title: "Ammonia",
    yLabel: "m3 per kg",
  },
  {
    index: aggregateHeaderIndex("Animal welfare (index)"),
    color: colors[7],
    title: "Animal welfare",
    yLabel: "m3 per kg",
  },
];

charts.forEach((c, i) => (c.color = colors[i]));
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
