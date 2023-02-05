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

      amountValues: structuredClone(baseValues.amount),
      amountHasChanges: generateIdValueMap(suaIds, () => false),
      amountHasError: generateIdValueMap(eatIds, () => false),

      techImprValues: structuredClone(baseValues["technical-improvement"]),
      techImprHasChanges: generateIdValueMap(suaIds, () => false),
      techImprHasError: generateIdValueMap(eatIds, () => false),

      wasteValues: structuredClone(baseValues.waste),
      wasteHasChanges: generateIdValueMap(suaIds, () => false),
      wasteHasError: generateIdValueMap(eatIds, () => false),

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
    changeTab(tabId: string) {
      this.currentTab = tabId;
    },
    onAmountUpdate(data: { id: string; value: number; error: boolean }) {
      this.amountValues[data.id] = data.value;
      this.amountHasError[data.id] = data.error;
    },
    onTechImprUpdate(data: { id: string; value: number; error: boolean }) {
      this.techImprValues[data.id] = data.value;
      this.techImprHasError[data.id] = data.error;
    },
    onWasteUpdate(data: { id: string; value: number; error: boolean }) {
      this.wasteValues[data.id] = data.value;
      this.wasteHasError[data.id] = data.error;
    },
  },
});
</script>

<template>
  <header class="top-bar u-tac">
    <div class="top-bar__logo cluster">
      <img src="./assets/slu-logo-bw.svg" />
      <h1>Foods Benchmarker</h1>
    </div>
    <TabsList :tabs="tabs" :current="currentTab" @click:tab="changeTab" />
  </header>

  <main class="page-wrap stack">
    <div class="cluster cluster--between">
      <div></div>
      <div class="cluster">
        <button class="button" @click="openAll">Expand all</button>
        <button class="button" @click="closeAll">Collapse all</button>
      </div>
    </div>
    <section class="diet-configuration stack" v-show="currentTab === 'amount'">
      <FoodsCard
        v-for="eat in eatGroups"
        :key="eat.id"
        :eat="eat"
        :open="isOpen[eat.id]"
        :mode="'amount'"
        :has-error="amountHasError"
        :current-values="amountValues"
        :base-values="baseValues.amount"
        @toggle-open="toggleOpen"
        @update:sua="onAmountUpdate"
      />
    </section>
    <section
      class="diet-configuration stack"
      v-show="currentTab === 'technical-improvement'"
    >
      <FoodsCard
        v-for="eat in eatGroups"
        :key="eat.id"
        :eat="eat"
        :open="isOpen[eat.id]"
        :mode="'percentage'"
        :has-error="techImprHasError"
        :current-values="techImprValues"
        :base-values="baseValues['technical-improvement']"
        @toggle-open="toggleOpen"
        @update:sua="onTechImprUpdate"
      />
    </section>
    <section class="diet-configuration stack" v-show="currentTab === 'waste'">
      <FoodsCard
        v-for="eat in eatGroups"
        :key="eat.id"
        :eat="eat"
        :open="isOpen[eat.id]"
        :mode="'percentage'"
        :has-error="wasteHasError"
        :current-values="wasteValues"
        :base-values="baseValues.waste"
        @toggle-open="toggleOpen"
        @update:sua="onWasteUpdate"
      />
    </section>
  </main>
</template>
