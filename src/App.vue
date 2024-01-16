<script lang="ts">
import { defineComponent } from "vue";

import * as DefaultInputFiles from "@/lib/default-input-files";
import * as InputFileParsers from "@/lib/input-files-parsers";
import ResultsEngine from "@/lib/ResultsEngine";

import FileSelector from "@/components/FileSelector.vue";
import LoadingOverlay from "@/components/LoadingOverlay.vue";
// import { downloadAsPlaintext } from "@/lib/csv-io";
const downloadAsPlaintext = console.log;
import { stringifyCsvData } from "@/lib/utils";
import {
  labeledAndFilteredImpacts,
  DETAILED_RESULTS_HEADER,
  getDietBreakdown,
} from "@/lib/impacts-csv-utils";
import reduceDietToRpcs from "./lib/rpc-reducer";
import {
  generateSlvResults,
  SLV_RESULTS_HEADER,
} from "./lib/slv-results-generator";

interface SetFilePayload {
  data: string;
  name: string;
}

interface FileInterface<T> {
  state: "default" | "custom";
  name: string;
  defaultName: string;
  data: null | string;
  comment: string;
  getDefault: (country: string) => Promise<string>;
  parser: (data: string) => T;
  setter: (data: T) => void;
}

const initFileInterface = <T,>(
  partialFileInterface: Pick<
    FileInterface<T>,
    "defaultName" | "getDefault" | "parser" | "setter"
  >
): FileInterface<T> => ({
  state: "default",
  name: "",
  comment: "",
  data: null,
  ...partialFileInterface,
});

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

