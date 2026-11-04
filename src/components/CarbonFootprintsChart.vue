<script setup lang="ts">
import { debounce, sum, truncate } from "@/lib/utils";
import StackedBarChart from "@/lib/charts/StackedBarChart";
import { useOnResize } from "@/lib/use-on-resize";
import { onMounted, ref, watch } from "vue";
import { aggregateHeaderIndex } from "@/lib/impacts-csv-utils";
import SLU_COLORS from "@/lib/slu-colors";

import DownloadableSvg from "@/components/DownloadableSvg.vue";
import PlaceholderSvg from "@/components/PlaceholderSvg.vue";
import MissingDataOverlay from "./MissingDataOverlay.vue";
import { defaultRpcNames } from "@/lib/efsa-names";
import type {
  FoodProcessEnergy,
  FoodPreparationYields,
  FoodRecipeAmounts,
} from "@/lib/food-processing-energy";

// Code: aggregated impacts
type GraphData = [string, number[]][];

const props = defineProps<{
  data: GraphData;
  processEnergy: FoodProcessEnergy;
  recipeAmounts: FoodRecipeAmounts;
  preparationYields: FoodPreparationYields;
}>();

const energyCarriers = [
  "Electricity",
  "Heating oil",
  "Natural gas",
  "Other fossil energy sources",
  "Bark and chips",
  "Pellets and briquettes",
  "Other renewable energy sources",
  "Diesel fuel",
  "District heating",
];

const totalEnergy = (energy: number[]) =>
  energy.reduce((total, value) => total + value, 0);
const sumProcessEnergy = (processes: Record<string, number[]>) =>
  Object.values(processes).reduce(
    (total, energy) =>
      total.map((value, index) => value + (energy[index] || 0)),
    Array.from({ length: energyCarriers.length }, () => 0)
  );

type Color = string;
const dataMap: [string, number, Color][] = [
  [
    "Transport",
    aggregateHeaderIndex("Transports (kg CO2e)"),
    SLU_COLORS.Blue.Sky,
  ],
  [
    "Packaging",
    aggregateHeaderIndex("Packaging (kg CO2e)"), // "#7ad172",
    SLU_COLORS.Blue.Cyan,
  ],
  [
    "Processing",
    aggregateHeaderIndex("Processing (kg CO2e)"), // "#cdba6c",
    SLU_COLORS.Blue.Seabay,
  ],
  [
    "Manure management",
    aggregateHeaderIndex("Manure management (kg CO2e)"),
    SLU_COLORS.Red.Apricot,
  ],
  [
    "Enteric fermentation",
    aggregateHeaderIndex("Enteric fermentation (kg CO2e)"),
    "rgb(175, 40, 52)",
  ],
  [
    "Land use change",
    aggregateHeaderIndex("Land use change (kg CO2e)"),
    SLU_COLORS.Red.Plum,
  ],
  [
    "Soil emissions",
    aggregateHeaderIndex("Soil emissions (kg CO2e)"),
    "rgb(84, 130, 53)",
  ],
  [
    "Capital goods",
    aggregateHeaderIndex("Capital goods (kg CO2e)"),
    SLU_COLORS.Gray.Feather,
  ],
  [
    "Energy, primary production",
    aggregateHeaderIndex("Energy primary production (kg CO2e)"),
    SLU_COLORS.Gray.Concrete,
  ],
  [
    "Mineral fertiliser production",
    aggregateHeaderIndex("Mineral fertiliser production (kg CO2e)"),
    SLU_COLORS.Gray.Titan,
  ],
];

const labels = dataMap.map((kv) => kv[0]);
const colors = dataMap.map((kvc) => kvc[2]);

const hasLoadedOnce = ref(false);

const svgContainer = ref<HTMLDivElement | null>(null);
const drawChart = async () => {
  if (props.data.length === 0 || !svgContainer.value) return;
  const data = props.data.map(([code, impactsArr]: [string, number[]]) => {
    const impactsObj = Object.fromEntries(
      dataMap.map(([k, idx]) => [k, impactsArr[idx]])
    );

    return {
      category: code,
      ...impactsObj,
    };
  });

  if (data.length === 0 || !data[0]) return;

  const columns = Object.keys(data[0]).filter((x) => x !== "category");

  const maxValue = Math.max(
    0,
    ...data.map((obj: Record<string, number | string>) =>
      sum(Object.values(obj).filter((v): v is number => typeof v === "number"))
    )
  );

  const svg = svgContainer.value.querySelector("svg");
  if (svg) {
    svgContainer.value.removeChild(svg);
  }

  const rect = svgContainer.value.getBoundingClientRect();

  const width = rect.width;
  const height = rect.width * 0.75;

  const rpcNames = await defaultRpcNames();

  const labelTextMapper = (code: string) =>
    rpcNames[code] ? truncate(rpcNames[code], 30) : code;

  StackedBarChart(svgContainer.value, data, columns, {
    maxValue,
    width,
    height,
    labelLayout: "slanted",
    labelTextMapper,
    axisLabels: {
      y: "kg CO2e per kg",
    },
    tooltipUnit: "kg CO2e per kg",
    colors,
  });

  hasLoadedOnce.value = true;
};

watch(() => props.data, drawChart);
useOnResize(debounce(drawChart, 200));
onMounted(drawChart);
</script>

