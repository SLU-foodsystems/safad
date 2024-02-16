<script lang="ts" setup>
import { ref, watch, onMounted } from "vue";

import * as DefaultInputFiles from "@/lib/default-input-files";
import MetaFile from "@/lib/MetaFile";
import ResultsEngine from "@/lib/ResultsEngine";

import { downloadAsPlaintext } from "@/lib/csv-io";
import { padLeft, stringifyCsvData } from "@/lib/utils";
import {
  labeledAndFilteredImpacts,
  DETAILED_RESULTS_HEADER,
  BREAKDOWN_RESULTS_HEADER,
  getDietBreakdown,
} from "@/lib/impacts-csv-utils";
import reduceDietToRpcs from "@/lib/rpc-reducer";
import {
  generateSfaResults,
  SFA_RESULTS_HEADER,
} from "@/lib/sfa-results-generator";

import { resetFile } from "@/lib/file-interface-utils";

import FileSelector from "@/components/FileSelector.vue";
import LoadingOverlay from "@/components/LoadingOverlay.vue";
import CarbonFootprintsChart from "@/components/CarbonFootprintsChart.vue";
import EnvFootprintCharts from "@/components/EnvFootprintCharts.vue";
import PlanetaryBoundariesChart from "@/components/PlanetaryBoundariesChart.vue";
import ImpactsPerCategoryChart from "@/components/ImpactsPerCategoryChart.vue";

import setupCharts from "./charts";
import initFileInterfaces from "./init-file-interfaces";
import readableDietName from "./readable-diet-name";

const APP_VERSION = __APP_VERSION__;

// TODO: These should be in a separate file, so that theyre easier for others to
// modify
const Descriptions = {
  footprintsRpc:
    "File with footprints of all raw commodities (crops, animal products, blue and novel foods) from different production countries (without any waste, conversion or allocation).",
  diet: "File that contains the amount of different foods in diets.",
  rpcOriginWaste:
    "File with origins and waste from farm to retail of each country specific RPC.",
  wasteRetailAndConsumer:
    "File that specifies the amount of retail and consumer waste for different food types and per country.",
  recipes:
    "File that disaggregates food items into their components and finally into its RPC, specifies processing steps, and contains conversion factors from going from RPC to edible RPCs. File with conversion (“reverse yield”-factors), allocation factors and definition of processes for the different food items.",
  preparationProcesses:
    "File with additional processing steps for composite foods (e.g. baking for bread).",
  packagingCodes: "File with specification of the types of packaging used.",
  processesEnergyDemands:
    "File that contains the amount and type of energy sources that each process uses.",
  emissionsFactorsEnergy:
    "Emission factors for electricity for different countries and other energy carriers (e.g. heating oil).",
  emissionsFactorsPackaging:
    "Emissions factors for different types of packaging.",
  emissionsFactorsTransport:
    "Emissions factors for transports between different countries.",
  sfaRecipesFile:
    "An alternative recipe file containing recipes used by the Swedish Food Agency. This file defines for which recipes footprints are calculated for, what ingredients they contain and in what amounts (as determined by SFA). This file is complemented by SAFAD IP Recipes.csv file to break non-RPC items down to RPC-level.",
};

const RE = new ResultsEngine();

const countryCode = ref("SE");
const includeBreakdownFile = ref(false);
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

const dietName = readableDietName(countryCode);

/**
 * Methods
 */

const downloadFootprintsOfFoods = async () => {
  const impactsOfRecipe = labeledAndFilteredImpacts(
    RE.computeImpactsOfRecipe()
  );

  const impactsOfRecipeCsv = stringifyCsvData([
    DETAILED_RESULTS_HEADER,
    ...impactsOfRecipe,
  ]);

  downloadAsPlaintext(impactsOfRecipeCsv, "SAFAD OR Footprints per Food.csv");
};

