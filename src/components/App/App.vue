<script lang="ts" setup>
import { ref, watch, computed, onMounted } from "vue";
import * as Comlink from "comlink";

import * as DefaultInputFiles from "@/lib/default-input-files";
import MetaFile from "@/lib/MetaFile";
import ResultsEngine from "@/lib/ResultsEngine";

import { SAFAD_FILE_NAMES } from "@/lib/constants";
import { resetFile } from "@/lib/file-interface-utils";
import { downloadAsCsv, downloadAsXlsx } from "@/lib/io";
import { debounce, padLeft, stringifyCsvData } from "@/lib/utils";
import {
  labeledAndFilteredImpacts,
  DETAILED_RESULTS_HEADER,
} from "@/lib/impacts-csv-utils";
import {
  generateSfaResults,
  SFA_RESULTS_HEADER,
} from "@/lib/sfa-results-generator";

import LoadingButton from "@/components/LoadingButton.vue";
import FileSelector from "@/components/FileSelector.vue";
import AsyncFoodsListbox from "@/components/FoodsListbox/AsyncFoodsListbox";
// Charts
import CarbonFootprintsChart from "@/components/CarbonFootprintsChart.vue";
import DietPieCharts from "@/components/DietPieCharts.vue";
import EnvFootprintCharts from "@/components/EnvFootprintCharts.vue";
import PlanetaryBoundariesChart from "@/components/PlanetaryBoundariesChart.vue";

import ImpactsPerRpcCategoryChart from "@/components/ImpactsPerCategoryCharts/ImpactsPerRpcCategoryChart.vue";
import ImpactsPerFoodCategoryChart from "@/components/ImpactsPerCategoryCharts/ImpactsPerFoodCategoryChart.vue";

import setupCharts from "./charts";
import initFileInterfaces from "./init-file-interfaces";
import readableDietName from "./readable-diet-name";
import { extractRpcNamesFromRecipe } from "@/lib/efsa-names";
import {
  CsvValidationError,
  CsvValidationErrorType,
} from "@/lib/input-files-parsers";
import {
  DIET_RESULTS_HEADER,
  computeDietFootprints,
} from "@/lib/diet-output-generator";

import ResultsEngineWorker from "@/lib/results-engine-worker?worker"
import type ResultsEngineInstance from "@/lib/ResultsEngine"

const APP_VERSION = __APP_VERSION__;

const RE = Comlink.wrap<ResultsEngineInstance>(new ResultsEngineWorker());

const countryCode = ref("SE");
const isLoading = ref(false);

const {
  diet,
  sfaRecipes,
  footprintsRpcsFile,
  dietFile,
  foodsRecipesFile,
  rpcOriginWasteFile,
  processesEnergyDemandsFile,
  preparationProcessesFile,
  packagingCodesFile,
  wasteRetailAndConsumerFile,
  emissionsFactorsEnergyFile,
  emissionsFactorsPackagingFile,
  emissionsFactorsTransportFile,
  sfaRecipesFile,
} = initFileInterfaces(RE);

const missingDietPoland = computed(
  () => dietFile.value.state === "default" && countryCode.value === "PL"
);
const defaultDietName = readableDietName(countryCode);
const dietName = computed(() =>
  dietFile.value.state === "custom"
    ? `Custom diet, ${dietFile.value.name}`
    : defaultDietName.value
);

const foodCodes = ref<string[]>([]);
const foodNamesPromise = computed(async () => {
  const f = foodsRecipesFile.value;
  const rawData =
    f.state === "default"
      ? await f.getDefault(countryCode.value)
      : f.data || "";
  return extractRpcNamesFromRecipe(rawData);
});

const selectedFoodCodes = ref<string[]>([
  "A.19.01.002.003", // Pizza
  "A.19.10.001", // Vegetable/herb soup
  "I.19.01.001.018", // Pierogi, with vegetables
  "I.19.01.003.017", // Lasagna
]);

const setSelectedFoodCodes = (codes: string[]) => {
  selectedFoodCodes.value = codes;
  updateChartData();
};

/**
 * Methods
 */

