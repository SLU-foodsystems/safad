<script lang="ts" setup>
import { ref, watch, onMounted } from "vue";

import * as DefaultInputFiles from "@/lib/default-input-files";
import * as InputFileParsers from "@/lib/input-files-parsers";

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
  generateSlvResults,
  SLV_RESULTS_HEADER,
} from "@/lib/slv-results-generator";

import { resetFile, initInputFile } from "@/lib/file-interface-utils";

import FileSelector from "@/components/FileSelector.vue";
import LoadingOverlay from "@/components/LoadingOverlay.vue";

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
  prepProcAndPack:
    "File with additional processing steps for composite foods (e.g. baking for bread) and specification of the types of packaging used.",
  processesEnergyDemands:
    "File that contains the amount and type of energy sources that each process uses.",
  emissionsFactorsEnergy:
    "Emission factors for electricity for different countries and other energy carriers (e.g. heating oil).",
  emissionsFactorsPackaging:
    "Emissions factors for different types of packaging.",
  emissionsFactorsTransport:
    "Emissions factors for transports between different countries.",
  slvRecipesFile:
    "An alternative recipe file containing recipes used by the Swedish Food Agency. This file defines for which recipes footprints are calculated for, what ingredients they contain and in what amounts (as determined by SFA). This file is complemented by SAFAD IP Recipes.csv file to break non-RPC items down to RPC-level.",
};

const RE = new ResultsEngine();

const countryCode = ref("SE");
const diet = ref<Diet>([]);
const includeBreakdownFile = ref(false);
const isLoading = ref(false);
// Needs to be separate, as they're not managed by the ResultsEngine
const slvRecipes = ref<SlvRecipeComponent[]>([]);

const footprintsRpcsFile = ref(
  initInputFile({
    defaultName: () => "SAFAD ID Footprints RPC.csv",
    getDefault: DefaultInputFiles.raw.footprintsRpcs,
    parser: InputFileParsers.parseFootprintsRpcs,
    setter: RE.setFootprintsRpcs,
  })
);

const dietFile = ref(
  initInputFile<Diet>({
    defaultName: (country: string) => `SAFAD ID Diet Spec ${country}.csv`,
    getDefault: DefaultInputFiles.raw.diet,
    parser: InputFileParsers.parseDiet,
    setter: (data: Diet) => {
      diet.value = data;
    },
  })
);

const foodsRecipesFile = ref(
  initInputFile({
    defaultName: () => "SAFAD IP Recipes.csv",
    getDefault: DefaultInputFiles.raw.foodsRecipes,
    parser: InputFileParsers.parseFoodsRecipes,
    setter: RE.setFoodsRecipes,
  })
);
const rpcOriginWasteFile = ref(
  initInputFile({
    defaultName: (country: string) =>
      `SAFAD IP Origin and Waste of RPC ${country}.csv`,
    getDefault: DefaultInputFiles.raw.rpcOriginWaste,
    parser: InputFileParsers.parseRpcOriginWaste,
    setter: RE.setRpcOriginWaste,
  })
);
const processesEnergyDemandsFile = ref(
  initInputFile({
    defaultName: () => "SAFAD IP Energy Proc.csv",
    getDefault: DefaultInputFiles.raw.processesEnergyDemands,
    parser: InputFileParsers.parseProcessesEnergyDemands,
    setter: RE.setEmissionsFactorsPackaging,
  })
);
const preparationProcessesAndPackagingFile = ref(
  initInputFile({
    defaultName: () => "SAFAD IP Prep Proc and Pack.csv",
    getDefault: DefaultInputFiles.raw.preparationProcessesAndPackaging,
    parser: InputFileParsers.parseProcessesPackaging,
    setter: RE.setPrepProcessesAndPackaging,
  })
);
const wasteRetailAndConsumerFile = ref(
  initInputFile({
    defaultName: (country: string) =>
      `SAFAD IP Waste Retail and Cons ${country}.csv`,
    getDefault: DefaultInputFiles.raw.wasteRetailAndConsumer,
    parser: InputFileParsers.parseWasteRetailAndConsumer,
    setter: RE.setWasteRetailAndConsumer,
  })
);

