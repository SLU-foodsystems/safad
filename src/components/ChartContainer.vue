<script lang="ts">
import { defineComponent } from "vue";
import BoundariesChart from "../lib/charts/BoundariesChart";
import StackedBarChart from "@/lib/charts/StackedBarChart";
import downloadSvgAsImage from "@/lib/charts/d3-exporter";

import exampleDietJson from "@/data/example-impacts.json";
import categoryNamesJson from "@/data/category-names.json";
import { mapValues, vectorSum } from "@/lib/utils";

const exampleDiet = exampleDietJson as Record<string, number[]>;
const categoryNames = categoryNamesJson as Record<string, string>;

export default defineComponent({
  mounted() {
    // const boundariesData = [
    //   [
    //     { axis: "GHG Emissions", value: 1.22 },
    //     { axis: "Cropland Use", value: 2.28 },
    //     { axis: "N Application", value: 2.29 },
    //     { axis: "P Application", value: 0.77 },
    //     { axis: "Water Use", value: 2.22 },
    //     { axis: "Extinction Rate", value: 0.92 },
    //   ],
    // ];

    // BoundariesChart(".boundaries-chart-container", boundariesData, {
    //   maxValue: 2,
    // });

    const labels = [
      "GHG Emissions",
      "Cropland Use",
      "N Application",
      "P Application",
      "Water Use",
      "Extinction Rate",
    ];
    const indices = [5, 16, 17, 18, 19, 20];
    const diet = mapValues(exampleDiet, (numbers) =>
      indices.map((i) => numbers[i])
    );

    const resultsPerCategory: Record<string, number[]> = {};
    Object.keys(diet).forEach((rpcCode) => {
      const categoryCode = rpcCode.substring(0, 4);
      if (!resultsPerCategory[categoryCode]) {
        resultsPerCategory[categoryCode] = diet[rpcCode];
      } else {
        resultsPerCategory[categoryCode] = vectorSum(
          resultsPerCategory[categoryCode],
          diet[rpcCode]
        );
      }
    });

    const categories = Object.keys(resultsPerCategory).filter(
      (x) => x[0] === "A"
    );

    const data = labels.map((category, i) => {
      const datum: Record<string, string|number> = { category };
      categories.forEach((code) => {
        datum[code] = String(resultsPerCategory[code][i]);
      });

      return datum;
    });

    console.log(data)

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
