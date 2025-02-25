<script lang="ts" setup>
import { ref, computed } from "vue";

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
import { cancelableDebounce } from "@/lib/utils";

const props = defineProps<{
  fileInterface: InputFile<any>;
  countryCode: string;
  fileLabel: string;
}>();

type ErrSummary = {
  type: CsvValidationErrorType;
  message: string | null;
};

const isLoading = ref(false);
const error = ref<ErrSummary | null>(null);

const showComment = ref(false);

const comment = ref("");

const fileInput = ref<HTMLInputElement | null>();
const commentTextarea = ref<HTMLTextAreaElement | null>();

const commentToggleButtonText = computed(() => {
  if (showComment.value) {
    return "Hide comment";
  }

  return comment.value.trim() === "" ? "Add comment" : "Edit comment";
});
const fileName = computed(
  () =>
    props.fileInterface.name ||
    props.fileInterface.defaultName(props.countryCode) ||
    ""
);
// Only valid when mode is default
const lastModified = computed(() =>
  props.fileInterface.lastModified(props.countryCode)
);

const errorMessage = computed(() => {
  if (error.value === null) return "";

  const baseErrorMessage = "Woops! Something was wrong with the csv file.";
  const baseSuggestionMessage = "Make sure you uploaded the correct file.";

  const errorType = error.value.type;
  switch (errorType) {
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
    case CsvValidationErrorType.SemiColon:
      return (
        baseErrorMessage +
        " It looks like the csv-file was joined with semi-colons (;) instead of commas (,). Make sure you export your data as comma-separated csvs."
      );
    case CsvValidationErrorType.Empty:
      return "Woops! The csv file was empty. " + baseSuggestionMessage;
    case CsvValidationErrorType.Unknown:
      const explanation = error.value.message
        ? " " + error.value.message + " "
        : " ";
      return baseErrorMessage + explanation + baseSuggestionMessage;
  }
});

const onButtonClick = () => {
  error.value = null;
  if (props.fileInterface.state === "default") {
    // Trigger click on @file input
    // If successful, trigger event with data
    fileInput.value?.click();
  } else {
    resetFile(props.countryCode, props.fileInterface);
    // Reset the DOM input element as well
    if (fileInput.value) {
      fileInput.value.value = "";
    }
  }
};

const onError = (err: CsvValidationError) => {
  error.value = { type: err.type, message: err.message || null };
};

const uploadFile = (file: File) => {
  const fileName = file.name || "";
  const reader = new FileReader();

  isLoading.value = true;
  reader.addEventListener("error", (...args) => {
    // TODO: Handle errors
    isLoading.value = false;
    onError(new CsvValidationError(CsvValidationErrorType.Unknown));
    console.error(...args);
  });
  reader.addEventListener("load", async () => {
    isLoading.value = false;
    try {
      if (props.fileInterface.state === "custom") {
        await resetFile(props.countryCode, props.fileInterface);
      }
      // Must await here for error to be caught
      await setFile(
        {
          name: fileName,
          data: reader.result as string | "",
        },
        props.fileInterface
      );
    } catch (err) {
      if (err instanceof CsvValidationError) {
        onError(err);
      } else {
        onError(new CsvValidationError(CsvValidationErrorType.Unknown));
      }
      resetFile(props.countryCode, props.fileInterface);
    }
  });
  reader.readAsText(file);
};

const onFileInputChange = (event: Event) => {
  const { files } = event.target as HTMLInputElement;
  if (!files || files.length === 0) return;

  const file = files[0];
  if (!file) return;
  uploadFile(file);
};

const download = () => {
  downloadFile(props.countryCode, props.fileInterface);
};

const toggleComment = () => {
  showComment.value = !showComment.value;
  if (showComment.value) {
    commentTextarea.value?.focus();
  }
};

const onCommentChange = () => {
  setComment(comment.value, props.fileInterface);
};

/**
 * Add drag and drop functionality
 */
const isDragging = ref(false);
const onDragover = () => {
  if (!isDragging.value && !isLoading.value) {
    isDragging.value = true;
  }
  scheduleDragleave();
};
const onDragleave = () => {
  isDragging.value = false;
  cancelScheduledDragleave();
};
const [scheduleDragleave, cancelScheduledDragleave] = cancelableDebounce(
  () => onDragleave(),
  3000
);
const onDrop = (e: DragEvent) => {
  isDragging.value = false;
  if (isLoading.value) return;
  if (!e.dataTransfer) return;

  const { files } = e.dataTransfer;
  if (!files) return;
  const file = files[0];
  if (!file) return;

  uploadFile(file);
};
</script>

<template>
  <div
    class="file-selector-box"
    :class="{
      'file-selector-box--custom': fileInterface.state === 'custom',
      'file-selector-box--dragging': isDragging,
    }"
    @dragover.prevent="onDragover"
    @dragleave.prevent="onDragleave"
    @dragend.prevent="onDragleave"
    @dragexit.prevent="onDragleave"
    @drop.prevent="onDrop"
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
        <span
          >{{ fileName }}
          <span style="opacity: 0.6" v-if="fileInterface.state === 'default'"
            >(default, last updated {{ lastModified }})
          </span>
          <button
            v-else
            class="expander-toggle"
            :data-expanded="showComment"
            @click="toggleComment"
            v-text="commentToggleButtonText"
          />
        </span>

        <div v-if="showComment && fileInterface.state === 'custom'">
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
        <button class="button button--slim" @click="download">
          <img src="@/assets/download.svg" alt="" />
          Download file
        </button>
        <button
          v-if="fileInterface.state === 'default'"
          class="button button--slim button--accent"
          @click="onButtonClick"
        >
          <img src="@/assets/upload-w.svg" alt="" />
          Upload custom file
        </button>
        <button
          v-else
          class="button button--slim button--secondary"
          @click="onButtonClick"
        >
          <img src="@/assets/reset-w.svg" alt="" /> Reset to default
        </button>
      </div>
    </div>
    <LoadingOverlay :show="isLoading" />
    <div class="file-selector-box__drag-overlay" @click.prevent="onDragleave">
      <img src="@/assets/upload.svg" alt="" /> Upload file...
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "../styles/_constants";

.file-selector-box {
  width: 100%;
  background: white;
  text-align: left;
  position: relative;

  h4 {
    font-weight: bold;
    margin-bottom: 0;
  }
}

.file-selector-box__drag-overlay {
  display: none;

  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;

  outline: 2px dashed $green_forest-bright;
  background: rgba(white, 0.9);
  font-weight: bold;

  img {
    margin-right: 0.25em;
  }

  .file-selector-box--dragging & {
    display: flex;
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