const castData = (
  data: string[][],
  nbrStartIndex: number,
  nbrEndIndex: number
) =>
  data.map((row, rowIdx) => {
    if (rowIdx === 0) return row;
    return row.map((x, i) => {
      const isOutsideRange = i < nbrStartIndex || i > nbrEndIndex;
      if (isOutsideRange) return x;
      const casted = Number.parseFloat(x);
      // If casting was unsuccessful, e.g. for "NA" value instead of number,
      // fall back to original string value.
      return Number.isNaN(casted) ? x : casted;
    });
  });

const downloadFootprintsOfFoods = async (filetype: "csv" | "xlsx") => {
  const impactsOfRecipe = labeledAndFilteredImpacts(
    await RE.computeImpactsOfRecipe(),
    await foodNamesPromise.value
  );

  const data = [DETAILED_RESULTS_HEADER, ...impactsOfRecipe];

  if (filetype === "csv") {
    downloadAsCsv(SAFAD_FILE_NAMES.Output.FootprintsPerFood, data);
  } else {
    const nbrStartIndex = DETAILED_RESULTS_HEADER.indexOf("Amount (g)");
    const nbrEndIndex = DETAILED_RESULTS_HEADER.indexOf("Processes") - 1;

    await downloadAsXlsx(
      SAFAD_FILE_NAMES.Output.FootprintsPerFood.replace(".csv", ".xlsx"),
      [["Data", castData(data, nbrStartIndex, nbrEndIndex)]]
    );
  }
};

const downloadFootprintsOfDiets = async (filetype: "csv" | "xlsx") => {
  const data = [
    DIET_RESULTS_HEADER,
    ... (await computeDietFootprints(diet.value, RE, await foodNamesPromise.value)),
  ];

  if (filetype === "csv") {
    downloadAsCsv(SAFAD_FILE_NAMES.Output.FootprintsPerDiet, data);
  } else {
    const nbrStartIndex = DIET_RESULTS_HEADER.indexOf("Amount (g)");
    const nbrEndIndex = DIET_RESULTS_HEADER.indexOf("Processes") - 1;
    await downloadAsXlsx(
      SAFAD_FILE_NAMES.Output.FootprintsPerDiet.replace(".csv", ".xlsx"),
      [["Diet footprints", castData(data, nbrStartIndex, nbrEndIndex)]]
    );
  }
};

const downloadFootprintsOfSfaRecipes = async (filetype: "csv" | "xlsx") => {
  const sfaResultsRows = await generateSfaResults(
    sfaRecipes.value,
    RE,
    await foodNamesPromise.value
  );

  const data = [SFA_RESULTS_HEADER, ...sfaResultsRows];
  if (filetype === "csv") {
    downloadAsCsv(SAFAD_FILE_NAMES.Output.FootprintsPerSfaFood, data);
  } else {
    const nbrStartIndex = SFA_RESULTS_HEADER.indexOf("Gross Amount (g)");
    const nbrEndIndex = SFA_RESULTS_HEADER.indexOf("Processes") - 1;
    await downloadAsXlsx(
      SAFAD_FILE_NAMES.Output.FootprintsPerSfaFood.replace(".csv", ".xlsx"),
      [["Data", castData(data, nbrStartIndex, nbrEndIndex)]]
    );
  }
};

const metaFileHandler = new MetaFile({
  emissionsFactorsPackagingFile: emissionsFactorsPackagingFile.value,
  emissionsFactorsEnergyFile: emissionsFactorsEnergyFile.value,
  emissionsFactorsTransportFile: emissionsFactorsTransportFile.value,
  foodsRecipesFile: foodsRecipesFile.value,
  rpcOriginWasteFile: rpcOriginWasteFile.value,
  processesEnergyDemandsFile: processesEnergyDemandsFile.value,
  preparationProcessesFile: preparationProcessesFile.value,
  packagingCodesFile: packagingCodesFile.value,
  wasteRetailAndConsumerFile: wasteRetailAndConsumerFile.value,
  footprintsRpcsFile: footprintsRpcsFile.value,
  dietFile: dietFile.value,
  sfaRecipesFile: sfaRecipesFile.value,
});

