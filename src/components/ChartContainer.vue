<script lang="ts">
import { defineComponent } from "vue";
import BoundariesChart from "../lib/charts/BoundariesChart";
import StackedBarChart from "@/lib/charts/StackedBarChart";
import downloadSvgAsImage from "@/lib/charts/d3-exporter";

export default defineComponent({
  mounted() {
    const boundariesData = [
      [
        { axis: "GHG Emissions", value: 1.22 },
        { axis: "Cropland Use", value: 2.28 },
        { axis: "N Application", value: 2.29 },
        { axis: "P Application", value: 0.77 },
        { axis: "Water Use", value: 2.22 },
        { axis: "Extinction Rate", value: 0.92 },
      ],
    ];

    BoundariesChart(".boundaries-chart-container", boundariesData, {
      maxValue: 1,
    });

    const data = [
      {
        category: "GHG Emissions",
        diary: 0.2,
        meatPoultry: 0.3,
        fruitsVeg: 0.1,
        fishSeafood: 0.15,
        cereals: 0.15,
        other: 0.1,
      },
      {
        category: "Cropland Use",
        diary: 0.1,
        meatPoultry: 0.35,
        fruitsVeg: 0.1,
        fishSeafood: 0,
        cereals: 0.35,
        other: 0.1,
      },
      {
        category: "N Application",
        diary: 0.1,
        meatPoultry: 0.35,
        fruitsVeg: 0.15,
        fishSeafood: 0.05,
        cereals: 0.35,
        other: 0.0,
      },
      {
        category: "P Application",
        diary: 0.25,
        meatPoultry: 0.1,
        fruitsVeg: 0.5,
        fishSeafood: 0.05,
        cereals: 0.05,
        other: 0.05,
      },
      {
        category: "Water Use",
        diary: 0.1,
        meatPoultry: 0.2,
        fruitsVeg: 0.35,
        fishSeafood: 0.1,
        cereals: 0.1,
        other: 0.15,
      },
      {
        category: "Extinction Rate",
        diary: 0.3,
        meatPoultry: 0.2,
        fruitsVeg: 0.1,
        fishSeafood: 0.15,
        cereals: 0.15,
        other: 0.1,
      },
    ].map((o) =>
      Object.fromEntries(
        Object.entries(o).map(([k, v]) => [k, k === "category" ? v : String(v)])
      )
    );

    const columns = Object.keys(data[0]).filter((x) => x !== "category");
    StackedBarChart(".bar-chart-container", data, columns, {});

    const svgs = Array.from(this.$el.querySelectorAll("svg")) as HTMLElement[];
    svgs.forEach((svg, i) => {
      svg.addEventListener("dblclick", () => {
        downloadSvgAsImage(svg, "image-" + i, {});
      });
    });
  },
});
</script>

<template>
  <div class="cluster">
    <div class="boundaries-chart-container" />
    <div class="bar-chart-container" />
  </div>
</template>

<style lang="scss" scoped>
@import "../styles/constants";
</style>
