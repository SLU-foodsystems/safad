<script lang="ts">
import { defineComponent } from "vue";

import { csvToStructuredJson } from "@/lib/csv-io";
import FileInput from "./StartPageFileInput.vue";

type FileState = "initial" | "loading" | "loaded" | "error";

const CountryBaseDietImports = import.meta.glob("../data/diets/*.json");

const importCountryBaseDiet = (country: string) => {
  const imprt = CountryBaseDietImports[`../data/diets/${country}.json`];
  if (!imprt) {
    throw new Error("Could not find import for country-code " + country);
  }
  return imprt() as Promise<{ default: BaseValues }>;
};

interface UserFile {
  name: string;
  data: string;
}

export default defineComponent({
  emits: ["submit"],

  data() {
    return {
      fileState: "initial" as FileState,
      baseDietFile: null as UserFile | null,
      envFactorsFile: null as UserFile | null,
      nutrFactorsFile: null as UserFile | null,
      useCustomFiles: !false,
    };
  },

  methods: {
    parseBaseDietCsv(rawCsvText: string | null) {
      try {
        const structuredData = csvToStructuredJson(rawCsvText as string);
        return JSON.stringify(structuredData);
      } catch (err) {
        console.error(err);
        throw new Error("Failed parsing file!");
      }
    },

    async submit() {
      const country = (this.$refs.select as HTMLSelectElement).value;

      const baseDietImport = this.baseDietFile
        ? this.baseDietFile.data
        : await importCountryBaseDiet(country);



      // 1. Base Diet
      // 2. Env
      // 2. Env Org.
      // 2. Nutr






    },



    async onSimpleSubmit() {
      const country = (this.$refs.select as HTMLSelectElement).value;
      try {
        const { default: json } = await importCountryBaseDiet(country);

        // Show loading indicator
        // Validate that the 'country' value is a valid one.
        // Fetch file depending on country

        this.$emit("submit", json);
      } catch (err) {
        console.error(err);
        window.alert("Error occured when fetching country import");
      }
    },
    onCustomSubmit() {
      if (this.fileState !== "loaded") {
        // TODO
        console.error(
          `onFileSubmit triggered for invalid state (${this.fileState})`
        );
        return;
      }

      // csv to json
      if (typeof this.fileData !== "string") {
        return;
      }
      this.$emit("submit", JSON.parse(this.fileData));
      // this.fileData = null? i.e. clean up ram.
    },
    onSubmit() {
      if (this.useCustomFiles) {
        this.onCustomSubmit();
      } else {
        this.onSimpleSubmit();
      }
    },
  },
});
</script>

<template>
  <section class="start-page">
    <div class="stack">
      <div class="cluster cluster--center">
        <img src="../assets/slu-logo.svg" class="start-page__logo" />
      </div>
      <h2>Pick a baseline country</h2>
      <div class="cluster">
        <select ref="select">
          <option value="se">Sweden</option>
          <option value="dk">Denmark</option>
          <option value="de">Germany</option>
          <option value="fr">France</option>
          <option value="es">Spain</option>
          <option value="uk">United Kingdom</option>
        </select>
      </div>
      <label class="cluster">
        <input type="checkbox" v-model="useCustomFiles" />
        Upload custom diet and impact factors
      </label>
      <div v-show="useCustomFiles" class="stack">
        <h3 class="u-visually-hidden">Custom files</h3>
        <h4>Step 1: Base Diet</h4>
        <p>Upload your own csv-file with assumed base diet. <a href="">Download example
        file</a>.</p>
        <FileInput file-name="baseDietFile.name"
          @reset=""
          :onload="onBaseDietFileLoad"
        />
        <h4>Step 2: Environmental and Nutritional Factors</h4>
        <p>Upload your own csv-files with environmental impact factors and
        nutritional values for each of the foods. <a>Download example
        files</a>.</p>
      </div>
      <div class="cluster cluster--end">
        <button class="button button--accent" :disabled="useCustomFiles && fileState !== 'loaded'" @click="onSubmit">
          Continue
        </button>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@import "../styles/constants";

.start-page {
  grid-row-start: sidebar-start;
  grid-column-start: sidebar-start;
  grid-row-end: results-end;
  grid-column-end: results-end;

  height: 100%;
  width: 100%;

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
