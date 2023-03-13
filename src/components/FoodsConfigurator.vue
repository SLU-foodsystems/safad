<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { generateIdValueMap } from "@/lib/utils";

import { eatIds, applyOverrides } from "../lib/foods-constants";

import FoodsAmountCard from "./FoodsAmountCard/FoodsAmountCard.vue";
import FoodsFactorsCard from "./FoodsFactorsCard/FoodsFactorsCard.vue";
import FoodsOriginCard from "./FoodsOriginCard/FoodsOriginCard.vue";

import TabsList from "./TabsList.vue";
import FactorsOverrides from "./FactorsOverrides.vue";
import foodsData from "../data/foods.json";
import { exportCsv } from "../lib/csv-io";

const eatGroups = foodsData.data as EAT[];

type TabId = "amount" | "factors" | "origin";

const tabs: { label: string; id: TabId; caption: string }[] = [
  {
    label: "Amount",
    id: "amount",
    caption: "Daily, per capita consumption of foods.",
  },
  {
    label: "Waste & Improvement factors",
    id: "factors",
    caption: "Assumed waste and year-on-year technical improvement.",
  },
  {
    label: "Origin",
    id: "origin",
    caption: "Distribution of import countries for foods.",
  },
];

const tabIds = tabs.map((t) => t.id);
const DEFAULT_TAB = tabIds[0];

export default defineComponent({
  components: {
    FactorsOverrides,
    FoodsAmountCard,
    FoodsFactorsCard,
    FoodsOriginCard,
    TabsList,
  },

  props: {
    baseValues: {
      type: Object as PropType<BaseValues>,
      required: true,
    },
  },

  data() {
    return {
      tabs,
      eatGroups,

      isOpen: generateIdValueMap(eatIds, () => true),
      disabled: generateIdValueMap(eatIds, () => false),

      amountValues: JSON.parse(JSON.stringify(this.baseValues.amount)),
      amountHasError: generateIdValueMap(eatIds, () => false),

      factorsValues: JSON.parse(JSON.stringify(this.baseValues.factors)),
      factorsHasError: generateIdValueMap(eatIds, () => false),
      factorsOverrides: {
        productionWaste: null as number | null,
        retailWaste: null as number | null,
        consumerWaste: null as number | null,
        technicalImprovement: null as number | null,
      },
      factorsOverridesMode: "absolute" as "relative" | "absolute",

      originValues: JSON.parse(JSON.stringify(this.baseValues.origin)),
      originHasError: generateIdValueMap(eatIds, () => false),

      currentTab: DEFAULT_TAB,
    };
  },

  computed: {
    title() {
      switch (this.currentTab) {
        case "amount":
          return "Amount";
        case "factors":
          return "Waste and Improvement Factors";
        case "origin":
          return "Origin of import";
        default:
          return "";
      }
    },
    subtitle() {
      switch (this.currentTab) {
        case "amount":
          return "Daily consumption per capita of each food category (gram).";
        case "factors":
          return "Assumed waste percentage and year-on-year technical improvement factor (%).";
        case "origin":
          return "Country of origin.";
        default:
          console.error(
            `Invalid value for tab (${this.currentTab}) registered.`
          );
          return "";
      }
    },
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
    changeTab(tabId: TabId) {
      this.currentTab = tabId;
    },

    exportCsv() {
      const factors = applyOverrides(
        this.factorsOverridesMode,
        this.factorsOverrides,
        this.factorsValues
      );
      exportCsv({
        amountValues: this.amountValues,
        factors,
        originValues: this.originValues,
      });
    },

    onAmountUpdate(data: { id: string; value: number; error: boolean }) {
      this.amountValues[data.id] = data.value;
      this.amountHasError[data.id] = data.error;
    },
    onFactorsUpdate(data: {
      id: string;
      factor: keyof Factors;
      value: number;
      error: boolean;
    }) {
      this.factorsValues[data.id][data.factor] = data.value;
      this.factorsHasError[data.id] = data.error;
    },
    setFactorsOverridesValues(data: {
      factor: keyof Factors;
      value: number | null;
    }) {
      this.factorsOverrides[data.factor] = data.value;
    },
    setFactorsOverridesMode(mode: "relative" | "absolute") {
      this.factorsOverridesMode = mode;
    },

    onOriginUpdate(data: {
      id: string;
      country: string;
      value: number;
      error: boolean;
    }) {
      this.originValues[data.id][data.country] = data.value;
      this.originHasError[data.id] = data.error;
    },
  },
});
</script>

<template>
  <aside class="side-bar stack">
    <header class="cluster">
      <img src="../assets/slu-logo.svg" />
      <h1>Foods Benchmarker</h1>
    </header>
    <TabsList :tabs="tabs" :current="currentTab" @click:tab="changeTab" />
    <footer class="cluster">
      <button class="button">&lt; Go Back</button>
      <button class="button button--accent" @click="exportCsv">Export</button>
    </footer>
  </aside>

  <br />

  <main>
    <div class="page-wrap stack">
      <header class="stack">
        <h1 v-text="title" />
        <p v-text="subtitle" />
        <br />
      </header>
      <div class="cluster cluster--between">
        <div class="cluster" />
        <div class="cluster">
          <button class="button" @click="openAll">Expand all</button>
          <button class="button" @click="closeAll">Collapse all</button>
        </div>
      </div>

      <section v-show="currentTab === 'amount'">
        <FoodsAmountCard v-for="eat in eatGroups" :key="eat.id" :eat="eat" :open="isOpen[eat.id]"
          :has-error="amountHasError" :current-values="amountValues" :base-values="baseValues.amount"
          @toggle-open="toggleOpen" @update:sua="onAmountUpdate" />
      </section>
      <section v-show="currentTab === 'factors'" :class="{
        'has-override--productionWaste':
          factorsOverrides.productionWaste !== null,
        'has-override--retailWaste': factorsOverrides.retailWaste !== null,
        'has-override--consumerWaste':
          factorsOverrides.consumerWaste !== null,
        'has-override--technicalImprovement':
          factorsOverrides.technicalImprovement !== null,
      }">
        <FactorsOverrides @change:values="setFactorsOverridesValues" @change:mode="setFactorsOverridesMode" />
        <FoodsFactorsCard v-for="eat in eatGroups" :key="eat.id" :eat="eat" :open="isOpen[eat.id]"
          :has-error="factorsHasError" :current-values="factorsValues" :base-values="baseValues.factors"
          @toggle-open="toggleOpen" @update:factor="onFactorsUpdate" />
      </section>
      <section v-show="currentTab === 'origin'">
        <FoodsOriginCard v-for="eat in eatGroups" :key="eat.id" :eat="eat" :open="isOpen[eat.id]"
          :has-error="originHasError" :current-values="originValues" :base-values="baseValues.origin"
          @toggle-open="toggleOpen" @update:origin="onOriginUpdate" />
      </section>
    </div>
  </main>
</template>
