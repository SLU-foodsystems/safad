<script setup lang="ts">
import { aggregateHeaderIndex } from "@/lib/impacts-csv-utils";
import EnvFootprintChart from "./EnvFootprintChart.vue";

import SLU_COLORS from "@/lib/slu-colors";

const props = defineProps<{
  data: [string, number[]][];
}>();

const charts = [
  {
    index: aggregateHeaderIndex("Cropland (m2*year/kg)"),
    color: SLU_COLORS.Green.Chlorophyll,
    title: "Cropland use",
    yLabel: "m2 per year per kg",
  },
  {
    index: aggregateHeaderIndex("Water (m3/kg)"),
    color: SLU_COLORS.Blue.Sky,
    title: "Blue water use",
    yLabel: "m3 per kg",
  },
  {
    index: aggregateHeaderIndex("New N input (kg N/kg)"),
    color: SLU_COLORS.Blue.Cyan,
    title: "New N use",
    yLabel: "kg N per kg",
  },
  {
    index: aggregateHeaderIndex("New P input (kg P/kg)"),
    color: SLU_COLORS.Blue.Seabay,
    title: "New P use",
    yLabel: "kg P per kg",
  },
  {
    index: aggregateHeaderIndex("Ammonia (kg NH3/kg)"),
    color: SLU_COLORS.Blue.OceanDepth,
    title: "Ammonia",
    yLabel: "kg NH3 per kg",
  },
  {
    index: aggregateHeaderIndex("Pesticides (g a.i/kg)"),
    color: SLU_COLORS.Red.Coral,
    title: "Pesticides",
    yLabel: "g a.i per kg",
  },
  {
    index: aggregateHeaderIndex("Biodiversity (E/MSY/kg)"),
    color: SLU_COLORS.Red.Apricot,
    title: "Biodiversity impact from land use",
    yLabel: "E per MSY per kg",
  },
  {
    index: aggregateHeaderIndex("Animal welfare (index)"),
    color: SLU_COLORS.Green.Apple,
    title: "Animal welfare index",
  },
  {
    index: aggregateHeaderIndex("Antibiotics (index)"),
    color: SLU_COLORS.Green.Linden,
    title: "Antibiotics use index",
  },
];
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
