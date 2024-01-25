<script lang="ts">
import { defineComponent, type PropType } from "vue";

import LoadingOverlay from "./LoadingOverlay.vue";

export default defineComponent({
  components: { LoadingOverlay },

  props: {
    state: {
      type: String as PropType<"default" | "custom">,
      required: true,
    },
    fileLabel: String,
    fileName: String,
    fileDescription: String,
    lastModified: {
      type: String,
      default: "",
    },
  },

  data() {
    return {
      showComment: false,
      isLoading: false,
      showInfo: false,

      comment: "",
    };
  },

  emits: {
    download() {
      return true;
    },
    reset() {
      return true;
    },
    ["set-file"](_payload: { data: string; name: string }) {
      return true;
    },
    ["set-comment"](_message: string) {
      return true;
    },
  },

  computed: {
    fileButtonText() {
      return this.state === "default"
        ? "Upload custom file"
        : "Reset to default";
    },
    commentToggleButtonText() {
      if (this.showComment) {
        return "Hide comment";
      }

      return this.comment.trim() === "" ? "Add comment" : "Edit comment";
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

      this.isLoading = true;
      reader.addEventListener("error", (...args) => {
        // TODO: Handle errors
        this.isLoading = false;
        console.error(...args);
      });
      reader.addEventListener("load", () => {
        this.isLoading = false;
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
    },

    toggleComment() {
      this.showComment = !this.showComment;
      if (this.showComment) {
        (this.$refs.commentTextarea as HTMLTextAreaElement)?.focus();
      }
    },

    onCommentChange() {
      this.$emit("set-comment", this.comment);
    },
  },
});
</script>

<template>
  <div
    class="file-selector-box"
    :class="{ 'file-selector-box--custom': state === 'custom' }"
  >
    <input
      hidden
      type="file"
      ref="fileInput"
      accept=".csv"
      @change="onFileInputChange"
    />

    <div class="cluster cluster--between">
      <div class="stack stack-s">
        <h4>{{ fileLabel }}</h4>
        <span v-if="state === 'default'"
          >{{ fileName }}
          <span style="opacity: 0.6"
            >(default, last updated {{ lastModified }})
          </span>
        </span>

        <span v-else v-text="fileName" />

        <div class="cluster cluster--m-gap">
          <button
            class="expander-toggle"
            :data-expanded="showInfo"
            @click="toggleInfo"
            v-if="fileDescription"
          >
            {{ showInfo ? "Hide" : "Show" }} Info
          </button>
          <button
            class="expander-toggle"
            :data-expanded="showComment"
            @click="toggleComment"
            v-if="fileDescription"
          >
            {{ commentToggleButtonText }}
          </button>
          <button class="expander-toggle" @click="download">
            Download file
          </button>
        </div>
        <div v-if="showComment">
          <label>Comment on file:</label>
          <textarea
            placeholder="Add a comment for future reference."
            @change="onCommentChange"
            v-model="comment"
            ref="commentTextarea"
          />
        </div>
      </div>

      <div class="cluster">
        <button
          class="button button--slim button--accent"
          @click="onButtonClick"
          v-text="fileButtonText"
        />
      </div>
    </div>
    <div class="info-text" :aria-hidden="!showInfo" :hidden="!showInfo">
      {{ fileDescription }}
    </div>
    <LoadingOverlay :show="isLoading" />
  </div>
</template>

<style lang="scss" scoped>
@import "../styles/_constants";

.file-selector-box {
  width: 100%;
  background: white;
  padding: 1em;
  text-align: left;
  position: relative;

  $base-box-shadow: 0 0.3em 0.75em -0.65em rgba(black, 0.5);
  box-shadow: $base-box-shadow;

  &--custom {
    box-shadow:
      $base-box-shadow,
      -0.25em 0 0 $blue_sky;
  }

  h4 {
    font-weight: bold;
    margin-bottom: 0;
  }
}

textarea {
  width: 30em;
  max-width: 100%;
  font-size: 0.875em;
}

label {
  font-size: 0.875em;
  font-weight: bold;
}

.expander-toggle {
  display: inline-block;
  font-size: 0.875em;
  border-radius: 1em;
  padding: 0.25em 0.66em;
  background: $lightgray;
  border: 1px solid $gray_feather;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.5;
  }
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
