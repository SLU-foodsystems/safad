<script lang="ts">
import { defineComponent } from "vue";
import FoodsCard from "./components/FoodsCard/FoodsCard.vue";
import TabsList from "./components/TabsList.vue";
import foodsData from "./data/foods.json";
import baseValues from "./data/original-values";

const eatGroups = foodsData.data as EAT[];
const eatIds = eatGroups.map((eat) => eat.id);
const suaIds = eatGroups.flatMap((x) =>
  x.fbs.flatMap((y) => y.sua.map((z) => z.id))
);

export default defineComponent({
  components: {
    FoodsCard,
    TabsList,
  },
  data() {
    return {
      eatGroups,

      baseValues,
      currentValues: structuredClone(baseValues),

      hasChanges: Object.fromEntries(suaIds.map((id) => [id, false])),
      hasError: Object.fromEntries(eatIds.map((id) => [id, false])),

      isOpen: Object.fromEntries(eatIds.map((id) => [id, true])),

      currentTab: "",
      disabled: {}, // TODO
    };
  },
  methods: {
    toggleOpen(eatId: string) {
      this.isOpen[eatId] = !this.isOpen[eatId];
    },
    openAll() {
      eatIds.forEach((eatId) => {
        this.isOpen[eatId] = true;
      });
    },
    closeAll() {
      eatIds.forEach((eatId) => {
        this.isOpen[eatId] = false;
      });
    },
    onSuaUpdate(data: { id: string; value: number; error: boolean }) {
      this.currentValues = { ...this.currentValues, [data.id]: data.value };
      this.hasError = { ...this.hasError, [data.id]: data.error };
    },
  },
});
</script>

<template>
  <header class="top-bar u-tac cluster">
    <img src="./assets/slu-logo-bw.svg" />
    <h1>Foods Benchmarker</h1>
  </header>

  <main class="page-wrap stack">
    <TabsList />
    <div class="cluster cluster--between">
      <div></div>
      <div class="cluster">
        <button class="button" @click="openAll">Expand all</button>
        <button class="button" @click="closeAll">Collapse all</button>
      </div>
    </div>
    <section class="diet-configuration stack">
      <FoodsCard v-for="eat in eatGroups" :key="eat.id" :eat="eat" :open="isOpen[eat.id]"
        :mode="'percentage'"
        :has-error="hasError"
        :current-values="currentValues" :base-values="baseValues" @toggle-open="toggleOpen"
        @update:sua="onSuaUpdate" />
    </section>
  </main>
</template>