const emissionsFactorsEnergyFile = ref(
  initInputFile({
    defaultName: () => "SAFAD IEF Energy.csv",
    getDefault: DefaultInputFiles.raw.emissionsFactorsEnergy,
    parser: InputFileParsers.parseEmissionsFactorsEnergy,
    setter: RE.setEmissionsFactorsEnergy,
  })
);
const emissionsFactorsPackagingFile = ref(
  initInputFile({
    defaultName: () => "SAFAD IEF Packaging.csv",
    getDefault: DefaultInputFiles.raw.emissionsFactorsPackaging,
    parser: InputFileParsers.parseEmissionsFactorsPackaging,
    setter: RE.setEmissionsFactorsPackaging,
  })
);
const emissionsFactorsTransportFile = ref(
  initInputFile({
    defaultName: () => "SAFAD IEF Transport.csv",
    getDefault: DefaultInputFiles.raw.emissionsFactorsTransport,
    parser: InputFileParsers.parseEmissionsFactorsTransport,
    setter: RE.setEmissionsFactorsTransport,
  })
);

const slvRecipesFile = ref(
  initInputFile({
    defaultName: () => "SAFAD IS SLV Recipes.csv",
    getDefault: DefaultInputFiles.raw.slvRecipes,
    parser: InputFileParsers.parseSlvRecipes,
    setter: (data: SlvRecipeComponent[]) => {
      slvRecipes.value = data;
    },
  })
);

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
  isLoading.value = false;
});

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
          RE.preparationProcessesAndPackaging!
        )[0],
      ])
    );
    downloadAsPlaintext(
      stringifyCsvData([BREAKDOWN_RESULTS_HEADER, ...dietBreakdownRows]),
      "SAFAD OS Breakdown per Food.csv"
    );
  }
};

const downloadFootprintsOfSLVRecipes = async () => {
  if (!RE) return;

  const slvResultsRows = await generateSlvResults(slvRecipes.value, RE);
  downloadAsPlaintext(
    stringifyCsvData([SLV_RESULTS_HEADER, ...slvResultsRows]),
    "SAFAD OR Footprints per SLV Food.csv"
  );
};

