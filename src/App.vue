<script lang="ts">
import { defineComponent } from "vue";
import { downloadCsv, generateCsvData, generateIdValueMap } from "@/lib/utils";
import FoodsAmountCard from "./components/FoodsAmountCard/FoodsAmountCard.vue";
import FoodsFactorsCard from "./components/FoodsFactorsCard/FoodsFactorsCard.vue";
import TabsList from "./components/TabsList.vue";
import FactorsOverrides from "./components/FactorsOverrides.vue";
import foodsData from "./data/foods.json";
import baseValues from "./data/original-values";

const eatGroups = foodsData.data as EAT[];
const eatIds = eatGroups.map((eat) => eat.id);
const suaIds = eatGroups.flatMap((x) =>
  x.fbs.flatMap((y) => y.sua.map((z) => z.id))
);

type TabId = "amount" | "factors" | "origin";

const tabs: { label: string; id: TabId }[] = [
  {
    label: "Amount",
    id: "amount",
  },
  {
    label: "Waste & Improvement factors",
    id: "factors",
  },
  {
    label: "Origin",
    id: "origin",
  },
];

const tabIds = tabs.map((t) => t.id);
const DEFAULT_TAB = tabIds[1];

export default defineComponent({
  components: {
    FactorsOverrides,
    FoodsAmountCard,
    FoodsFactorsCard,
    TabsList,
  },
  data() {
    return {
      tabs,
      eatGroups,

      baseValues,

      isOpen: generateIdValueMap(eatIds, () => true),
      disabled: generateIdValueMap(eatIds, () => false),

      amountValues: structuredClone(baseValues.amount),
      amountHasError: generateIdValueMap(eatIds, () => false),

      factorsValues: structuredClone(baseValues.factors),
      factorsHasError: generateIdValueMap(eatIds, () => false),
      factorsOverrides: {
        productionWaste: null as number | null,
        retailWaste: null as number | null,
        consumerWaste: null as number | null,
        technicalImprovement: null as number | null,
      },

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
      const header = [
        "SUA Id",
        "Amount (g)",
        "Production Waste (%)",
        "Retail Waste (%)",
        "Consumer Waste (%)",
        "Technical Improvement (%)",
        "Origin (country1:amount1 country2:amount2 ...)",
      ];
      /* const rows = suaIds.map((id) => [ */
      /*   id, */
      /*   this.amountValues[id], */
      /*   this.factorsValues[id], */
      /*   this.wasteValues[id], */
      /* ]); */

      /* const csv = generateCsvData(header, rows); */

      const csv = header + "\n" + "TODO,".repeat(6) + "TODO";

      const now = new Date();
      const datetimeStamp = `${now.getFullYear()}${now.getMonth() + 1
        }${now.getDay()}`;
      downloadCsv(csv, `slu-planeat-${datetimeStamp}`);
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

    setFactorsOverride(data: { factor: keyof Factors; value: number | null }) {
      this.factorsOverrides[data.factor] = data.value;
    },
  },
});
</script>

<template>
  <header class="top-bar u-tac">
    <div class="top-bar__logo cluster">
      <img src="./assets/slu-logo.svg" />
      <h1>Foods Benchmarker</h1>
    </div>
    <TabsList :tabs="tabs" :current="currentTab" @click:tab="changeTab" />
  </header>

  <br />

  <main class="page-wrap stack">
    <header class="stack">
      <h1 v-text="title" />
      <p v-text="subtitle" />
      <br />
    </header>
    <div class="cluster cluster--between">
      <div class="cluster">
        <button class="button" @click="exportCsv">Export data</button>
        <button class="button" disabled>Import data</button>
      </div>
      <div class="cluster">
        <button class="button" @click="openAll">Expand all</button>
        <button class="button" @click="closeAll">Collapse all</button>
      </div>
    </div>
    <section class="diet-configuration stack" v-show="currentTab === 'amount'">
      <FoodsAmountCard v-for="eat in eatGroups" :key="eat.id" :eat="eat" :open="isOpen[eat.id]"
        :has-error="amountHasError" :current-values="amountValues" :base-values="baseValues.amount"
        @toggle-open="toggleOpen" @update:sua="onAmountUpdate" />
    </section>
    <section class="diet-configuration stack" v-show="currentTab === 'factors'" :class="{
      'has-override--productionWaste':
        factorsOverrides.productionWaste !== null,
      'has-override--retailWaste': factorsOverrides.retailWaste !== null,
      'has-override--consumerWaste': factorsOverrides.consumerWaste !== null,
      'has-override--technicalImprovement':
        factorsOverrides.technicalImprovement !== null,
    }">
      <FactorsOverrides @set-factors-override="setFactorsOverride" />
      <FoodsFactorsCard v-for="eat in eatGroups" :key="eat.id" :eat="eat" :open="isOpen[eat.id]"
        :has-error="factorsHasError" :current-values="factorsValues" :base-values="baseValues.factors"
        @toggle-open="toggleOpen" @update:factor="onFactorsUpdate" />
    </section>
    <section class="diet-configuration stack" v-show="currentTab === 'origin'">
      <h2>Origin</h2>
    </section>
  </main>
</template>