const downloadZip = async () => {
  const fileSaverImport = import("file-saver");
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const { saveAs } = await fileSaverImport;

  const addFile = async (f: InputFile<any>) => {
    const data =
      f.state === "default"
        ? await f.getDefault(countryCode.value)
        : f.data || "";
    const name = f.name || f.defaultName(countryCode.value);
    zip.file(name, data);
  };

  const files: InputFile<any>[] = [
    dietFile.value,
    emissionsFactorsEnergyFile.value,
    emissionsFactorsPackagingFile.value,
    emissionsFactorsTransportFile.value,
    foodsRecipesFile.value,
    footprintsRpcsFile.value,
    preparationProcessesFile.value,
    processesEnergyDemandsFile.value,
    rpcOriginWasteFile.value,
    sfaRecipesFile.value,
    wasteRetailAndConsumerFile.value,
  ];
  const addFilePromises = files.map((f) => addFile(f));

  zip.file("SAFAD Info.txt", metaFileHandler.toString());

  if (countryCode.value === "SE") {
    const sfaResultsRows = await generateSfaResults(
      sfaRecipes.value,
      RE,
      await foodNamesPromise.value
    );
    const data = stringifyCsvData([SFA_RESULTS_HEADER, ...sfaResultsRows]);
    zip.file(SAFAD_FILE_NAMES.Output.FootprintsPerSfaFood, data);
  }

  const impactsOfRecipe = labeledAndFilteredImpacts(
    await RE.computeImpactsOfRecipe(),
    await foodNamesPromise.value
  );
  const impactsOfRecipeCsv = stringifyCsvData([
    DETAILED_RESULTS_HEADER,
    ...impactsOfRecipe,
  ]);

  zip.file(SAFAD_FILE_NAMES.Output.FootprintsPerFood, impactsOfRecipeCsv);

  const detailedDietImpactsCsv = stringifyCsvData([
    DIET_RESULTS_HEADER,
    await ...computeDietFootprints(diet.value, RE, await foodNamesPromise.value),
  ]);
  zip.file(SAFAD_FILE_NAMES.Output.FootprintsPerDiet, detailedDietImpactsCsv);

  await Promise.allSettled(addFilePromises);

  const content = await zip.generateAsync({ type: "blob" });
  const d = new Date();
  const date = [
    d.getFullYear(),
    padLeft(d.getMonth() + 1, 2),
    padLeft(d.getDate(), 2),
  ].join("-");
  saveAs(content, `SAFAD Output ${date}.zip`);
};

const {
  carbonFootprints,
  dietFootprintsTotal,
  dietFootprintsPerRpcCategory,
  dietFootprintsPerFoodsCategory,
  recompute: updateChartData,
} = setupCharts(RE, diet, selectedFoodCodes);

/**
 * Whenever the countryCode dropdown is changed, we need to
 * - Update the ResultsEngine
 * - Re-load all country-dependant files
 */
watch(countryCode, async () => {
  await RE.setCountryCode(countryCode.value);

  const promises = [];

  isLoading.value = true;
  if (rpcOriginWasteFile.value?.state === "default") {
    promises.push(resetFile(countryCode.value, rpcOriginWasteFile.value));
  }
  if (wasteRetailAndConsumerFile.value?.state === "default") {
    promises.push(
      resetFile(countryCode.value, wasteRetailAndConsumerFile.value)
    );
  }
  if (dietFile.value?.state === "default") {
    const p = resetFile(countryCode.value, dietFile.value).catch((err) => {
      const fileIsEmpty =
        err instanceof CsvValidationError &&
        err.type === CsvValidationErrorType.Empty;
      const isPolandDiet = countryCode.value === "PL";

      if (fileIsEmpty && isPolandDiet) {
        diet.value = [];
      } else {
        throw err;
      }
    });

    promises.push(p);
  }

  await Promise.all(promises);

  updateChartData();

  isLoading.value = false;
});