const metaFileHandler = new MetaFile();
metaFileHandler.setInputFileInterfaces({
  emissionsFactorsPackagingFile: emissionsFactorsPackagingFile.value,
  emissionsFactorsEnergyFile: emissionsFactorsEnergyFile.value,
  emissionsFactorsTransportFile: emissionsFactorsTransportFile.value,
  foodsRecipesFile: foodsRecipesFile.value,
  rpcOriginWasteFile: rpcOriginWasteFile.value,
  processesEnergyDemandsFile: processesEnergyDemandsFile.value,
  preparationProcessesAndPackagingFile:
    preparationProcessesAndPackagingFile.value,
  wasteRetailAndConsumerFile: wasteRetailAndConsumerFile.value,
  footprintsRpcsFile: footprintsRpcsFile.value,
  dietFile: dietFile.value,
  slvRecipesFile: slvRecipesFile.value,
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
    preparationProcessesAndPackagingFile.value,
    processesEnergyDemandsFile.value,
    rpcOriginWasteFile.value,
    slvRecipesFile.value,
    wasteRetailAndConsumerFile.value,
  ];
  const addFilePromises = files.map((f) => addFile(f));

  zip.file("info.txt", metaFileHandler.toString());

  if (countryCode.value === "SE") {
    const slvResultsRows = await generateSlvResults(slvRecipes.value, RE);
    const data = stringifyCsvData([SLV_RESULTS_HEADER, ...slvResultsRows]);
    zip.file("SAFAD OR Footprints per SLV Food.csv", data);
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
        RE.preparationProcessesAndPackaging!
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

onMounted(async () => {
  isLoading.value = true;

  const promises: Promise<any>[] = [];

  promises.push(
    DefaultInputFiles.configureResultsEngine(RE, countryCode.value)
  );
  // SLV Recipes also needs to be set to initial value, as not handled by the
  // configureResultsEngine utility.
  promises.push(
    slvRecipesFile.value.getDefault(countryCode.value).then((data: string) => {
      slvRecipesFile.value?.setter(slvRecipesFile.value.parser(data));
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
          <h1>SAFAD<br />Sustainability Assesment of Foods and Diets</h1>
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

    <br />
    <br />

    <div class="stack u-tac start-page-wrap">
      <h3>Download Output Data</h3>
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

        <div class="stack">
          <div class="cluster cluster--between">
            <span class="cluster">
              <img
                src="@/assets/bar-chart.svg"
                width="2253"
                height="2250"
                loading="lazy"
              />
              <h2>Download footprints of foods</h2>
            </span>
            <button
              class="button button--accent"
              @click="downloadFootprintsOfFoods"
            >
              Download
            </button>
          </div>
          <p>
            Download a csv file with the impacts per kg of each food-item in the
            recipes list.
          </p>
        </div>
        <div class="stack">
          <div class="cluster cluster--between">
            <span class="cluster">
              <img
                src="@/assets/pie-chart.svg"
                width="2253"
                height="2250"
                loading="lazy"
              />
              <h2>Download footprints of diet</h2>
            </span>
            <button
              class="button button--accent"
              @click="downloadFootprintsOfDiets"
            >
              Download
            </button>
          </div>
          <p>
            Download a csv file with the impacts of the foods and their amounts
            listed in the diet file.
          </p>
          <label class="cluster">
            <input type="checkbox" v-model="includeBreakdownFile" />
            Include Breakdown File
          </label>
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
              <h2>Download footprints based off of SLV Data</h2>
            </span>
            <button
              class="button button--accent"
              @click="downloadFootprintsOfSLVRecipes"
            >
              Download
            </button>
          </div>
          <p>
            Download a csv file with the impacts of recipes used by the
            <abbr title="Svenska Livsmedelsverket">SLV</abbr> (Swedish Food
            Agency).
          </p>
          <FileSelector
            file-label="SLV Recipes"
            :country-code="countryCode"
            :file-interface="slvRecipesFile"
            :file-description="Descriptions.slvRecipesFile"
          />
        </div>

        <LoadingOverlay :show="isLoading" />
      </section>
      <h3>Input Data</h3>

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

      <h3>Parameter Files</h3>

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
        file-label="Preparation Processes and Packaging"
        :country-code="countryCode"
        :file-interface="preparationProcessesAndPackagingFile"
        :file-description="Descriptions.prepProcAndPack"
      />
      <FileSelector
        file-label="Consumer- and Retail wastes"
        :country-code="countryCode"
        :file-interface="wasteRetailAndConsumerFile"
        :file-description="Descriptions.wasteRetailAndConsumer"
      />

      <h3>Emissions Factors</h3>
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
  </section>
</template>

<style lang="scss" scoped>
@import "styles/constants";

.start-page {
  display: block;
  overflow: auto;

  height: 100%;
  width: 100%;
  padding: 0;
  padding-bottom: 2em;
}

.start-page__logo {
  width: auto;
  height: 3em;
}

.start-page-wrap {
  width: auto;
  margin: 0 auto;
  width: 60em;
  max-width: 95%;
}

.download-section {
  text-align: left;
  position: relative;

  > div {
    background: white;
    padding: 1em;
    $base-box-shadow: 0 0.3em 0.75em -0.65em rgba(black, 0.5);
    box-shadow: $base-box-shadow;

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

.slv-container {
  padding: 1em;
  background: rgba($yellow_sunshine, 0.4);
}
</style>
