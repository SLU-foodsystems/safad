<script setup lang="ts">
import SLU_COLORS from "@/lib/slu-colors";
import BaseComponent from "./Base.vue";

const props = defineProps<{
  impactsPerCategory: Record<string, number[]>;
}>();

const labels = [
  {
    l1Code: "A.01",
    text: "Grains",
    color: SLU_COLORS.Yellow.Cinnamon,
  },
  {
    l1Code: "A.02",
    text: "Vegetables",
    color: SLU_COLORS.Green.Chlorophyll,
  },
  {
    l1Code: "A.03",
    text: "Starchy roots and tubers",
    color: SLU_COLORS.Yellow.Sunshine,
  },
  {
    l1Code: "A.04",
    text: "Legumes, nuts and oilseeds",
    color: SLU_COLORS.Green.Apple,
  },
  {
    l1Code: "A.05",
    text: "Fruits",
    color: SLU_COLORS.Red.Plum,
  },
  {
    l1Code: "A.06",
    text: "Meats",
    color: SLU_COLORS.Red.Coral,
  },
  {
    l1Code: "A.07",
    text: "Fish and other seafood",
    color: SLU_COLORS.Blue.Seabay,
  },
  {
    l1Code: "A.08",
    text: "Milk",
    color: SLU_COLORS.Blue.Cyan,
  },
  { l1Code: "A.09", text: "Eggs", color: SLU_COLORS.Blue.Sky },
];

const othersLabel = {
  text: "Other commodities and processes",
  color: SLU_COLORS.Gray.Feather,
};
</script>

<template>
  <BaseComponent
    :impactsPerCategory="props.impactsPerCategory"
    :labels="labels"
    :otherLabel="othersLabel"
    legend-title="Commodity category"
  />
</template>

<style lang="scss"></style>