const downloadFootprintsOfDiets = () => {
  const detailedDietImpacts = labeledAndFilteredImpacts(
    RE.computeImpactsDetailed(diet.value)
  );

  const detailedDietImpactsCsv = stringifyCsvData([
    DETAILED_RESULTS_HEADER,
    ...detailedDietImpacts,
  ]);

  downloadAsPlaintext(
    detailedDietImpactsCsv,
    "SAFAD OR Footprints per Diet.csv"
  );

  if (includeBreakdownFile.value) {
    const dietBreakdownRows = getDietBreakdown(
      diet.value.map(([code, amount]): [string, number, Diet] => [
        code,
        amount,
        reduceDietToRpcs(
          [[code, amount]],
          RE.foodsRecipes!,
          RE.preparationProcesses!,
          RE.packagingCodes!
        )[0],
      ])
    );
    downloadAsPlaintext(
      stringifyCsvData([BREAKDOWN_RESULTS_HEADER, ...dietBreakdownRows]),
      "SAFAD OS Breakdown per Food.csv"
    );
  }
};

const downloadFootprintsOfSfaRecipes = async () => {
  if (!RE) return;

  const sfaResultsRows = await generateSfaResults(sfaRecipes.value, RE);
  downloadAsPlaintext(
    stringifyCsvData([SFA_RESULTS_HEADER, ...sfaResultsRows]),
    "SAFAD OR Footprints per SFA Food.csv"
  );
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

  zip.file("info.txt", metaFileHandler.toString());

  if (countryCode.value === "SE") {
    const sfaResultsRows = await generateSfaResults(sfaRecipes.value, RE);
    const data = stringifyCsvData([SFA_RESULTS_HEADER, ...sfaResultsRows]);
    zip.file("SAFAD OR Footprints per SFA Food.csv", data);
  }

  const impactsOfRecipe = labeledAndFilteredImpacts(
    RE.computeImpactsOfRecipe()
  );
  const impactsOfRecipeCsv = stringifyCsvData([
    DETAILED_RESULTS_HEADER,
    ...impactsOfRecipe,
  ]);

  zip.file("SAFAD OR Footprints per Food.csv", impactsOfRecipeCsv);

  const detailedDietImpacts = labeledAndFilteredImpacts(
    RE.computeImpactsDetailed(diet.value)
  );
  const detailedDietImpactsCsv = stringifyCsvData([
    DETAILED_RESULTS_HEADER,
    ...detailedDietImpacts,
  ]);

  zip.file("SAFAD OR Footprints per Diet.csv", detailedDietImpactsCsv);

  const dietBreakdownRows = getDietBreakdown(
    diet.value.map(([code, amount]): [string, number, Diet] => [
      code,
      amount,
      reduceDietToRpcs(
        [[code, amount]],
        RE.foodsRecipes!,
        RE.preparationProcesses!,
        RE.packagingCodes!
      )[0],
    ])
  );
  zip.file(
    "SAFAD OS Breakdown per Food.csv",
    stringifyCsvData([BREAKDOWN_RESULTS_HEADER, ...dietBreakdownRows])
  );

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
  dietFootprintsPerCategory,
  recompute: recomputChartData,
} = setupCharts(RE, diet);

/**
 * Whenever the countryCode dropdown is changed, we need to
 * - Update the ResultsEngine
 * - Re-load all country-dependant files
 */
watch(countryCode, async () => {
  RE.setCountryCode(countryCode.value);

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
    promises.push(resetFile(countryCode.value, dietFile.value));
  }

  await Promise.all(promises);

  recomputChartData();

  isLoading.value = false;
});

onMounted(async () => {
  isLoading.value = true;

  const promises: Promise<any>[] = [];

  promises.push(
    DefaultInputFiles.configureResultsEngine(RE, countryCode.value)
  );
  // SFA Recipes also needs to be set to initial value, as not handled by the
  // configureResultsEngine utility.
  promises.push(
    sfaRecipesFile.value.getDefault(countryCode.value).then((data: string) => {
      sfaRecipesFile.value?.setter(sfaRecipesFile.value.parser(data));
    })
  );

  // Diet needs to be handled explicitly, as it's not managed in the
  // "configureResultsEngine" builder function
  promises.push(
    dietFile.value.getDefault(countryCode.value).then((diet: string) => {
      dietFile.value?.setter(dietFile.value.parser(diet));
    })
  );

  await Promise.all(promises);

  recomputChartData();

  isLoading.value = false;
});
</script>

