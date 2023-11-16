<script lang="ts">
import { defineComponent } from "vue";
import * as DefaultFilesImporter from "@/lib/default-files-importer";
import ResultsEngine from "./lib/ResultsEngine";
import FileSelector from "./components/FileSelector.vue";
import { parseFootprintsRpcs } from "./lib/input-files-parsers";

const LL_COUNTRY_CODES: string[] = [
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  // "PL",
  "ES",
  "SE",
]

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
  getDefault: (country: string) => Promise<T>,
  parser: (data: string) => T;
  setter: (data: T) => void;
}

export default defineComponent({
  components: { FileSelector },
  data() {
    return {
      LL_COUNTRY_CODES,
      LL_COUNTRY_NAMES,

      RE: (new ResultsEngine()) as ResultsEngine,
      countryCode: "SE",
      diet: [],

      processEnvFactors: null as null | FileInterface<Record<string, number[]>>,

      emissionsFactorsPackaging: null as null | FileInterface<Record<string,
        number[]>>,
      emissionsFactorsEnergy: null as null | FileInterface<Record<string, number[] | Record<string, number[]>>>,
      emissionsFactorsTransport: null as null | FileInterface<NestedRecord<string, number[]>>,

      processesEnergyDemands: null as null | FileInterface<Record<string,
        number[]>>,
      preparationProcessesAndPackaging: null as null |
        FileInterface<Record<string, string>>,
      wasteRetailAndConsumer: null as null | FileInterface<Record<string,
        number[]>>,

      footprintsRpcsFile: null as null | FileInterface<RpcFootprintsByOrigin>,
    };
  },

  methods: {
    async compute() {
      const diet = await DefaultFilesImporter.diet(this.countryCode);
      const impacts = this.RE.computeImpacts(diet);
      console.log(impacts);
    },

    async resetFile<T>(fileInterface: FileInterface<T>) {
      if (!fileInterface) return;

      fileInterface.setter(await fileInterface.getDefault(this.countryCode));
      fileInterface.name = "";
      fileInterface.state = "default";
      fileInterface.data = null;
    },

    async setFile<T>(payload: SetFilePayload, fileInterface: FileInterface<T> | null) {
      if (!fileInterface) return;

      fileInterface.setter(fileInterface.parser(payload.data));
      fileInterface.name = payload.name;
      fileInterface.state = "custom";
      fileInterface.data = null;
    },

    async downloadFile<T>(fileInterface: FileInterface<T>) {

      console.log("TODO: Download", fileInterface.name || fileInterface.defaultName)

      /*if (fileInterface.state === "default") {
        downloadAsPlaintext(await fileInterface.getDefault(this.countryCode), fileInterface.defaultName);
      } else {
        downloadAsPlaintext(fileInterface.data, fileInterface.name);
      }*/
    }
  },

  beforeMount() {
    DefaultFilesImporter.configureResultsEngine(this.RE as ResultsEngine, this.countryCode);
    this.footprintsRpcsFile = {
      state: "default",
      name: "",
      data: null,
      defaultName: "footprints-rpcs.csv",
      getDefault: DefaultFilesImporter.footprintsRpcs,
      parser: parseFootprintsRpcs,
      setter: (data: RpcFootprintsByOrigin) => (this.RE as ResultsEngine).setFootprintsRpcs(data),
    };
  },
});
</script>

<template>
  <section class="start-page">
    <div class="stack u-tac">
      <div class="cluster cluster--center">
        <img src="@/assets/slu-logo.svg" class="start-page__logo" />
      </div>
      <h2>SLU SAFAD</h2>
      <div class="stack">
        <h3>Living Lab Country</h3>
        <select v-model="countryCode">
          <option v-for="code in LL_COUNTRY_CODES" :value="code" v-text="LL_COUNTRY_NAMES[code]" />
        </select>
        <h3>Input Data</h3>

        <FileSelector @setFile="(p: SetFilePayload) => setFile(p, footprintsRpcsFile)"
          @reset="() => resetFile(footprintsRpcsFile!)" :fileName="footprintsRpcsFile?.name"
          :state="footprintsRpcsFile?.state || 'default'" />

        <h3>Parameter Files</h3>
        <!-- Processes Energy, PrepProcPack, Waste (Ret & cons.), rpc factors,
          Recipes-->
        <h3>Emissions Factors</h3>
        <div class="cluster cluster--center">
          <button class="button button--accent" @click="compute">Compute</button>
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

  height: 100%;
  width: 100%;
  padding: 2em 0;

  display: flex;
  justify-content: center;
  align-items: center;

  >div {
    flex-basis: 30em;
  }

  select {
    width: 20em;
    flex-grow: 1;
  }
}

.start-page__logo {
  width: auto;
  height: 4em;
  margin: 0 auto;
  margin-bottom: 2em;
}
</style>
