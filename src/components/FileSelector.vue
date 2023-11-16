<script lang="ts">
import { defineComponent, type PropType } from 'vue';


export default defineComponent({
  props: {
    state: {
      type: String as PropType<"default" | "custom">,
      required: true,
    },
    fileName: String,
  },

  emits: {
    download() { return true; },
    reset() { return true; },
    ["set-file"](_payload: { data: string; name: string; }) {
      return true;
    },
  },

  computed: {
    buttonText() {
      return this.state === "default" ? "Upload custom file" : "Reset to default";
    },

    labelText() {
      return this.state === "default" ? "Default File" : this.fileName;
    },
  },

  methods: {
    onButtonClick() {
      if (this.state === "default") {
        // Trigger click on @file input
        // If successful, trigger event with data
        (this.$refs.fileInput as HTMLInputElement)?.click();
      } else {
        this.$emit("reset");
      }
    },

    onFileInputChange(event: Event) {
      const { files } = event.target as HTMLInputElement;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file) return;

      const fileName = file.name || "";
      const reader = new FileReader();

      reader.addEventListener("error", (...args) => {
        // TODO: Handle errors
        console.error(...args);
      });
      reader.addEventListener("load", () => {
        this.$emit("set-file", {
          name: fileName,
          data: reader.result as string | "",
        });
      });
      reader.readAsText(file);
    },

    download() {
      this.$emit("download");
    },
  },
});

</script>

<template>
  <div class="file-selector-box cluster">
    <input type="file" hidden ref="fileInput" @change="onFileInputChange" />
    <strong>{{ labelText }}</strong>
    <button class="button button--slim button--accent" @click="onButtonClick" v-text="buttonText" />
    <button class="button button--slim" @click="download">Download Copy</button>
  </div>
</template>


<style lang="scss"></style>