<template>
  <section class="start-page">
    <header class="top-bar">
      <div class="page-wrap cluster cluster--between">
        <div class="cluster">
          <a class="top-bar__logo" href="#">
            <img src="@/assets/slu-logo.svg" width="848" height="848" />
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
        <div>
          <h1>SAFAD<br />Sustainability Assessment of Foods and Diets</h1>
          <h2>
            Calculate the impact using eight environmental indicators and
            indicators for animal welfare and use of antibiotics.
          </h2>

          <p>
            The Sustainability Assessment of Foods and Diets (SAFAD) tool allows
            for sustainability assessments of foods and diets for 9 European
            countries (France, Germany, Greece, Hungary, Ireland, Italy, Poland,
            Spain and Sweden). To generate footprints for a diet or for foods
            using default values, choose the country of interest in the
            drop-down menu. Footprint files are then ready to be downloaded.
          </p>

          <p>
            In the SAFAD tool, input data (Input, parameter, and emission factor
            files) can easily be configured. To configure a file, download the
            default file using the Download Copy button. Once configured, the
            custom file can be uploaded using the Upload Custom file. The custom
            file must be in the same format and uploaded as a .csv file. When
            all custom files are uploaded, the new footprint for the diet or
            foods can be downloaded.
          </p>

          <p>
            To learn more about a file’s function, press the Info button
            situated next to the file's name.
          </p>
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
        <div class="results-grid-large">
          <div class="results-grid-large__graph">
            <h3>Carbon footprint preview</h3>
            <CarbonFootprintsChart :data="carbonFootprints" />
          </div>
          <div class="results-grid-large__aside stack">
            <h3>Download output data</h3>
            <p>
              Download a csv file with the impacts per kg of each food-item in
              the recipes list.
            </p>
            <button
              class="button button--accent"
              @click="downloadFootprintsOfFoods"
            >
              Download footprints of foods - EFSA recipes
            </button>
            <button
              class="button button--accent"
              @click="downloadFootprintsOfSfaRecipes"
            >
              Download footprints of foods - SFA recipes
            </button>
          </div>
        </div>
        <h3>Environmental Impacts</h3>
        <div class="results-grid-small">
          <EnvFootprintCharts :data="carbonFootprints" />
        </div>
      </section>

      <section class="stack stack-l">
        <h2 class="hr-header">
          <span>Impacts from Diet</span>
        </h2>
        <div class="cluster planetary-boundaries-section">
          <div class="stack">
            <h3>Impacts in relation to the planetary boundaries</h3>
            <PlanetaryBoundariesChart :data="dietFootprintsTotal" />
          </div>
          <div class="stack">
            <h3><strong>Diet:</strong> {{ dietName }}</h3>
            <button
              class="button button--accent"
              @click="downloadFootprintsOfDiets"
            >
              Download footprints of diet
            </button>
            <label class="cluster">
              <input type="checkbox" v-model="includeBreakdownFile" />
              Include Breakdown File
            </label>
          </div>
        </div>

        <h3 class="hr-header hr-header--right-only">
          <span>Contributions to impacts from different food groups</span>
        </h3>
        <div>
          <ImpactsPerCategoryChart
            :impactsPerCategory="dietFootprintsPerCategory"
          />
        </div>
      </section>

      <h2 class="hr-header">
        <span>Configure Files</span>
      </h2>
      <h3 class="hr-header hr-header--right-only">
        <span>Download Output Data</span>
      </h3>
      <section class="download-section stack">
        <div class="stack">
          <div class="cluster cluster--between">
            <span class="cluster">
              <img
                src="@/assets/zip.svg"
                width="2253"
                height="2250"
                loading="lazy"
              />
              <h2>Download complete package of files</h2>
            </span>
            <button class="button button--accent" @click="downloadZip">
              Download
            </button>
          </div>
          <p>
            Download a zip-file with all input- and output files bundled
            together.
          </p>
        </div>

        <div class="stack" style="background: #dbe3f2">
          <div class="cluster cluster--between">
            <span class="cluster">
              <img
                src="@/assets/horizontal-stacked-bar-chart.svg"
                width="2253"
                height="2250"
                loading="lazy"
              />
              <h2>Download footprints based off of SFA Data</h2>
            </span>
            <button
              class="button button--accent"
              @click="downloadFootprintsOfSfaRecipes"
            >
              Download
            </button>
          </div>
          <p>
            Download a csv file with the impacts of recipes used by the
            <abbr title="Swedish Food Authority">SFA</abbr>
          </p>
          <FileSelector
            file-label="SFA Recipes"
            :country-code="countryCode"
            :file-interface="sfaRecipesFile"
            :file-description="Descriptions.sfaRecipesFile"
          />
        </div>

        <LoadingOverlay :show="isLoading" />
      </section>

      <h3 class="hr-header hr-header--right-only">
        <span>Input Data</span>
      </h3>

      <FileSelector
        file-label="Footprints RPC"
        :country-code="countryCode"
        :file-interface="footprintsRpcsFile"
        :file-description="Descriptions.footprintsRpc"
      />

      <FileSelector
        file-label="Diet"
        :country-code="countryCode"
        :file-interface="dietFile"
        :file-description="Descriptions.diet"
      />

      <h3 class="hr-header hr-header--right-only">
        <span>Parameter Files</span>
      </h3>

      <FileSelector
        file-label="Foods Recipes"
        :country-code="countryCode"
        :file-interface="foodsRecipesFile"
        :file-description="Descriptions.recipes"
      />

      <FileSelector
        :country-code="countryCode"
        file-label="RPC Origin & Waste"
        :fileInterface="rpcOriginWasteFile"
        :file-description="Descriptions.rpcOriginWaste"
      />

      <FileSelector
        file-label="Processes Energy Demands"
        :country-code="countryCode"
        :file-interface="processesEnergyDemandsFile"
        :file-description="Descriptions.processesEnergyDemands"
      />

      <FileSelector
        file-label="Preparation Processes"
        :country-code="countryCode"
        :file-interface="preparationProcessesFile"
        :file-description="Descriptions.preparationProcesses"
      />
      <FileSelector
        file-label="Packaging"
        :country-code="countryCode"
        :file-interface="packagingCodesFile"
        :file-description="Descriptions.packagingCodes"
      />
      <FileSelector
        file-label="Consumer- and Retail wastes"
        :country-code="countryCode"
        :file-interface="wasteRetailAndConsumerFile"
        :file-description="Descriptions.wasteRetailAndConsumer"
      />

      <h3 class="hr-header hr-header--right-only">
        <span>Emissions Factors</span>
      </h3>
      <FileSelector
        file-label="Emissions Factors Packaging"
        :country-code="countryCode"
        :file-interface="emissionsFactorsPackagingFile"
        :file-description="Descriptions.emissionsFactorsPackaging"
      />
      <FileSelector
        file-label="Emissions Factors Energy"
        :country-code="countryCode"
        :file-interface="emissionsFactorsEnergyFile"
        :file-description="Descriptions.emissionsFactorsEnergy"
      />
      <FileSelector
        file-label="Emissions Factors Transport"
        :country-code="countryCode"
        :file-interface="emissionsFactorsTransportFile"
        :file-description="Descriptions.emissionsFactorsTransport"
      />
    </div>

    <footer class="page-footer">
      <div class="page-wrap page-footer__content stack">
        <img
          src="@/assets/planeat-logo-white.png"
          alt="Plan'Eat"
          width="543"
          height="142"
        />
        <p>
          PLAN’EAT is a Horizon Europe research project, bringing together 24
          partners and running from September 2022 to 2026.
        </p>
        <p>
          Code is open-source and available
          <a href="https://github.com/SLU-foodsystems/safad" target="_blank"
            ref="noopener nofollow"
            >here</a
          >.
        </p>
      </div>
    </footer>
  </section>
</template>

<style lang="scss" scoped>
@import "../../styles/constants";

.page-footer {
  padding: 2em 0;
  margin-top: 2em;
  background: $green_forest;
  color: white;
}

.page-footer__content {
  img {
    width: auto;
    color: white;
    height: 2em;
  }
}

.download-section {
  text-align: left;
  position: relative;

  > div {
    background: white;
    padding: 1em;
    outline: 2px solid $gray;

    img,
    svg {
      width: 3em;
      height: 3em;
    }
  }

  h2 {
    margin-bottom: 0;
  }
  p {
    font-size: 1.125em;
  }
}

.results-grid-large {
  --aside-width: 20em;
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
  grid-template-columns: repeat(auto-fit, minmax(20em, 1fr));
  gap: 1em;

  @media only screen and (max-width: 20em) {
    display: block;
  }
}

.planetary-boundaries-section {
  > div:first-child {
    flex-basis: 40em;
    flex-grow: 0;
    flex-shrink: 1;
    max-width: 100%;
  }
  > div:last-child {
    flex: 1 1 20em;
  }
}
</style>
