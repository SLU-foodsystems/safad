<script lang="ts">
import { defineComponent, type PropType } from 'vue';


export default defineComponent({
  props: {
    state: {
      type: String as PropType<"default" | "custom">,
      required: true,
    },
    fileLabel: String,
    fileName: String,
    fileDescription: String,
  },

  data() {
    return {
      showInfo: false,
    };
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

    toggleInfo() {
      this.showInfo = !this.showInfo;
    }
  },
});

</script>

<template>
  <div class="file-selector-box" :class="{ 'file-selector-box--custom': state === 'custom' }">
    <input hidden type="file" ref="fileInput" @change="onFileInputChange" />

    <div class="cluster expander-toggle-row">
      <h4>{{ fileLabel }}</h4>
      <button class="expander-toggle" :data-expanded="showInfo" @click="toggleInfo" v-if="fileDescription">Info</button>
    </div>
    <div class="info-text" :aria-hidden="!showInfo" :hidden="!showInfo">
      {{ fileDescription }}
    </div>
    <div class="cluster cluster--between">
      <i v-if="state === 'default'">{{ fileName }} (Default)</i>
      <span v-else v-text="fileName" />

      <div class="cluster">
        <button class="button button--slim button--accent" @click="onButtonClick" v-text="buttonText" />
        <button class="button button--slim" @click="download">Download Copy</button>
      </div>
    </div>
  </div>
</template>


<style lang="scss">
@import "../styles/_constants";

.file-selector-box {
  width: 100%;
  background: white;
  padding: 1em;
  text-align: left;

  $base-box-shadow: 0 0.3em 0.75em -0.65em rgba(black, 0.5);
  box-shadow: $base-box-shadow;

  &--custom {
    box-shadow: $base-box-shadow, -0.25em 0 0 $blue_sky;
  }
}

h4 {
  font-weight: bold;
}

.expander-toggle-row h4 {
  margin-bottom: 0;
}

.expander-toggle {
  display: inline-block;
  font-size: 0.875em;
  border-radius: 1em;
  padding: 0.25em 0.5em;
  background: $lightgray;
  border: 1px solid $gray_feather;
  &:focus {
    outline: 2px solid black;
  }
}

.info-text {
  background: $lightgray;
  padding: 0.5em;
  margin: 0.5em 0;
  font-style: italic;
}
</style>

