<script lang="ts">
import { defineComponent } from "vue";
import {
  downloadCsv,
  generateCsvData,
  generateIdValueMap,
  toPrecision,
} from "@/lib/utils";

import FoodsAmountCard from "./components/FoodsAmountCard/FoodsAmountCard.vue";
import FoodsFactorsCard from "./components/FoodsFactorsCard/FoodsFactorsCard.vue";
import FoodsOriginCard from "./components/FoodsOriginCard/FoodsOriginCard.vue";

import TabsList from "./components/TabsList.vue";
import FactorsOverrides from "./components/FactorsOverrides.vue";
import foodsData from "./data/foods.json";
import baseValues from "./data/original-values";

const eatGroups = foodsData.data as EAT[];
const eatIds = eatGroups.map((eat) => eat.id);
const suaIds = eatGroups.flatMap((x) =>
  x.fbs.flatMap((y) => y.sua.map((z) => z.id))
);

const suaToFbsMap = new Map();
eatGroups.forEach((eat) => {
  eat.fbs.forEach((fbs) => {
    fbs.sua.forEach((sua) => {
      suaToFbsMap.set(sua.id, fbs.id);
    });
  });
});

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
const DEFAULT_TAB = tabIds[2];

export default defineComponent({
  components: {
    FactorsOverrides,
    FoodsAmountCard,
    FoodsFactorsCard,
    FoodsOriginCard,
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

      originValues: structuredClone(baseValues.origin),
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
      const header = [
        "SUA Id",
        "Amount (g)",
        "Production Waste (%)",
        "Retail Waste (%)",
        "Consumer Waste (%)",
        "Technical Improvement (%)",
        "Origin (country1:amount1 country2:amount2 ...)",
      ];

      const fbsTreated = new Set();

      const rows = suaIds.map((id) => {
        const fbsId = suaToFbsMap.get(id);
        if (fbsTreated.has(fbsId)) {
          return [
            id,
            toPrecision(this.amountValues[id]),
            "",
            "",
            "",
            "",
            ""
          ];
        }

        fbsTreated.add(fbsId);

        const originString = Object.entries(
          this.originValues[fbsId] as OriginMap
        )
          .map(([country, value]) => `${country}:${toPrecision(value)}`)
          .join(" ");

        const getFactor = (factor: keyof Factors) =>
          this.factorsOverrides[factor] || this.factorsValues[fbsId][factor];

        return [
          id,
          this.amountValues[id],
          getFactor("productionWaste"),
          getFactor("retailWaste"),
          getFactor("consumerWaste"),
          getFactor("technicalImprovement"),
          originString,
        ].map((x) =>
          x instanceof Number ? String(toPrecision(x as number)) : x
        );
      });

      const csv = generateCsvData(header, rows);

      const now = new Date();
      const twoDigit = (x: number) => (x > 9 ? "" : "0") + x;
      const datetimeStamp =
      `${now.getFullYear()}${twoDigit(now.getMonth() + 1)}${twoDigit(now.getDate())}`;
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

    onOriginUpdate(data: {
      id: string;
      country: string;
      value: number;
      error: boolean;
    }) {
      console.log("originUpdate", data);
      this.originValues[data.id][data.country] = data.value;
      this.originHasError[data.id] = data.error;
    },
  },
});
</script>

<template>
  <aside class="side-bar stack">
    <header class="cluster">
      <img src="./assets/slu-logo.svg" />
      <h1>Foods Benchmarker</h1>
    </header>
    <TabsList :tabs="tabs" :current="currentTab" @click:tab="changeTab" />
    <footer class="cluster">
      <button class="button">&lt; Go Back</button>
      <button class="button button--accent" @click="exportCsv">Save</button>
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
        <FactorsOverrides @set-factors-override="setFactorsOverride" />
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
