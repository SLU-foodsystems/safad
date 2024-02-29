<script setup lang="ts">
import SLU_COLORS from "@/lib/slu-colors";
import BaseComponent from "./Base.vue";

const props = defineProps<{
  impactsPerCategory: Record<string, number[]>;
}>();

const labels = [
  {
    l1Code: "A.01",
    text: "Grain-based foods, e.g. bread, pasta, rice",
    color: SLU_COLORS.Yellow.Cinnamon,
  },
  {
    l1Code: "A.02",
    text: "Vegetables, e.g. onions, tomatoes, carrots",
    color: SLU_COLORS.Green.Chlorophyll,
  },
  {
    l1Code: "A.03",
    text: "Starchy products, e.g. potato products",
    color: SLU_COLORS.Yellow.Sunshine,
  },
  {
    l1Code: "A.04",
    text: "Legumes, nuts and oilseeds, e.g. peas, walnuts",
    color: SLU_COLORS.Green.Apple,
  },
  {
    l1Code: "A.05",
    text: "Fresh and dried fruits, jams",
    color: SLU_COLORS.Red.Plum,
  },
  {
    l1Code: "A.06",
    text: "Meat, incl. sausages, ham etc.",
    color: SLU_COLORS.Red.Coral,
  },
  {
    l1Code: "A.07",
    text: "Fish and other seafood",
    color: SLU_COLORS.Blue.Seabay,
  },
  {
    l1Code: "A.08",
    text: "Milk and dairy products, e.g. cheese, yoghurt",
    color: SLU_COLORS.Blue.Cyan,
  },
  { l1Code: "A.09", text: "Eggs", color: SLU_COLORS.Blue.Sky },
  {
    l1Code: "A.10",
    text: "Sugar and confectionary, e.g. sweets, chocolate",
    color: SLU_COLORS.Red.Apricot,
  },
  {
    l1Code: "A.11",
    text: "Fats and oils, e.g. butter, olive oils, rape seed oil",
    color: SLU_COLORS.Yellow.Chocolate,
  },
  {
    l1Code: "A.12",
    text: "Fruit and vegetable juices, e.g. apple juice",
    color: SLU_COLORS.Yellow.Resin,
  },
  {
    l1Code: "A.13",
    text: "Non-alcoholic beverages, e.g. soft drinks, coffee, tea",
    color: SLU_COLORS.Blue.Dove,
  },
  {
    l1Code: "A.14",
    text: "Alcoholic beverages, e.g. wine, beer, spirits",
    color: SLU_COLORS.Red.Grape,
  },
  {
    l1Code: "A.19",
    text: "Composite foods, e.g. pizza, soups, sushi",
    color: SLU_COLORS.Gray.Titan,
  },
  {
    l1Code: "A.20",
    text: "Snacks and desserts, e.g. ice-cream, crisps",
    color: SLU_COLORS.Gray.Concrete,
  },
];

const othersLabel = {
  text: "Other foods",
  color: SLU_COLORS.Gray.Feather,
};

</script>

<template>
  <BaseComponent
    :impactsPerCategory="props.impactsPerCategory"
    :labels="labels"
    :otherLabel="othersLabel"
  />

</template>

<style lang="scss"></style>