const debouncedUpdateCharts = debounce(updateChartData, 200);
let isMounted = false;
// Update chartdata whenever any of the files are changed
watch(
  [
    diet.value,
    footprintsRpcsFile.value,
    dietFile.value,
    foodsRecipesFile.value,
    rpcOriginWasteFile.value,
    processesEnergyDemandsFile.value,
    preparationProcessesFile.value,
    packagingCodesFile.value,
    wasteRetailAndConsumerFile.value,
    emissionsFactorsEnergyFile.value,
    emissionsFactorsPackagingFile.value,
    emissionsFactorsTransportFile.value,
  ],
  () => {
    if (isMounted) debouncedUpdateCharts();
  }
);

onMounted(async () => {
  isLoading.value = true;

  const setupDefaultDiet =
    countryCode.value === "PL"
      ? Promise.resolve(dietFile.value.setter([]))
      : dietFile.value.getDefault(countryCode.value).then((diet: string) => {
          dietFile.value?.setter(dietFile.value.parser(diet));
        });

  const tasks: Promise<any>[] = [
    DefaultInputFiles.configureResultsEngine(RE, countryCode.value),
    // SFA Recipes and the Diet needs to be set to initial value, as not handled
    // by the configureResultsEngine utility.
    sfaRecipesFile.value.getDefault(countryCode.value).then((data: string) => {
      sfaRecipesFile.value.setter(sfaRecipesFile.value.parser(data));
    }),
    setupDefaultDiet,
  ];

  await Promise.all(tasks);

  foodCodes.value = [...RE.getFoodCodes()].sort();
  updateChartData();

  isLoading.value = false;
  isMounted = true;
});
</script>

