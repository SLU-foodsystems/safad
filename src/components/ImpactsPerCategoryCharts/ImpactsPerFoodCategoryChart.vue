<script setup lang="ts">
import BaseComponent from "./Base.vue";

const props = defineProps<{
  impactsPerCategory: Record<string, number[]>;
  dietMissing: boolean;
}>();

const labels = [
  {
    l1Code: "A.19",
    text: "Composite foods",
    color: "#bfbfbf",
  },
  {
    l1Code: "A.20",
    text: "Snacks and desserts",
    color: "#7f7f7f",
  },
  {
    l1Code: "A.14",
    text: "Alcoholic beverages",
    color: "#d2387a",
  },
  {
    l1Code: "A.13",
    text: "Non-alcoholic beverages",
    color: "#d6b5e5",
  },
  {
    l1Code: "A.10",
    text: "Sugar and confectionary",
    color: "#fc7680",
  },
  {
    l1Code: "A.11",
    text: "Fats and oils",
    color: "#f8eba2",
  },
  {
    l1Code: "A.05",
    text: "Fruit",
    color: "#e2f0d9",
  },
  {
    l1Code: "A.12",
    text: "Fruit and vegetable juices",
    color: "#a9d18e",
  },
  {
    l1Code: "A.02",
    text: "Vegetables",
    color: "#548235",
  },
  {
    l1Code: "A.04",
    text: "Legumes and nuts",
    color: "#385723",
  },
  {
    l1Code: "A.03",
    text: "Starchy products",
    color: "#f5d191",
  },
  {
    l1Code: "A.01",
    text: "Grain-based foods",
    color: "#f4c055",
  },
  {
    l1Code: "A.08",
    text: "Dairy products",
    color: "#deebf7",
  },
  { l1Code: "A.09", text: "Eggs", color: "#9dc3e6" },
  {
    l1Code: "A.07",
    text: "Fish and other seafood",
    color: "#2e75b6",
  },
  {
    l1Code: "A.06",
    text: "Meat products",
    color: "#af2834",
  },
];

const othersLabel = {
  text: "Other foods",
  color: "#d9d9d9",
};
</script>

<template>
  <BaseComponent
    :impactsPerCategory="props.impactsPerCategory"
    :dietMissing="props.dietMissing"
    :labels="labels"
    :otherLabel="othersLabel"
    legend-title="Foods category"
    filename="impacts-per-food-group"
  />
</template>

<style lang="scss"></style>
