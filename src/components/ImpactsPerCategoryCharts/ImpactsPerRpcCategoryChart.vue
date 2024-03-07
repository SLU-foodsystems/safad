<script setup lang="ts">
import BaseComponent from "./Base.vue";

const props = defineProps<{
  impactsPerCategory: Record<string, number[]>;
  dietMissing: boolean;
}>();

const labels = [
  {
    l1Code: "A.05",
    text: "Fruits",
    color: "#e2f0d9",
  },
  {
    l1Code: "A.02",
    text: "Vegetables",
    color: "#548235"
  },
  {
    l1Code: "A.04",
    text: "Legumes, nuts and oilseeds",
    color: "#385723",
  },
  {
    l1Code: "A.03",
    text: "Roots and tubers",
    color: "#F5D191",
  },
  {
    l1Code: "A.01",
    text: "Grains",
    color: "#f4c055",
  },
  {
    l1Code: "A.08",
    text: "Milk",
    color: "#deebf7"
  },
  { l1Code: "A.09", text: "Eggs", color: "#9dc3e6" },
  {
    l1Code: "A.07",
    text: "Fish and other seafood",
    color: "#2e75b6"
  },
  {
    l1Code: "A.06",
    text: "Meats",
    color: "#af2834"
  },
];

const othersLabel = {
  text: "Other",
  color: "#d9d9d9",
};
</script>

<template>
  <BaseComponent
    :impactsPerCategory="props.impactsPerCategory"
    :dietMissing="props.dietMissing"
    :labels="labels"
    :otherLabel="othersLabel"
    legend-title="Commodity category"
  />
</template>

<style lang="scss"></style>