<template>
  <section class="start-page">
    <header class="top-bar">
      <div class="page-wrap cluster cluster--between">
        <div class="cluster">
          <a
            class="top-bar__logo"
            href="https://slu.se"
            target="_blank"
            rel="nofollow"
          >
            <img
              src="@/assets/slu-logo.svg"
              width="64"
              height="64"
              alt="SLU logo"
            />
          </a>
          <nav class="cluster" hidden>
            <a href="#0">Home</a>
            <a href="#0">About</a>
            <a href="#0">Support</a>
            <a href="#0">Publications</a>
          </nav>
        </div>

        <a
          class="top-bar__planeat-logo"
          href="https://planeat-project.eu/"
          target="_blank"
          rel="nofollow"
        >
          <img
            src="@/assets/planeat-logo.png"
            width="543"
            height="142"
            alt="Plan'Eat"
          />
        </a>
      </div>
    </header>

    <div class="hero">
      <div class="hero__inner page-wrap">
        <div class="hero__image">
          <img
            src="@/assets/people-cooking.svg"
            width="1000"
            height="803"
            alt="People cooking"
          />
        </div>
        <div>
          <h1>
            SAFAD<br />Sustainability Assessment of
            <br data-remove-on-mobile />Foods and Diets
          </h1>
          <h2>
            Calculate the impact of foods and diets using eight environmental
            indicators and indicators for animal welfare and use of antibiotics.
          </h2>
        </div>
      </div>
    </div>
    <div class="info-bar">
      <div class="page-wrap">
        <div class="cluster cluster--between">
          <div><strong>Version:</strong> {{ APP_VERSION }}</div>
          <div class="country-select">
            <label class="cluster">
              <span>Country:</span>
              <select v-model="countryCode">
                <option value="FR">France</option>
                <option value="DE">Germany</option>
                <option value="GR">Greece</option>
                <option value="HU">Hungary</option>
                <option value="IE">Ireland</option>
                <option value="IT">Italy</option>
                <option value="PL">Poland</option>
                <option value="ES">Spain</option>
                <option value="SE">Sweden</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="page-wrap stack stack-l">
      <section class="stack stack-l">
        <h2 class="hr-header">
          <span>Impacts from foods</span>
        </h2>
        <div class="foods-footprints-intro">
          <p>
            Footprints shown here are for foods on the market of the choosen
            country considering the origin of different raw commodities. For
            example, a share of a commodity (e.g. wheat or tomateos) can be
            grown domestically while the rest is imported. The footprint of the
            commoditiy is therefore an average of the footprint from these
            countries weighted according to the shares of the production taking
            place in different countries. Footprints here also accounts for
            waste in production, at the retailer and at the consumer.
          </p>
          <div class="stack">
            <h3>Download footprints of all foods</h3>
            <div class="cluster">
              Plain data (.csv):
              <div class="cluster">
                <button
                  class="button button--accent button--slim"
                  @click="() => downloadFootprintsOfFoods('csv')"
                >
                  <img src="@/assets/download-w.svg" alt="" />
                  Download for EFSA recipes
                </button>
                <button
                  class="button button--slim"
                  @click="() => downloadFootprintsOfSfaRecipes('csv')"
                >
                  <img src="@/assets/download.svg" alt="" />
                  Download for SFA recipes
                </button>
              </div>
            </div>
            <div class="cluster">
              Spreadsheet (.xlsx):
              <div class="cluster">
                <LoadingButton
                  class="button button--accent button--slim"
                  :click-handler="() => downloadFootprintsOfFoods('xlsx')"
                >
                  <img src="@/assets/download-w.svg" alt="" />
                  Download for EFSA recipes
                </LoadingButton>
                <LoadingButton
                  class="button button--slim"
                  :click-handler="() => downloadFootprintsOfSfaRecipes('xlsx')"
                >
                  <img src="@/assets/download.svg" alt="" />
                  Download for SFA recipes
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
        <div class="results-grid-large">
          <div class="results-grid-large__graph">
            <h3>Carbon footprint preview (per kg food)</h3>
            <CarbonFootprintsChart :data="carbonFootprints" />
          </div>
          <div class="results-grid-large__aside stack">
            <div>
              <h3>
                <label id="listbox-label"
                  >Choose which products to display</label
                >
              </h3>
              <AsyncFoodsListbox
                :food-codes="foodCodes"
                :initial-values="selectedFoodCodes"
                @change="setSelectedFoodCodes"
              />
            </div>
          </div>
        </div>
        <h3 class="hr-header hr-header--right-only">
          <span>Environmental Impacts</span>
        </h3>
        <div class="results-grid-small">
          <EnvFootprintCharts :data="carbonFootprints" />
        </div>
      </section>

      <section class="stack stack-l">
        <h2 class="hr-header">
          <span>Impacts from diet</span>
        </h2>
        <div class="cluster planetary-boundaries-section">
          <div v-if="missingDietPoland" class="stack diet-info-box">
            <h3><strong>No diet data available for Poland.</strong></h3>
            <p>
              You can still upload a custom diet at the bottom of the page, or
              select another country at the top of the page.
            </p>
          </div>
          <div v-else class="stack diet-info-box">
            <h3><strong>Selected diet:</strong> {{ dietName }}</h3>
            <p>
              The footprints for the whole diet is calculated by multiplying the
              amount of different food products with the footprints of the food
              items. Download the footprints below, or see the charts on this
              page for examples of what the data can show.
            </p>
            <p>
              Upon changing the country at the top of the page, another diet
              will be selected. If you want to test a modified or custom diet,
              you can upload a file towards the bottom of the page.
            </p>
            <h3>Download footprints of the selected diet</h3>
            <div class="cluster">
              Plain data:
              <button
                class="button button--accent button--slim"
                @click="() => downloadFootprintsOfDiets('csv')"
              >
                <img src="@/assets/download-w.svg" alt="" />
                Download as .csv-file
              </button>
            </div>
            <div class="cluster">
              Spreadsheet:
              <LoadingButton
                class="button--accent button--slim"
                :click-handler="() => downloadFootprintsOfDiets('xlsx')"
              >
                <img src="@/assets/download-w.svg" alt="" />
                Download as .xlsx-file
              </LoadingButton>
            </div>
          </div>
          <div class="stack">
            <h3 class="hr-header hr-header--right-only">
              <span>Impacts in relation to the planetary boundaries</span>
            </h3>
            <PlanetaryBoundariesChart
              :data="dietFootprintsTotal"
              :diet-missing="missingDietPoland"
            />
          </div>
        </div>

        <h3 class="hr-header hr-header--right-only">
          <span>Contributions to impacts from different food groups</span>
        </h3>
        <div>
          <ImpactsPerFoodCategoryChart
            :impactsPerCategory="dietFootprintsPerFoodsCategory"
            :diet-missing="missingDietPoland"
          />
        </div>
        <h3 class="hr-header hr-header--right-only">
          <span>Contributions to impacts from different raw commodities</span>
        </h3>
        <div>
          <ImpactsPerRpcCategoryChart
            :impactsPerCategory="dietFootprintsPerRpcCategory"
            :diet-missing="missingDietPoland"
          />
        </div>
        <h3 class="hr-header hr-header--right-only">
          <span
            >Contributions to the carbon footprint from different gases and
            lifecycle stages</span
          >
        </h3>
        <div class="diet-pie-charts">
          <DietPieCharts
            :diet-footprints="dietFootprintsTotal"
            :diet-missing="missingDietPoland"
          />
        </div>
      </section>

      <div class="inner-thinner-wrap stack stack-l">
        <h2 class="hr-header">
          <span>Configure Data</span>
        </h2>

        <div>
          <p>
            In the SAFAD tool, input data (Input, parameter, and emission factor
            files) can easily be configured. To configure a file, download the
            default file using the Download file button. Once configured, the
            custom file can be uploaded using the Upload Custom file. The custom
            file must be in the same format and uploaded as a .csv file. When
            all custom files are uploaded, the new footprint for the diet or
            foods can be downloaded.
          </p>
        </div>
        <h3 class="hr-header hr-header--right-only">
          <span>Input Data</span>
        </h3>

        <FileSelector
          file-label="Footprints of raw primary commodities, e.g. wheat, tomatoes, beef etc."
          :country-code="countryCode"
          :file-interface="footprintsRpcsFile"
        />

        <FileSelector
          file-label="Specification of the diet to be assessed, i.e. amounts of different foods"
          :country-code="countryCode"
          :file-interface="dietFile"
        />

        <FileSelector
          file-label="Specification of the SFA recipe file"
          :country-code="countryCode"
          :file-interface="sfaRecipesFile"
        />

        <h3 class="hr-header hr-header--right-only">
          <span>Parameter Files</span>
        </h3>

        <FileSelector
          file-label="Recipes of the foods, e.g. the amount of flour, oil and water in 1 kg bread"
          :country-code="countryCode"
          :file-interface="foodsRecipesFile"
        />

        <FileSelector
          :country-code="countryCode"
          file-label="Origin and waste level of raw primary commodities"
          :fileInterface="rpcOriginWasteFile"
        />

        <FileSelector
          file-label="Energy demand for different processing processes"
          :country-code="countryCode"
          :file-interface="processesEnergyDemandsFile"
        />

        <FileSelector
          file-label="Preparation Processes"
          :country-code="countryCode"
          :file-interface="preparationProcessesFile"
        />
        <FileSelector
          file-label="Packaging codes for different foods"
          :country-code="countryCode"
          :file-interface="packagingCodesFile"
        />
        <FileSelector
          file-label="Food waste at retail and at the consumer"
          :country-code="countryCode"
          :file-interface="wasteRetailAndConsumerFile"
        />

        <h3 class="hr-header hr-header--right-only">
          <span>Emissions Factors</span>
        </h3>
        <FileSelector
          file-label="Emission factors for different packaging materials"
          :country-code="countryCode"
          :file-interface="emissionsFactorsPackagingFile"
        />
        <FileSelector
          file-label="Emission factors for energy sources"
          :country-code="countryCode"
          :file-interface="emissionsFactorsEnergyFile"
        />
        <FileSelector
          file-label="Emission factors for transports between countries"
          :country-code="countryCode"
          :file-interface="emissionsFactorsTransportFile"
        />
        <h2 class="hr-header">
          <span>Download complete data package</span>
        </h2>
        <section class="download-section stack">
          <div class="stack">
            <div class="cluster cluster--between">
              <span class="cluster">
                <img
                  src="@/assets/zip.svg"
                  width="2253"
                  height="2250"
                  loading="lazy"
                  alt=""
                  class="zip-icon"
                />
                <h2>Complete package of files</h2>
              </span>
              <LoadingButton
                class="button--accent"
                :click-handler="downloadZip"
              >
                <img src="@/assets/download-w.svg" alt="" />
                Download
              </LoadingButton>
            </div>
            <p>
              Download a zip-file with all input- and output files bundled
              together.
            </p>
          </div>
        </section>
      </div>
    </div>

    <footer class="page-footer stack stack-l">
      <div class="page-wrap page-footer__content">
        <div class="stack">
          <a href="https://slu.se/" target="_blank">
            <img
              src="@/assets/slu-logo-bw.svg"
              alt="Swedish Agricultural University"
              width="200"
              height="200"
              loading="lazy"
            />
          </a>
          <p>
            Swedish University of Agricultural Sciences (SLU) is an academic
            institution specializing in research and education in fields related
            to agriculture, forestry, environmental sciences, and sustainable
            development.
          </p>
        </div>
        <div class="stack">
          <a href="https://planeat-project.eu/" target="_blank">
            <img
              src="@/assets/planeat-logo-white.png"
              alt="Plan'Eat"
              width="543"
              height="142"
            />
          </a>
          <p>
            PLAN’EAT is a Horizon Europe research project, bringing together 24
            partners and running from September 2022 to 2026.
          </p>
        </div>
        <div class="stack">
          <a
            href="https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls/horizon-europe_en"
            target="_blank"
          >
            <img
              src="@/assets/eu-flag.svg"
              width="81"
              height="54"
              alt="EU Flag"
            />
          </a>
          <p>
            The Plan’eat project has received funding from the European Union’s
            Horizon Europe Research and Innovation programme under Grant
            Agreement n° 101061023. Views and opinions expressed are however
            those of the author(s) only and do not necessarily reflect those of
            the European Union.
          </p>
        </div>
      </div>
    </footer>
    <div class="sub-footer">
      <div class="u-tac">
        This code of this web-application is open-source and available on
        <a
          href="https://github.com/SLU-foodsystems/safad"
          target="_blank"
          ref="noopener nofollow"
          >github.com/SLU-foodsystems/safad</a
        >.
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@import "../../styles/constants";