export default defineComponent({
  components: { FileSelector, LoadingOverlay },

  data() {
    return {
      Descriptions,

      RE: new ResultsEngine() as ResultsEngine,
      countryCode: "SE",
      diet: [] as Diet,
      includeBreakdownFile: false,
      isLoading: false,

      slvRecipes: [] as SlvRecipeComponent[],

      emissionsFactorsPackagingFile: null as null | FileInterface<
        Record<string, number[]>
      >,
      emissionsFactorsEnergyFile: null as null | FileInterface<
        Record<string, number[] | Record<string, number[]>>
      >,
      emissionsFactorsTransportFile: null as null | FileInterface<
        NestedRecord<string, number[]>
      >,

      foodsRecipesFile: null as null | FileInterface<FoodsRecipes>,
      rpcOriginWasteFile: null as null | FileInterface<RpcOriginWaste>,
      processesEnergyDemandsFile: null as null | FileInterface<
        Record<string, number[]>
      >,
      preparationProcessesAndPackagingFile: null as null | FileInterface<
        Record<string, string[]>
      >,
      wasteRetailAndConsumerFile: null as null | FileInterface<
        Record<string, number[]>
      >,

      footprintsRpcsFile: null as null | FileInterface<RpcFootprintsByOrigin>,
      dietFile: null as null | FileInterface<Diet>,

      slvRecipesFile: null as null | FileInterface<SlvRecipeComponent[]>,
    };
  },

  watch: {
    async countryCode() {
      this.RE.setCountryCode(this.countryCode);

      let promises = [];

      this.isLoading = true;
      if (this.rpcOriginWasteFile?.state === "default") {
        promises.push(this.resetFile(this.rpcOriginWasteFile));
      }
      if (this.wasteRetailAndConsumerFile?.state === "default") {
        promises.push(this.resetFile(this.wasteRetailAndConsumerFile));
      }
      if (this.dietFile?.state === "default") {
        promises.push(this.resetFile(this.dietFile));
      }

      await Promise.all(promises);
      this.isLoading = false;
    },
  },

  methods: {
    async downloadFootprintsOfFoods() {
      if (!this.RE) return;
      const impactsOfRecipe = labeledAndFilteredImpacts(
        this.RE.computeImpactsOfRecipe()
      );

      const impactsOfRecipeCsv = stringifyCsvData([
        DETAILED_RESULTS_HEADER,
        ...impactsOfRecipe,
      ]);

      downloadAsPlaintext(
        impactsOfRecipeCsv,
        "SAFAD OR Footprints per Food.csv"
      );
    },
    async downloadFootprintsOfDiets() {
      if (!this.RE) return;
      const detailedDietImpacts = labeledAndFilteredImpacts(
        this.RE.computeImpactsDetailed(this.diet)
      );

      const detailedDietImpactsCsv = stringifyCsvData([
        DETAILED_RESULTS_HEADER,
        ...detailedDietImpacts,
      ]);

      downloadAsPlaintext(
        detailedDietImpactsCsv,
        "SAFAD OR Footprints per Diet.csv"
      );

      if (this.includeBreakdownFile) {
        const dietBreakdownRows = getDietBreakdown(
          this.diet.map(([code, amount]): [string, number, Diet] => [
            code,
            amount,
            reduceDietToRpcs(
              [[code, amount]],
              this.RE.foodsRecipes!,
              this.RE.preparationProcessesAndPackaging!
            )[0],
          ])
        );
        const breakdownFileHeader = [
          "Food Code",
          "Food Name",
          "Food Amount (g)",
          "RPC Code",
          "RPC Name",
          "RPC Amount (g)",
        ];
        downloadAsPlaintext(
          stringifyCsvData([breakdownFileHeader, ...dietBreakdownRows]),
          "SAFAD OS Breakdown per Food.csv"
        );
      }
    },

    async downloadFootprintsOfSLVRecipes() {
      if (!this.RE) return;

      const slvResultsRows = await generateSlvResults(
        this.slvRecipes,
        this.RE as ResultsEngine
      );
      downloadAsPlaintext(
        stringifyCsvData([SLV_RESULTS_HEADER, ...slvResultsRows]),
        "SAFAD OR Footprints per SLV Food.csv"
      );
    },

    async resetFile<T>(fileInterface: FileInterface<T>) {
      if (!fileInterface) return;

      fileInterface.setter(
        fileInterface.parser(await fileInterface.getDefault(this.countryCode))
      );
      fileInterface.name = "";
      fileInterface.state = "default";
      fileInterface.data = null;
    },

    async setFile<T>(
      payload: SetFilePayload,
      fileInterface: FileInterface<T> | null
    ) {
      if (!fileInterface) return;

      fileInterface.setter(fileInterface.parser(payload.data));
      fileInterface.name = payload.name;
      fileInterface.state = "custom";
      fileInterface.data = payload.data;
    },

    async downloadFile<T>(fileInterface: FileInterface<T>) {
      if (fileInterface.state === "default") {
        downloadAsPlaintext(
          await fileInterface.getDefault(this.countryCode),
          fileInterface.defaultName
        );
      } else {
        downloadAsPlaintext(fileInterface.data || "", fileInterface.name);
      }
    },

    async setComment<T>(
      comment: string,
      fileInterface: FileInterface<T> | null
    ) {
      if (!fileInterface) return;
      fileInterface.comment = comment;
    },
  },

  async beforeMount() {
    if (!(this.RE instanceof ResultsEngine)) {
      return;
    }

    this.isLoading = true;

    // Load all default files
    const configureResultsEnginePromise =
      DefaultInputFiles.configureResultsEngine(this.RE, this.countryCode);

    this.footprintsRpcsFile = initFileInterface({
      defaultName: "SAFAD ID Footprints RPC.csv",
      getDefault: DefaultInputFiles.raw.footprintsRpcs,
      parser: InputFileParsers.parseFootprintsRpcs,
      setter: this.RE.setFootprintsRpcs,
    });

    this.dietFile = initFileInterface({
      defaultName: "SAFAD ID Diet Spec.csv",
      getDefault: DefaultInputFiles.raw.diet,
      parser: InputFileParsers.parseDiet,
      setter: (data: Diet) => {
        this.diet = data;
      },
    });
    // Diet needs to be handled explicitly, as it's not managed in the
    // "configureResultsEngine" builder function
    this.dietFile.getDefault(this.countryCode).then((diet) => {
      this.dietFile?.setter(this.dietFile.parser(diet));
    });

    this.foodsRecipesFile = initFileInterface({
      defaultName: "SAFAD IP Recipes.csv",
      getDefault: DefaultInputFiles.raw.foodsRecipes,
      parser: InputFileParsers.parseFoodsRecipes,
      setter: this.RE.setFoodsRecipes,
    });
    this.rpcOriginWasteFile = initFileInterface({
      defaultName: "SAFAD IP Origin and Waste of RPC.csv",
      getDefault: DefaultInputFiles.raw.rpcOriginWaste,
      parser: InputFileParsers.parseRpcOriginWaste,
      setter: this.RE.setRpcOriginWaste,
    });
    this.processesEnergyDemandsFile = initFileInterface({
      defaultName: "SAFAD IP Energy Proc.csv",
      getDefault: DefaultInputFiles.raw.processesEnergyDemands,
      parser: InputFileParsers.parseEmissionsFactorsPackaging,
      setter: this.RE.setEmissionsFactorsPackaging,
    });
    this.preparationProcessesAndPackagingFile = initFileInterface({
      defaultName: "SAFAD IP Prep Proc and Pack.csv",
      getDefault: DefaultInputFiles.raw.preparationProcessesAndPackaging,
      parser: InputFileParsers.parseProcessesPackaging,
      setter: this.RE.setPrepProcessesAndPackaging,
    });
    this.wasteRetailAndConsumerFile = initFileInterface({
      defaultName: "SAFAD IP Waste Retail and Cons.csv",
      getDefault: DefaultInputFiles.raw.wasteRetailAndConsumer,
      parser: InputFileParsers.parseWasteRetailAndConsumer,
      setter: this.RE.setWasteRetailAndConsumer,
    });

    this.emissionsFactorsEnergyFile = initFileInterface({
      defaultName: "SAFAD IEF Energy.csv",
      getDefault: DefaultInputFiles.raw.emissionsFactorsEnergy,
      parser: InputFileParsers.parseEmissionsFactorsEnergy,
      setter: this.RE.setEmissionsFactorsEnergy,
    });
    this.emissionsFactorsPackagingFile = initFileInterface({
      defaultName: "SAFAD IEF Packaging.csv",
      getDefault: DefaultInputFiles.raw.emissionsFactorsPackaging,
      parser: InputFileParsers.parseEmissionsFactorsPackaging,
      setter: this.RE.setEmissionsFactorsPackaging,
    });
    this.emissionsFactorsTransportFile = initFileInterface({
      defaultName: "SAFAD IEF Transport.csv",
      getDefault: DefaultInputFiles.raw.emissionsFactorsTransport,
      parser: InputFileParsers.parseEmissionsFactorsTransport,
      setter: this.RE.setEmissionsFactorsTransport,
    });

    this.slvRecipesFile = initFileInterface({
      defaultName: "SAFAD IS SLV Recipes.csv",
      getDefault: DefaultInputFiles.raw.slvRecipes,
      parser: InputFileParsers.parseSlvRecipes,
      setter: (data: SlvRecipeComponent[]) => {
        this.slvRecipes = data;
      },
    });

    // SLV Recipes also needs to be set to initial value, as not handled by the
    // configureResultsEngine utility.
    await this.slvRecipesFile.getDefault(this.countryCode).then((data) => {
      this.slvRecipesFile?.setter(this.slvRecipesFile.parser(data));
    });

    await configureResultsEnginePromise;

    this.isLoading = false;
  },
});
</script>

