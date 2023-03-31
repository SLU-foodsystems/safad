<script lang="ts">
import { defineComponent, type PropType } from "vue";

type FileState = "initial" | "loading" | "loaded" | "error";

export default defineComponent({
  emits: ["reset", "onload"],

  props: {
    fileName: {
      type: String,
      required: true,
    },
    parser: {
      type: Function as PropType<(data: string) => string>,
      required: true,
    },
  },

  data() {
    return {
      state: 'intial' as FileState,
      name: '',
    };
  },

  methods: {
    onChange(event: Event) {
      const { files } = event.target as HTMLInputElement;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file) return;

      this.state = "loading";

      const name = file.name || "data.csv";
      const reader = new FileReader();

      // TODO: Handle errors
      reader.addEventListener("error", (...args) => {
        this.state = "error";
        console.error(...args);
      });
      reader.addEventListener("load", () => {
        const data = reader.result || "";
        if (data === "") {
          this.state = "error";
          console.error("File was empty");
          // TODO:
        }
        try {
          const parsed = this.parser({ name: name, data });
        } catch (err) {
          // TODO:
        }
      });

      reader.readAsText(file);
    },
    reset() {
      this.$emit('reset');
      this.$refs.fileInput.value = null;
      this.state = "intial";
    }
  },
});
</script>

<template>
  <div class="file-input-container">
    <div v-show="state === 'initial' || state === 'error'">
      <input type="file" @change="onChange" accept=".csv" ref="fileInput" />
    </div>
    <div v-show="state === 'loaded'" class="cluster cluster--between">
      <span class="cluster cluster--s-gap">
        <img src="../assets/file.svg" width="45" height="58" />
        {{ fileName }}
      </span>
      <button class="button--link" @click="reset">Reset</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "../styles/constants";

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
</style>