<template>
  <DownloadableSvg
    class="carbon-footprints-chart"
    mode="html"
    filename="carbon-footprints"
  >
    <div class="carbon-footprints-chart__labels">
      <p><strong>Lifecycle Stage</strong></p>
      <p v-for="(label, i) in labels">
        <span :style="{ background: colors[i] }" />
        {{ label }}
      </p>
    </div>
    <div class="carbon-footprints-chart__canvas" ref="svgContainer">
      <PlaceholderSvg :aspect-ratio="0.6" />
    </div>
    <MissingDataOverlay :show="props.data.length === 0 && hasLoadedOnce">
      Select at least one food item in the list.
    </MissingDataOverlay>
  </DownloadableSvg>
  <div class="process-energy-debug">
    <h3>Process energy preview (debug, per 1 kg input)</h3>
    <p v-if="Object.keys(processEnergy).length === 0">
      Select at least one food item in the list.
    </p>
    <table v-else>
      <thead>
        <tr>
          <th>Food code</th>
          <th>Process</th>
          <th>Total MJ/kg</th>
          <th v-for="carrier in energyCarriers" :key="carrier">
            {{ carrier }}
          </th>
        </tr>
      </thead>
      <tbody>
        <template
          v-for="(processes, foodCode) in processEnergy"
          :key="foodCode"
        >
          <tr class="process-energy-debug__total">
            <td>{{ foodCode }}</td>
            <td><strong>Total</strong></td>
            <td>{{ totalEnergy(sumProcessEnergy(processes)).toFixed(3) }}</td>
            <td
              v-for="(value, index) in sumProcessEnergy(processes)"
              :key="index"
            >
              {{ value.toFixed(3) }}
            </td>
          </tr>
          <tr
            v-for="(energy, processCode) in processes"
            :key="`${foodCode}-${processCode}`"
          >
            <td>{{ foodCode }}</td>
            <td>{{ processCode }}</td>
            <td>{{ totalEnergy(energy).toFixed(3) }}</td>
            <td v-for="(value, index) in energy" :key="index">
              {{ value.toFixed(3) }}
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
  <div class="process-energy-debug">
    <h3>Intermediate recipe amounts (debug, per 1 kg input)</h3>
    <table v-if="Object.keys(preparationYields).length > 0">
      <thead>
        <tr>
          <th>Food code</th>
          <th>Preparation reverse yield</th>
          <th>Input for 1 kg output (kg)</th>
          <th>Output from 1 kg input (kg)</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(preparationYield, foodCode) in preparationYields"
          :key="foodCode"
        >
          <td>{{ foodCode }}</td>
          <td>
            {{ preparationYield === null ? "—" : preparationYield.toFixed(3) }}
          </td>
          <td>
            {{ preparationYield === null ? "—" : preparationYield.toFixed(3) }}
          </td>
          <td>
            {{
              preparationYield === null
                ? "—"
                : (1 / preparationYield).toFixed(3)
            }}
          </td>
        </tr>
      </tbody>
    </table>
    <table v-if="Object.keys(recipeAmounts).length > 0">
      <thead>
        <tr>
          <th>Food code</th>
          <th>Level</th>
          <th>Component code</th>
          <th>Gross g</th>
          <th>Reverse yield</th>
          <th>Net g</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(amounts, foodCode) in recipeAmounts" :key="foodCode">
          <tr
            v-for="(entry, index) in amounts"
            :key="`${foodCode}-${entry.component}-${index}`"
          >
            <td>{{ foodCode }}</td>
            <td>{{ entry.level }}</td>
            <td>{{ entry.component }}</td>
            <td>{{ entry.grossAmount.toFixed(3) }}</td>
            <td>{{ entry.reverseYield.toFixed(3) }}</td>
            <td>{{ entry.netAmount.toFixed(3) }}</td>
          </tr>
        </template>
      </tbody>
    </table>
    <p v-else>Select at least one food item in the list.</p>
  </div>
</template>

<style lang="scss">
.carbon-footprints-chart {
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-end;
  position: relative;

  @media (max-width: 40em) {
    flex-direction: column;
  }
}

.carbon-footprints-chart__labels {
  flex-basis: 18em;
  flex-grow: 0;
  flex-shrink: 1;
  min-width: 10em;
  font-size: 0.85em;

  p {
    margin-bottom: 0.5em;
    display: flex;
    align-items: center;
    gap: 0.5em;

    /* Label color indicators (circles) */
    > span {
      $size: 1.25em;
      content: "";
      display: inline-block;
      width: $size;
      height: $size;
      background: gray;
      border-radius: $size;
      box-shadow: inset 0 0 0 1px rgba(black, 0.2);
    }
  }
}

.carbon-footprints-chart__canvas {
  flex-basis: auto;
  flex-grow: 1;
  flex-shrink: 0;
}

.process-energy-debug {
  margin-top: 1.5em;
  overflow-x: auto;

  table {
    border-collapse: collapse;
    font-size: 0.8em;
    white-space: nowrap;
  }

  th,
  td {
    border: 1px solid #ccc;
    padding: 0.25em 0.5em;
    text-align: right;
    font-family: monospace;
    font-size: 1.125em;
  }

  th:first-child,
  th:nth-child(2),
  td:first-child,
  td:nth-child(2) {
    text-align: left;
  }

  &__total td {
    border-top: 2px solid #888;
    border-bottom: 2px solid #888;
    background: #ddd;
  }
}
</style>
