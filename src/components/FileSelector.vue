<script lang="ts">
import { defineComponent, type PropType } from "vue";

import LoadingOverlay from "./LoadingOverlay.vue";
import {
  setFile,
  downloadFile,
  resetFile,
  setComment,
} from "@/lib/file-interface-utils";

import {
  CsvValidationError,
  CsvValidationErrorType,
} from "@/lib/input-files-parsers";

export default defineComponent({
  components: { LoadingOverlay },

  props: {
    fileInterface: {
      type: Object as PropType<InputFile<any>>,
      required: true,
    },
    countryCode: {
      type: String,
      required: true,
    },
    fileDescription: String,
    fileLabel: String,
  },

  data() {
    return {
      showComment: false,
      isLoading: false,
      showInfo: false,
      error: null as CsvValidationErrorType | null,

      comment: "",
    };
  },

  computed: {
    fileButtonText() {
      return this.fileInterface.state === "default"
        ? "Upload custom file"
        : "Reset to default";
    },
    commentToggleButtonText() {
      if (this.showComment) {
        return "Hide comment";
      }

      return this.comment.trim() === "" ? "Add comment" : "Edit comment";
    },
    fileName(): string {
      return (
        this.fileInterface.name ||
        this.fileInterface.defaultName(this.countryCode) ||
        ""
      );
    },
    // Only valid when mode is default
    lastModified() {
      return this.fileInterface.lastModified(this.countryCode);
    },

    errorMessage() {
      if (this.error === null) return "";

      const baseErrorMessage = "Woops! Something was wrong with the csv file.";
      const baseSuggestionMessage = "Make sure you uploaded the correct file.";
      switch (this.error) {
        case CsvValidationErrorType.MinRows:
          return (
            baseErrorMessage +
            " The uploaded csv file looks unexpectedly short. " +
            baseSuggestionMessage
          );
        case CsvValidationErrorType.MaxRows:
          return (
            baseErrorMessage +
            " The uploaded csv file looks unexpectedly long. " +
            baseSuggestionMessage
          );
        case CsvValidationErrorType.MinCols:
          return (
            "Woops! The uploaded csv file has too few columns. " +
            baseSuggestionMessage +
            " You can download the default file and compare, if you are " +
            "unsure of the format."
          );
        case CsvValidationErrorType.MaxCols:
          return (
            baseErrorMessage +
            " The csv file has too many columns. " +
            baseSuggestionMessage +
            " You can download the default file and compare, if you are " +
            "unsure of the format."
          );
        case CsvValidationErrorType.SingleCol:
          return (
            baseErrorMessage +
            " We only detected a single column in the file. " +
            "Make sure you are using a comma (,) as the csv-file separator " +
            "(not e.g. tab or semicolon), and that you uploaded the correct " +
            "file. You can download the default file and compare, if you are " +
            "unsure of the format."
          );
        case CsvValidationErrorType.Empty:
          return "Woops! The csv file was empty. " + baseSuggestionMessage;
        case CsvValidationErrorType.Unknown:
          return baseErrorMessage + " " + baseSuggestionMessage;
      }
    },
  },

  methods: {
    onButtonClick() {
      this.error = null;
      if (this.fileInterface.state === "default") {
        // Trigger click on @file input
        // If successful, trigger event with data
        (this.$refs.fileInput as HTMLInputElement)?.click();
      } else {
        resetFile(this.countryCode, this.fileInterface);
        // Reset the DOM input element as well
        const { fileInput } = this.$refs as {
          fileInput: null | HTMLInputElement;
        };
        if (fileInput) {
          fileInput.value = "";
        }
      }
    },

    onError(err: CsvValidationError) {
      this.error = err.type;
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
        this.onError(new CsvValidationError(CsvValidationErrorType.Unknown));
        console.error(...args);
      });
      reader.addEventListener("load", async () => {
        this.isLoading = false;
        try {
          // Must await here for error to be caught
          await setFile(
            {
              name: fileName,
              data: reader.result as string | "",
            },
            this.fileInterface
          );
        } catch (err) {
          if (err instanceof CsvValidationError) {
            this.onError(err);
          } else {
            this.onError(
              new CsvValidationError(CsvValidationErrorType.Unknown)
            );
          }
          resetFile(this.countryCode, this.fileInterface);
        }
      });
      reader.readAsText(file);
    },

    download() {
      downloadFile(this.countryCode, this.fileInterface);
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
      setComment(this.comment, this.fileInterface);
    },
  },
});
</script>

<template>
  <div
    class="file-selector-box"
    :class="{ 'file-selector-box--custom': fileInterface.state === 'custom' }"
  >
    <input
      hidden
      type="file"
      ref="fileInput"
      accept=".csv"
      @change="onFileInputChange"
    />

    <div class="error-message cluster" v-if="error">
      <span class="error-message__icon" />
      <span v-text="errorMessage" />
    </div>
    <div class="cluster cluster--between">
      <div class="stack stack-s">
        <h4>{{ fileLabel }}</h4>
        <span v-if="fileInterface.state === 'default'"
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

.error-message {
  width: 100%;
  margin-bottom: $s-1;
  padding: 0.75em;
  flex-wrap: nowrap;

  border-radius: 0.25em;
  background: rgba($yellow, 0.1);
  border: 2px solid rgba($yellow, 0.5);
}

.error-message__icon {
  $size: 1.5rem;

  vertical-align: middle;

  width: $size;
  height: $size;
  flex: 0 0 $size;
  border-radius: $size;

  border: 2px solid currentColor;
  font-size: 0.75em;
  text-align: center;
  font-weight: bold;

  &::after {
    content: "!";
  }
}

</style>