.inner-thinner-wrap {
  margin: 0 auto;
  max-width: 70rem;
}

.page-footer,
.sub-footer {
  ::selection {
    color: $green_forest;
    background: white;
  }
}

.page-footer {
  padding: 4em 0;
  margin-top: 6em;
  background: $green_forest;
  color: white;
}

.page-footer__content {
  display: grid;
  gap: 2em;
  grid-template-columns: repeat(auto-fit, minmax(20em, 1fr));

  img {
    width: auto;
    color: white;
    height: 4em;
  }
}

.sub-footer {
  font-size: 0.75em;
  padding: 1em 0;
  background: darken($green_forest, 10%);
  color: white;
}

.download-section {
  text-align: left;
  position: relative;

  .zip-icon {
    width: 3em;
    height: 3em;
  }

  h2 {
    margin-bottom: 0;
  }
  p {
    font-size: 1.125em;
  }
}

.foods-footprints-intro {
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;

  display: grid;
  gap: 2em;
  grid-template-columns: 1fr 1fr;

  @media (max-width: 45rem) {
    grid-template-columns: 1fr;
  }

  h4 {
    margin-top: 0;
  }

  > div .cluster {
    flex-wrap: wrap;
  }
}

.results-grid-large {
  --aside-width: 24em;
  display: grid;
  grid-template-columns: 1fr var(--aside-width);
  gap: 1em;

  @media (max-width: $measure--wide) {
    grid-template-columns: 1fr;

    .button {
      margin-right: 1em;
    }
  }
}

.results-grid-small {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(22em, 1fr));
  gap: 1em;

  @media only screen and (max-width: 20em) {
    display: block;
  }
}

.diet-pie-charts {
  align-items: center;
  text-align: center;
  display: grid;

  grid-template-columns: repeat(2, 1fr);
  gap: 1em;

  @media only screen and (max-width: 75em) {
    display: block;
  }
}

.planetary-boundaries-section {
  gap: 2em;
  align-items: flex-start;

  > div:first-child {
    flex: 1 1 20em;
  }
  > div:last-child {
    flex-basis: 40em;
    flex-grow: 0;
    flex-shrink: 1;
    max-width: 100%;
  }
}

.diet-info-box {
  padding: 1.5em;
  border: 2px solid $gray;
}
</style>