<template>
  <section class="start-page">
    <header class="stack start-page-wrap">
      <div class="cluster cluster--center">
        <img src="@/assets/slu-logo.svg" class="start-page__logo" />
        <h1>
          The
          <abbr title="Sustainability Assesment of Foods and Diets">SAFAD</abbr>
          tool by SLU
        </h1>
      </div>

      <br />

      <p>
        The Sustainability Assessment of Foods and Diets (SAFAD) tool allows for
        sustainability assessments of foods and diets for 9 European countries
        (France, Germany, Greece, Hungary, Ireland, Italy, Poland, Spain and
        Sweden). To generate footprints for a diet or for foods using default
        values, choose the country of interest in the drop-down menu. Footprint
        files are then ready to be downloaded.
      </p>

      <p>
        In the SAFAD tool, input data (Input, parameter, and emission factor
        files) can easily be configured. To configure a file, download the
        default file using the Download Copy button. Once configured, the custom
        file can be uploaded using the Upload Custom file. The custom file must
        be in the same format and uploaded as a .csv file. When all custom files
        are uploaded, the new footprint for the diet or foods can be downloaded.
      </p>

      <p>
        To learn more about a file’s function, press the Info button situated
        next to the file's name.
      </p>
    </header>
    <div class="stack u-tac start-page-wrap">
      <h3>Country</h3>
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
      <br />
      <h3>Download Output Data</h3>
      <section class="download-section stack">
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
            @setFile="(p: SetFilePayload) => setFile(p, slvRecipesFile)"
            @setComment="(x: string) => setComment(x, slvRecipesFile)"
            @reset="() => resetFile(slvRecipesFile!)"
            @download="() => downloadFile(slvRecipesFile!)"
            :fileName="slvRecipesFile?.name || slvRecipesFile?.defaultName"
            :state="slvRecipesFile?.state || 'default'"
            :file-description="Descriptions.slvRecipesFile"
          />
        </div>

        <LoadingOverlay :show="isLoading" />
      </section>
      <h3>Input Data</h3>

      <FileSelector
        file-label="Footprints RPC"
        @setFile="(p: SetFilePayload) => setFile(p, footprintsRpcsFile)"
        @setComment="(x: string) => setComment(x, footprintsRpcsFile)"
        @reset="() => resetFile(footprintsRpcsFile!)"
        @download="() => downloadFile(footprintsRpcsFile!)"
        :file-name="footprintsRpcsFile?.name || footprintsRpcsFile?.defaultName"
        :state="footprintsRpcsFile?.state || 'default'"
        :file-description="Descriptions.footprintsRpc"
      />

      <FileSelector
        file-label="Diet"
        @setFile="(p: SetFilePayload) => setFile(p, dietFile)"
        @setComment="(x: string) => setComment(x, dietFile)"
        @reset="() => resetFile(dietFile!)"
        @download="() => downloadFile(dietFile!)"
        :fileName="dietFile?.name || dietFile?.defaultName"
        :state="dietFile?.state || 'default'"
        :file-description="Descriptions.diet"
      />

      <h3>Parameter Files</h3>

      <FileSelector
        file-label="Foods Recipes"
        @setFile="(p: SetFilePayload) => setFile(p, foodsRecipesFile!)"
        @setComment="(x: string) => setComment(x, foodsRecipesFile!)"
        @reset="() => resetFile(foodsRecipesFile!)"
        @download="() => downloadFile(foodsRecipesFile!)"
        :fileName="foodsRecipesFile?.name || foodsRecipesFile?.defaultName"
        :state="foodsRecipesFile?.state || 'default'"
        :file-description="Descriptions.recipes"
      />

      <FileSelector
        file-label="RPC Origin & Waste"
        @setFile="(p: SetFilePayload) => setFile(p, rpcOriginWasteFile)"
        @setComment="(x: string) => setComment(x, rpcOriginWasteFile)"
        @reset="() => resetFile(rpcOriginWasteFile!)"
        @download="() => downloadFile(rpcOriginWasteFile!)"
        :fileName="rpcOriginWasteFile?.name || rpcOriginWasteFile?.defaultName"
        :state="rpcOriginWasteFile?.state || 'default'"
        :file-description="Descriptions.rpcOriginWaste"
      />

      <FileSelector
        file-label="Processes Energy Demands"
        @setFile="(p: SetFilePayload) => setFile(p, processesEnergyDemandsFile)"
        @setComment="(x: string) => setComment(x, processesEnergyDemandsFile)"
        @reset="() => resetFile(processesEnergyDemandsFile!)"
        @download="() => downloadFile(processesEnergyDemandsFile!)"
        :fileName="
          processesEnergyDemandsFile?.name ||
          processesEnergyDemandsFile?.defaultName
        "
        :state="processesEnergyDemandsFile?.state || 'default'"
        :file-description="Descriptions.processesEnergyDemands"
      />

      <FileSelector
        file-label="Preparation Processes and Packaging"
        @setFile="
          (p: SetFilePayload) =>
            setFile(p, preparationProcessesAndPackagingFile)
        "
        @setComment="
          (x: string) => setComment(x, preparationProcessesAndPackagingFile)
        "
        @reset="() => resetFile(preparationProcessesAndPackagingFile!)"
        @download="() => downloadFile(preparationProcessesAndPackagingFile!)"
        :fileName="
          preparationProcessesAndPackagingFile?.name ||
          preparationProcessesAndPackagingFile?.defaultName
        "
        :state="preparationProcessesAndPackagingFile?.state || 'default'"
        :file-description="Descriptions.prepProcAndPack"
      />
      <FileSelector
        file-label="Consumer- and Retail wastes"
        @setFile="(p: SetFilePayload) => setFile(p, wasteRetailAndConsumerFile)"
        @setComment="(x: string) => setComment(x, wasteRetailAndConsumerFile)"
        @reset="() => resetFile(wasteRetailAndConsumerFile!)"
        @download="() => downloadFile(wasteRetailAndConsumerFile!)"
        :fileName="
          wasteRetailAndConsumerFile?.name ||
          wasteRetailAndConsumerFile?.defaultName
        "
        :state="wasteRetailAndConsumerFile?.state || 'default'"
        :file-description="Descriptions.wasteRetailAndConsumer"
      />

      <h3>Emissions Factors</h3>
      <FileSelector
        file-label="Emissions Factors Packaging"
        @setFile="
          (p: SetFilePayload) => setFile(p, emissionsFactorsPackagingFile)
        "
        @setComment="
          (x: string) => setComment(x, emissionsFactorsPackagingFile)
        "
        @reset="() => resetFile(emissionsFactorsPackagingFile!)"
        @download="() => downloadFile(emissionsFactorsPackagingFile!)"
        :fileName="
          emissionsFactorsPackagingFile?.name ||
          emissionsFactorsPackagingFile?.defaultName
        "
        :state="emissionsFactorsPackagingFile?.state || 'default'"
        :file-description="Descriptions.emissionsFactorsPackaging"
      />
      <FileSelector
        file-label="Emissions Factors Energy"
        @setFile="(p: SetFilePayload) => setFile(p, emissionsFactorsEnergyFile)"
        @setComment="(x: string) => setComment(x, emissionsFactorsEnergyFile)"
        @reset="() => resetFile(emissionsFactorsEnergyFile!)"
        @download="() => downloadFile(emissionsFactorsEnergyFile!)"
        :fileName="
          emissionsFactorsEnergyFile?.name ||
          emissionsFactorsEnergyFile?.defaultName
        "
        :state="emissionsFactorsEnergyFile?.state || 'default'"
        :file-description="Descriptions.emissionsFactorsEnergy"
      />
      <FileSelector
        file-label="Emissions Factors Transport"
        @setFile="
          (p: SetFilePayload) => setFile(p, emissionsFactorsTransportFile)
        "
        @setComment="
          (x: string) => setComment(x, emissionsFactorsTransportFile)
        "
        @reset="() => resetFile(emissionsFactorsTransportFile!)"
        @download="() => downloadFile(emissionsFactorsTransportFile!)"
        :fileName="
          emissionsFactorsTransportFile?.name ||
          emissionsFactorsTransportFile?.defaultName
        "
        :state="emissionsFactorsTransportFile?.state || 'default'"
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

  background: $lightgray;

  height: 100%;
  width: 100%;
  padding: 0;
  padding-bottom: 2em;
}

header {
  width: 100%;
  padding: 2em 0;
  margin-bottom: 2em;

  h1 {
    font-size: 1.5em;
    margin-bottom: 0;
  }

  p {
    text-align: left;
    width: 100%;
  }
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

label {
  --space: 0.5rem;
  cursor: pointer;
}

select {
  width: 20em;
  margin-left: auto;
  margin-right: auto;
  flex-grow: 1;
}
</style>
