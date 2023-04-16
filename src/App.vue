<script lang="ts">
import { defineComponent } from "vue";
import reduceDiet from "./lib/rpc-reducer";
import foodsRecipes from "./data/foodex-recipes.json";

export default defineComponent({
  data() {
    return {};
  },

  methods: {
    run() {
      const diet = [
        ["A.01.06.001.004", 2000, 10, 10, 33],
        ["A.01.07.001.006", 1000, 50, 20, 0],
        ["I.14.07.001.002", 500, 0, 30, 0],
      ].map((x) => ({
        code: x[0] as string,
        amount: x[1] as number,
        organic: x[2] as number,
        consumerWaste: x[3] as number,
        retailWaste: x[4] as number,
      }));
      const recipes = foodsRecipes.data as unknown;

      type FoodsRecipe = [string, string, number, number][];
      type FoodsRecipes = { [foodexCode: string]: FoodsRecipe };
      const rpcs = reduceDiet(diet, recipes as FoodsRecipes);
      console.log(Object.fromEntries(rpcs));
    },
  },
});
</script>

<template>
  <section class="start-page">
    <div class="stack u-tac">
      <div class="cluster cluster--center">
        <img src="../assets/slu-logo.svg" class="start-page__logo" />
      </div>
      <h2>SLU Foods Benchmarker</h2>
      <div class="cluster cluster--center">
        <button class="button button--accent" @click="run">Run &gt;</button>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@import "styles/constants";

.start-page {
  grid-row-start: sidebar-start;
  grid-column-start: sidebar-start;
  grid-row-end: results-end;
  grid-column-end: results-end;

  height: 100%;
  width: 100%;

  display: flex;
  justify-content: center;
  align-items: center;

  >div {
    flex-basis: 30em;
  }

  select {
    width: 20em;
    flex-grow: 1;
  }
}

.start-page__logo {
  width: auto;
  height: 4em;
  margin: 0 auto;
  margin-bottom: 2em;
}
</style>
