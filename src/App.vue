<script lang="ts">
import { defineComponent } from "vue";

import * as DefaultInputFiles from "@/lib/default-input-files";
import * as InputFileParsers from "@/lib/input-files-parsers";
import ResultsEngine from "@/lib/ResultsEngine";

import FileSelector from "@/components/FileSelector.vue";
import { downloadAsPlaintext } from "@/lib/csv-io";
import { stringifyCsvData } from "@/lib/utils";
import {
  labeledAndFilteredImpacts,
  DETAILED_RESULTS_HEADER,
  getDietBreakdown,
} from "@/lib/impacts-csv-utils";
import reduceDietToRpcs from "./lib/rpc-reducer";
import { generateSlvResults } from "./lib/slv-results-generator";

const LL_COUNTRY_CODES: string[] = [
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "ES",
  "SE",
];

const LL_COUNTRY_NAMES: Record<string, string> = {
  FR: "France",
  DE: "Germany",
  GR: "Greece",
  HU: "Hungary",
  IE: "Ireland",
  IT: "Italy",
  PL: "Poland",
  ES: "Spain",
  SE: "Sweden",
};

interface SetFilePayload {
  data: string;
  name: string;
}

interface FileInterface<T> {
  state: "default" | "custom";
  name: string;
  defaultName: string;
  data: null | string;
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
  slvRecipesFile: "To be written.",
};

