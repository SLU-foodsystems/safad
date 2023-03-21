<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { generateIdValueMap } from "@/lib/utils";

import { eatIds, applyOverrides } from "../lib/foods-constants";

import FoodsAmountCard from "./FoodsAmountCard/FoodsAmountCard.vue";
import FoodsFactorsCard from "./FoodsFactorsCard/FoodsFactorsCard.vue";
import FoodsOriginCard from "./FoodsOriginCard/FoodsOriginCard.vue";
import FoodsOrganicCard from "./FoodsOrganicCard/FoodsOrganicCard.vue";

import TabsList from "./TabsList.vue";
import FactorsOverrides from "./FactorsOverrides.vue";
import foodsData from "../data/foods.json";
import { exportCsv } from "../lib/csv-io";

import RM from "../lib/ResultsManager";

const eatGroups = foodsData.data as EAT[];

type TabId = "amount" | "factors" | "origin" | "organic";

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
  {
    label: "Share of organic produce",
    id: "organic",
    caption: "Share of organic produce for each category of foods.",
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
    FoodsOrganicCard,
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

      envFactors: Array.from({ length: 10 }).map((_) => 0) as EnvFactors,

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

      organicValues: JSON.parse(JSON.stringify(this.baseValues.organic)),
      organicHasError: generateIdValueMap(eatIds, () => false),

      currentTab: DEFAULT_TAB as TabId,
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
        case "organic":
          return "Share of organic produce";
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
        case "organic":
          return "Share of each category of foods assumed to be produced using organic methods";
        default:
          console.error(
            `Invalid value for tab (${this.currentTab}) registered.`
          );
          return "";
      }
    },
    baseEnvFactors() {
      return RM.compute(this.baseValues).envImpactsSum as EnvFactors;
    },
    envFactorChange() {
      return this.envFactors.map((x, i) => x / this.baseEnvFactors[i] - 1);
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
      this.recomputeResults();
    },

    onFactorsUpdate(data: {
      id: string;
      factor: keyof Factors;
      value: number;
      error: boolean;
    }) {
      this.factorsValues[data.id][data.factor] = data.value;
      this.factorsHasError[data.id] = data.error;
      this.recomputeResults();
    },
    setFactorsOverridesValues(data: {
      factor: keyof Factors;
      value: number | null;
    }) {
      this.factorsOverrides[data.factor] = data.value;
      this.recomputeResults();
    },
    setFactorsOverridesMode(mode: "relative" | "absolute") {
      this.factorsOverridesMode = mode;
      this.recomputeResults();
    },

    onOriginUpdate(data: {
      id: string;
      country: string;
      value: number;
      error: boolean;
    }) {
      this.originValues[data.id][data.country] = data.value;
      this.originHasError[data.id] = data.error;
      this.recomputeResults();
    },

    onOrganicUpdate(data: { id: string; value: number; error: boolean }) {
      this.organicValues[data.id] = data.value;
      this.organicHasError[data.id] = data.error;
      this.recomputeResults();
    },

    recomputeResults() {
      const results = RM.compute({
        amount: this.amountValues,
        factors: applyOverrides(
          this.factorsOverridesMode,
          this.factorsOverrides,
          this.factorsValues
        ),
        origin: this.originValues,
      });
      this.envFactors = results.envImpactsSum as EnvFactors;
    },

    toFixed(value: number) {
      return value.toFixed(2);
    },
    toPercentage(value: number) {
      return (value * 100).toFixed(2) + " %";
    },
    percentageDirection(value: number): "inc" | "dec" | "eq" {
      const precision = 10 ** 4;
      const rounded = Math.round(value * precision) / precision;
      if (rounded === 0) return "eq";
      return rounded > 0 ? "inc" : "dec";
    },
  },

  beforeMount() {
    this.recomputeResults();
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
      <section v-show="currentTab === 'organic'">
        <FoodsOrganicCard v-for="eat in eatGroups" :key="eat.id" :eat="eat" :open="isOpen[eat.id]"
          :has-error="organicHasError" :current-values="organicValues" :base-values="baseValues.organic"
          @toggle-open="toggleOpen" @update:organic="onOrganicUpdate" />
      </section>
    </div>
  </main>

  <aside class="results-pane stack">
    <header>
      <h1>Results</h1>
    </header>
    <div class="stack">
      <table>
        <thead>
          <tr>
            <th>Impact factor</th>
            <th>Amount</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Climate impact, kg CO2e</td>
            <td v-text="toFixed(envFactors[0])" />
            <td v-text="toPercentage(envFactorChange[0])" :data-percentage-direction="
              percentageDirection(envFactorChange[0])
            " />
          </tr>
          <tr>
            <td>Carbon dioxide, kg CO2</td>
            <td v-text="toFixed(envFactors[1])" />
            <td v-text="toPercentage(envFactorChange[1])" :data-percentage-direction="
              percentageDirection(envFactorChange[1])
            " />
          </tr>
          <tr>
            <td>Methane, kg CH4</td>
            <td v-text="toFixed(envFactors[2])" />
            <td v-text="toPercentage(envFactorChange[2])" :data-percentage-direction="
              percentageDirection(envFactorChange[2])
            " />
          </tr>
          <tr>
            <td>Nitrous oxide, kg N2O</td>
            <td v-text="toFixed(envFactors[3])" />
            <td v-text="toPercentage(envFactorChange[3])" :data-percentage-direction="
              percentageDirection(envFactorChange[3])
            " />
          </tr>
          <tr>
            <td>kg HCFs</td>
            <td v-text="toFixed(envFactors[4])" />
            <td v-text="toPercentage(envFactorChange[4])" :data-percentage-direction="
              percentageDirection(envFactorChange[4])
            " />
          </tr>
          <tr>
            <td>Cropland use, m2</td>
            <td v-text="toFixed(envFactors[5])" />
            <td v-text="toPercentage(envFactorChange[5])" :data-percentage-direction="
              percentageDirection(envFactorChange[5])
            " />
          </tr>
          <tr>
            <td>Nitrogen application, kg N</td>
            <td v-text="toFixed(envFactors[6])" />
            <td v-text="toPercentage(envFactorChange[6])" :data-percentage-direction="
              percentageDirection(envFactorChange[6])
            " />
          </tr>
          <tr>
            <td>Phosphorus application, kg P</td>
            <td v-text="toFixed(envFactors[7])" />
            <td v-text="toPercentage(envFactorChange[7])" :data-percentage-direction="
              percentageDirection(envFactorChange[7])
            " />
          </tr>
          <tr>
            <td>Freshwater use, m3</td>
            <td v-text="toFixed(envFactors[8])" />
            <td v-text="toPercentage(envFactorChange[8])" :data-percentage-direction="
              percentageDirection(envFactorChange[8])
            " />
          </tr>
          <tr>
            <td>Extinction rate, E/MSY</td>
            <td v-text="toFixed(envFactors[9])" />
            <td v-text="toPercentage(envFactorChange[9])" :data-percentage-direction="
              percentageDirection(envFactorChange[9])
            " />
          </tr>
        </tbody>
      </table>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
@import "../styles/constants";

.table {
  table-layout: fixed;
  border-collapse: collapse;
  margin: 2em auto;
  width: 100%;
}

th, td {
  text-align: right;
  padding: 0.5em 0.25em ;
}

th:first-child,
td:first-child {
  text-align: left;
}

[data-percentage-direction="inc"] {
  &::before {
    content: "+";
  }

  color: $red_plum;
  font-weight: bold;
}

[data-percentage-direction="dec"] {
  color: $green_olive;
  font-weight: bold;
}

[data-percentage-direction="eq"] {
  opacity: 0.5;
}
</style>
