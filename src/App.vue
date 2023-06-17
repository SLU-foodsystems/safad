<script lang="ts">
import { defineComponent } from "vue";

import ChartGenerator from "@/components/ChartGenerator.vue";
import { downloadAsPlaintext } from "@/lib/csv-io";

import getImpactsPerRpc from "@/lib/verification/rpc-impacts-with-import";
import getImpactsPerDiet from "@/lib/verification/diet-impacts";
import getRpcsInDiet from "@/lib/verification/diet-rpc-breakdowns";

import parseEnvFactorsCsv from "@/lib/env-file-csv-string-parser";

type FileState = "initial" | "loading" | "loaded" | "error";

export default defineComponent({
  components: { ChartGenerator },

  data() {
    return {
      envFactors: undefined as EnvOriginFactors | undefined,
      envFactorsFileName: "",
      fileState: "initial" as FileState,
    };
  },

  methods: {
    async generateImpactsPerRpc() {
      const validationFilesPerCountry = await getImpactsPerRpc(this.envFactors);
      validationFilesPerCountry.forEach(([country, csv]) => {
        downloadAsPlaintext(csv, country + "-rpc-impacts.csv");
      });
    },

    async generateImpactsPerDiet() {
      const validationFilesPerCountry = await getImpactsPerDiet(
        this.envFactors
      );
      validationFilesPerCountry.forEach(([country, csv]) => {
        downloadAsPlaintext(csv, country + "-category-impacts.csv");
      });
    },

    async generateRpcsPerDiet() {
      const validationFilesPerCountry = await getRpcsInDiet();
      validationFilesPerCountry.forEach(([country, csv]) => {
        downloadAsPlaintext(csv, country + "-diet-breakdown.csv");
      });
    },

    onFileChange(event: Event) {
      const { files } = event.target as HTMLInputElement;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file) return;

      const fileName = file.name || "env-factors.csv";
      const reader = new FileReader();

      reader.addEventListener("error", (...args) => {
        this.fileState = "error";
        // TODO: Handle errors
        console.error(...args);
      });
      reader.addEventListener("load", () => {
        this.attemptSetFileData(fileName, reader.result as string | null);
      });
      reader.readAsText(file);
    },
    attemptSetFileData(fileName: string, rawCsvText: string | null) {
      try {
        if (rawCsvText === null) throw new Error("reader result was null");

        const structuredData = parseEnvFactorsCsv(rawCsvText as string);
        this.envFactors = structuredData || undefined;
        this.envFactorsFileName = fileName;
        this.fileState = "loaded";
      } catch (err) {
        console.error(err);
        alert("Failed parsing file!");
      }
    },
    reset() {
      this.envFactors = undefined;
      this.envFactorsFileName = "";
      this.fileState = "initial";
      (this.$refs.fileInput as HTMLInputElement).value = "";
    },
  },
});
</script>

<template>
  <section class="start-page">
    <div class="stack u-tac">
      <div class="cluster cluster--center">
        <img src="../assets/slu-logo.svg" class="start-page__logo" />
      </div>
      <h2>SLU Plan'Eat Diet Tester</h2>
      <div class="env-factors-box stack">
        <h3>Replace Environmental Factors</h3>
        <div>
          <em>Upload a file in the format of ALL_RPC.csv to replace the
            environmental data used in the program.</em>
        </div>
        <div>
          <strong>Current File</strong>:
          {{ envFactorsFileName || "Default environmental file" }}
        </div>
        <div v-if="envFactors">
          <button class="button button--small" @click="reset">Reset</button>
        </div>
        <div v-if="!envFactors">
          <input type="file" @change="onFileChange" accepts=".csv" ref="fileInput"/>
        </div>
      </div>

      <h3>Download verification files</h3>
      <div class="cluster cluster--center">
        <button class="button button--accent" @click="generateImpactsPerRpc">
          RPC Verification
        </button>
        <button class="button button--accent" @click="generateImpactsPerDiet">
          Category Verification
        </button>
        <button class="button button--accent" @click="generateRpcsPerDiet">
          Diet Verification
        </button>
      </div>
      <ChartGenerator :envFactors="envFactors" />
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

  display: flex;
  justify-content: center;
  align-items: center;

  > div {
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

.env-factors-box {
  background: #f0f0f0;
  border: 2px solid #ddd;
  border-radius: 0.5em;
  padding: 1em;

  text-align: left;

  button {
    background: $yellow;
  }
}
</style>
