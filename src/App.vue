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

const tabs = [
  {
    label: "Amount",
    id: "amount",
  },
  {
    label: "Tech. Impr.",
    id: "technical-improvement",
  },
  {
    label: "Waste",
    id: "waste",
  },
  {
    label: "Origin",
    id: "origin",
  },
];

const tabIds = tabs.map((t) => t.id);
const DEFAULT_TAB = tabIds[0];

const generateIdValueMap = <T>(ids: string[], defaultValue: () => T) =>
  Object.fromEntries(ids.map((id) => [id, defaultValue()]));

export default defineComponent({
  components: {
    FoodsCard,
    TabsList,
  },
  data() {
    return {
      tabs,
      eatGroups,

      baseValues,
      currentValues: structuredClone(baseValues),

      hasChanges: generateIdValueMap(tabIds, () =>
        generateIdValueMap(suaIds, () => false)
      ),
      hasError: generateIdValueMap(tabIds, () =>
        generateIdValueMap(eatIds, () => false)
      ),

      isOpen: generateIdValueMap(eatIds, () => true),

      currentTab: DEFAULT_TAB,
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
      const tabId = this.currentTab;
      this.currentValues[tabId] = {
        ...this.currentValues[tabId],
        [data.id]: data.value,
      };
      this.hasError[tabId] = { ...this.hasError[tabId], [data.id]: data.error };
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
    <TabsList :tabs="tabs" :current="'amount'" />
    <div class="cluster cluster--between">
      <div></div>
      <div class="cluster">
        <button class="button" @click="openAll">Expand all</button>
        <button class="button" @click="closeAll">Collapse all</button>
      </div>
    </div>
    <section class="diet-configuration stack">
      <FoodsCard
        v-for="eat in eatGroups"
        :key="eat.id"
        :eat="eat"
        :open="isOpen[eat.id]"
        :mode="'percentage'"
        :has-error="hasError[currentTab]"
        :current-values="currentValues[currentTab]"
        :base-values="baseValues[currentTab]"
        @toggle-open="toggleOpen"
        @update:sua="onSuaUpdate"
      />
    </section>
  </main>
</template>
