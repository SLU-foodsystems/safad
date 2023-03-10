<script lang="ts">
import { csvToStructuredJson } from "@/lib/csv-io";
import { defineComponent } from "vue";
type FileState = "initial" | "loading" | "loaded" | "error";

export default defineComponent({
  emits: ["submit"],

  data() {
    return {
      fileState: "initial" as FileState,
      fileName: null as string | null,
      fileData: null as string | null,
      useCustomFile: false,
    };
  },

  methods: {
    onFileChange(event: Event) {
      const { files } = event.target as HTMLInputElement;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file) return;

      this.fileState = "loading";

      const fileName = file.name || "data.csv";
      const reader = new FileReader();

      // TODO: Handle errors
      reader.addEventListener("error", (...args) => {
        this.fileState = "error";
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

        const structuredData = csvToStructuredJson(rawCsvText as string);
        this.fileData = JSON.stringify(structuredData);
        this.fileName = fileName;
        this.fileState = "loaded";
      } catch (err) {
        console.error(err);
        alert("Failed parsing file!");
      }
    },
    resetFileInput() {
      this.fileData = null;
      this.fileName = null;
      this.fileState = "initial";
      (this.$refs.fileInput as HTMLInputElement).value = "";
    },
    onSelectSubmit() {
      const country = (this.$refs.select as HTMLSelectElement).value;

      // Show loading indicator
      // Validate that the 'country' value is a valid one.
      // Fetch file depending on country

      import("../data/original-values").then((module) => {
        // csv to json - or maybe that's a build step?
        this.$emit("submit", module.default);
      });
    },
    onFileSubmit() {
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
      if (this.useCustomFile) {
        this.onFileSubmit();
      } else {
        this.onSelectSubmit();
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
        <input type="checkbox" v-model="useCustomFile" />
        Use custom base diet
      </label>
      <div v-show="useCustomFile">
        <!-- <p>Upload your own csv-file with base data. [get template here] </p> -->
        <div class="file-input-container" v-show="useCustomFile">
          <div v-show="fileState === 'initial'">
            <input type="file" @change="onFileChange" accept=".csv" ref="fileInput" />
          </div>
          <div v-show="fileState === 'loaded'" class="cluster cluster--between">
            <span class="cluster cluster--s-gap">
              <img src="../assets/file.svg" width="45" height="58" />
              {{ fileName }}
            </span>
            <button class="button--link" @click="resetFileInput">Reset</button>
          </div>
        </div>
      </div>
      <div class="cluster cluster--end">
        <button class="button button--accent" :disabled="useCustomFile && fileState !== 'loaded'" @click="onSubmit">
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

.file-input-container {
  background: $gray;
  padding: 1em;
  border-radius: 0.25em;

  button {
    padding: 0 1em;
  }

  img {
    height: 1em;
    width: auto;
    opacity: 0.5;
    margin-right: 1ch;
    user-select: none;
  }
}

.divider {
  position: relative;
  width: 100%;
  text-align: center;

  &::before {
    $h: 0.25em;
    content: "";

    position: absolute;
    display: block;
    z-index: -1;

    top: 50%;
    left: 0;
    margin-top: ($h * -0.5);
    width: 100%;
    height: $h;

    background: $gray;
  }

  &::after {
    content: attr(data-label);
    position: relative;
    display: inline-block;
    top: -0.125em;

    margin: 0 auto;
    padding: 0.25em 1em;

    background: white;
  }
}
</style>
