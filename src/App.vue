<script lang="ts">
import { defineComponent } from "vue";
import * as DefaultFilesImporter from "@/lib/default-files-importer";
import ResultsEngine from "./lib/ResultsEngine";
import FileSelector from "./components/FileSelector.vue";
import * as InputFileParsers from "./lib/input-files-parsers";

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

const initFileInterface = <T>(
  partialFileInterface: Pick<
    FileInterface<T>, "defaultName" | "getDefault" | "parser" | "setter"
  >
): FileInterface<T> => ({
  state: "default",
  name: "",
  data: null,
  ...partialFileInterface
})


export default defineComponent({
  components: { FileSelector },
  data() {
    return {
      LL_COUNTRY_CODES,
      LL_COUNTRY_NAMES,

      RE: (new ResultsEngine()) as ResultsEngine,
      countryCode: "SE",
      diet: [] as Diet,

      processEnvFactorsFile: null as null | FileInterface<Record<string, number[]>>,

      emissionsFactorsPackagingFile: null as null | FileInterface<Record<string, number[]>>,
      emissionsFactorsEnergyFile: null as null | FileInterface<Record<string, number[] | Record<string, number[]>>>,
      emissionsFactorsTransportFile: null as null | FileInterface<NestedRecord<string, number[]>>,

      processesEnergyDemandsFile: null as null | FileInterface<Record<string, number[]>>,
      preparationProcessesAndPackagingFile: null as null | FileInterface<Record<string, string>>,
      wasteRetailAndConsumerFile: null as null | FileInterface<Record<string, number[]>>,

      footprintsRpcsFile: null as null | FileInterface<RpcFootprintsByOrigin>,
      dietFile: null as null | FileInterface<Diet>,
    };
  },

  methods: {
    async compute() {
      const impacts = this.RE.computeImpacts(this.diet);
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
    this.footprintsRpcsFile = initFileInterface({
      defaultName: "footprints-rpcs.csv",
      getDefault: DefaultFilesImporter.footprintsRpcs,
      parser: InputFileParsers.parseFootprintsRpcs,
      setter: this.RE.setFootprintsRpcs,
    });

    this.dietFile = initFileInterface({
      defaultName: "diet.csv",
      getDefault: DefaultFilesImporter.diet,
      parser: InputFileParsers.parseDiet,
      setter: (data: Diet) => { this.diet = data },
    });

    this.processesEnergyDemandsFile = initFileInterface({
      defaultName: "processes-energy-demands.csv",
      getDefault: DefaultFilesImporter.processesEnergyDemands,
      parser: InputFileParsers.parseEmissionsFactorsPackaging,
      setter: this.RE.setEmissionsFactorsPackaging,
    });
    this.preparationProcessesAndPackagingFile = initFileInterface({
      defaultName: "prep-processes-and-packaging.csv",
      getDefault: DefaultFilesImporter.preparationProcessesAndPackaging,
      parser: InputFileParsers.parseProcessesPackaging,
      setter: this.RE.setPrepProcessesAndPackaging,
    });
    this.wasteRetailAndConsumerFile = initFileInterface({
      defaultName: "waste-retail-and-consumer.csv",
      getDefault: DefaultFilesImporter.wasteRetailAndConsumer,
      parser: InputFileParsers.parseWasteRetailAndConsumer,
      setter: this.RE.setWasteRetailAndConsumer,
    });

    this.emissionsFactorsPackagingFile = initFileInterface({
      defaultName: "emissions-factors-packaging.csv",
      getDefault: DefaultFilesImporter.emissionsFactorsPackaging,
      parser: InputFileParsers.parseEmissionsFactorsPackaging,
      setter: this.RE.setEmissionsFactorsPackaging,
    });
    this.emissionsFactorsEnergyFile = initFileInterface({
      defaultName: "emissions-factors-energy.csv",
      getDefault: DefaultFilesImporter.emissionsFactorsEnergy,
      parser: InputFileParsers.parseEmissionsFactorsEnergy,
      setter: this.RE.setEmissionsFactorsEnergy,
    });
    this.emissionsFactorsTransportFile = initFileInterface({
      defaultName: "emissions-factors-transport.csv",
      getDefault: DefaultFilesImporter.emissionsFactorsTransport,
      parser: InputFileParsers.parseEmissionsFactorsTransport,
      setter: this.RE.setEmissionsFactorsTransport,
    });
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

        <h4>RPC Footprints</h4>
        <FileSelector @setFile="(p: SetFilePayload) => setFile(p, footprintsRpcsFile)"
          @reset="() => resetFile(footprintsRpcsFile!)" :fileName="footprintsRpcsFile?.name"
          :state="footprintsRpcsFile?.state || 'default'" />

        <h4>Diet</h4>
        <FileSelector
          @setFile="(p: SetFilePayload) => setFile(p, dietFile)"
          @reset="() => resetFile(dietFile!)"
          :fileName="dietFile?.name"
          :state="dietFile?.state || 'default'"
        />
        <h3>Parameter Files</h3>

        <!-- rpc factors, Recipes-->

        <h4>Parameter File: Processes Energy Demand</h4>
        <FileSelector
          @setFile="(p: SetFilePayload) => setFile(p, processesEnergyDemandsFile)"
          @reset="() => resetFile(processesEnergyDemandsFile!)"
          :fileName="processesEnergyDemandsFile?.name"
          :state="processesEnergyDemandsFile?.state || 'default'"
        />
        <h4>Parameter File: Preparation Processes and Packagin</h4>
        <FileSelector
          @setFile="(p: SetFilePayload) => setFile(p, preparationProcessesAndPackagingFile)"
          @reset="() => resetFile(preparationProcessesAndPackagingFile!)"
          :fileName="preparationProcessesAndPackagingFile?.name"
          :state="preparationProcessesAndPackagingFile?.state || 'default'"
        />
        <h4>Parameter File: Wastes, consumer and retail</h4>
        <FileSelector
          @setFile="(p: SetFilePayload) => setFile(p, wasteRetailAndConsumerFile)"
          @reset="() => resetFile(wasteRetailAndConsumerFile!)"
          :fileName="wasteRetailAndConsumerFile?.name"
          :state="wasteRetailAndConsumerFile?.state || 'default'"
        />

        <h3>Emissions Factors</h3>
        <h4>Emissions Factors: Packaging</h4>
        <FileSelector
          @setFile="(p: SetFilePayload) => setFile(p, emissionsFactorsPackagingFile)"
          @reset="() => resetFile(emissionsFactorsPackagingFile!)"
          :fileName="emissionsFactorsPackagingFile?.name"
          :state="emissionsFactorsPackagingFile?.state || 'default'"
        />
        <h4>Emissions Factors: Energy</h4>
        <FileSelector
          @setFile="(p: SetFilePayload) => setFile(p, emissionsFactorsEnergyFile)"
          @reset="() => resetFile(emissionsFactorsEnergyFile!)"
          :fileName="emissionsFactorsEnergyFile?.name"
          :state="emissionsFactorsEnergyFile?.state || 'default'"
        />
        <h4>Emissions Factors: Transport</h4>
        <FileSelector
          @setFile="(p: SetFilePayload) => setFile(p, emissionsFactorsTransportFile)"
          @reset="() => resetFile(emissionsFactorsTransportFile!)"
          :fileName="emissionsFactorsTransportFile?.name"
          :state="emissionsFactorsTransportFile?.state || 'default'"
        />
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