export default defineComponent({
  components: { FileSelector },
  data() {
    return {
      LL_COUNTRY_CODES,
      LL_COUNTRY_NAMES,

      Descriptions,

      RE: new ResultsEngine() as ResultsEngine,
      countryCode: "SE",
      diet: [] as Diet,
      includeBreakdownFile: false,

      useSlvRecipes: true,
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
        Record<string, string>
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
    countryCode() {
      this.RE.setCountryCode(this.countryCode);

      if (this.rpcOriginWasteFile?.state === "default") {
        this.resetFile(this.rpcOriginWasteFile);
      }
      if (this.wasteRetailAndConsumerFile?.state === "default") {
        this.resetFile(this.wasteRetailAndConsumerFile);
      }
      if (this.dietFile?.state === "default") {
        this.resetFile(this.dietFile);
      }
    },
  },

  methods: {
    async compute() {
      if (!this.RE) return;

      if (this.useSlvRecipes) {
        const slvResultsCsv = await generateSlvResults(
          this.slvRecipes,
          this.RE as ResultsEngine
        );
        downloadAsPlaintext(
          slvResultsCsv,
          "SAFAD OS Footprints per SLV Food.csv"
        );
        return;
      }

      const detailedDietImpacts = labeledAndFilteredImpacts(
        this.RE.computeImpactsDetailed(this.diet)
      );
      const impactsOfRecipe = labeledAndFilteredImpacts(
        this.RE.computeImpactsOfRecipe()
      );

      const detailedDietImpactsCsv =
        DETAILED_RESULTS_HEADER.join(",") +
        "\n" +
        stringifyCsvData(detailedDietImpacts);

      const impactsOfRecipeCsv =
        DETAILED_RESULTS_HEADER.join(",") +
        "\n" +
        stringifyCsvData(impactsOfRecipe);

      console.log(detailedDietImpactsCsv);
      console.log(impactsOfRecipeCsv);
      downloadAsPlaintext(
        detailedDietImpactsCsv,
        "SAFAD OR Footprints per Diet.csv"
      );
      downloadAsPlaintext(
        impactsOfRecipeCsv,
        "SAFAD OR Footprints per Food.csv"
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
        downloadAsPlaintext(
          "Food Code,Food Name,Food Amount (g),RPC Code,RPC Name,RPC Amount (g)\n" +
            stringifyCsvData(dietBreakdownRows),
          "SAFAD OS Breakdown per Food.csv"
        );
      }
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
  },

  beforeMount() {
    if (!(this.RE instanceof ResultsEngine)) {
      return;
    }

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
    this.slvRecipesFile.getDefault(this.countryCode).then((data) => {
      this.slvRecipesFile?.setter(this.slvRecipesFile.parser(data));
    });
  },
});
</script>

<template>
  <section class="start-page">
    <header class="cluster cluster--center">
      <img src="@/assets/slu-logo.svg" class="start-page__logo" />
      <h1>
        <b>S</b>ustainable <b>A</b>ssesment of <b>F</b>oods <b>A</b>nd
        <b>D</b>iets
      </h1>
    </header>
    <div class="stack u-tac start-page__main">
      <h3>Living Lab Country</h3>
      <select v-model="countryCode">
        <option
          v-for="code in LL_COUNTRY_CODES"
          :value="code"
          v-text="LL_COUNTRY_NAMES[code]"
        />
      </select>
      <h3>Input Data</h3>

      <FileSelector
        file-label="Footprints RPC"
        @setFile="(p: SetFilePayload) => setFile(p, footprintsRpcsFile)"
        @reset="() => resetFile(footprintsRpcsFile!)"
        @download="() => downloadFile(footprintsRpcsFile!)"
        :file-name="footprintsRpcsFile?.name || footprintsRpcsFile?.defaultName"
        :state="footprintsRpcsFile?.state || 'default'"
        :file-description="Descriptions.footprintsRpc"
      />

      <FileSelector
        file-label="Diet"
        @setFile="(p: SetFilePayload) => setFile(p, dietFile)"
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
        @reset="() => resetFile(foodsRecipesFile!)"
        @download="() => downloadFile(foodsRecipesFile!)"
        :fileName="foodsRecipesFile?.name || foodsRecipesFile?.defaultName"
        :state="foodsRecipesFile?.state || 'default'"
        :file-description="Descriptions.recipes"
      />

      <FileSelector
        file-label="RPC Origin & Waste"
        @setFile="(p: SetFilePayload) => setFile(p, rpcOriginWasteFile)"
        @reset="() => resetFile(rpcOriginWasteFile!)"
        @download="() => downloadFile(rpcOriginWasteFile!)"
        :fileName="rpcOriginWasteFile?.name || rpcOriginWasteFile?.defaultName"
        :state="rpcOriginWasteFile?.state || 'default'"
        :file-description="Descriptions.rpcOriginWaste"
      />

      <FileSelector
        file-label="Processes Energy Demands"
        @setFile="(p: SetFilePayload) => setFile(p, processesEnergyDemandsFile)"
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
        @reset="() => resetFile(emissionsFactorsTransportFile!)"
        @download="() => downloadFile(emissionsFactorsTransportFile!)"
        :fileName="
          emissionsFactorsTransportFile?.name ||
          emissionsFactorsTransportFile?.defaultName
        "
        :state="emissionsFactorsTransportFile?.state || 'default'"
        :file-description="Descriptions.emissionsFactorsTransport"
      />

      <div class="stack slv-container" v-show="useSlvRecipes">
        <h3>SLV Recipes</h3>
        <FileSelector
          file-label="SLV Recipes"
          @setFile="(p: SetFilePayload) => setFile(p, slvRecipesFile)"
          @reset="() => resetFile(slvRecipesFile!)"
          @download="() => downloadFile(slvRecipesFile!)"
          :fileName="slvRecipesFile?.name || slvRecipesFile?.defaultName"
          :state="slvRecipesFile?.state || 'default'"
          :file-description="Descriptions.slvRecipesFile"
        />
      </div>

      <div class="cluster cluster--between">
        <label class="cluster">
          <input type="checkbox" v-model="useSlvRecipes" />
          Use Swedish Livsmedelsverket Recipes
        </label>

        <div class="cluster">
          <label class="cluster" :class="{ 'u-faded': useSlvRecipes }">
            <input type="checkbox" v-model="includeBreakdownFile"
            :disabled="useSlvRecipes" />
            Include Breakdown File
          </label>
          <button class="button button--accent" @click="compute">
            Download
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@import "styles/constants";

.start-page {
  grid-row-start: sidebar-start;
  grid-column-start: sidebar-start;
  grid-row-end: results-end;
  grid-column-end: results-end;
  display: block;

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
}

.start-page__logo {
  width: auto;
  height: 3em;
}

.start-page__main {
  width: auto;
  margin: 0 auto;
  width: 60em;
  max-width: 95%;
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
