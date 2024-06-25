<script setup lang="ts">
import { computed, onBeforeMount, ref, getCurrentInstance } from "vue";
import Listbox from "primevue/listbox";
import { defaultRpcNames } from "@/lib/efsa-names";
import PrimeVue from "primevue/config";

getCurrentInstance()?.appContext.app.use(PrimeVue, {
  unstyled: true,
});

const MAX_ITEMS = 12;

// Vue instance
const props = defineProps<{
  foodCodes: string[];
  initialValues: string[] | undefined;
}>();

const emit = defineEmits<{
  (e: "change", codes: string[]): void;
}>();

// Static state
const rpcNames = ref<Record<string, string>>({});

// Dynamic state

// List of all items
const items = computed(() => props.foodCodes);
// Keep track of codes selected
const selected = ref<string[]>([]);
// Sorted list, for drawing in UI
const selectedSorted = computed(() => [...selected.value].sort());
// Helper for printing label name
const getName = (code: string) => code + " " + (rpcNames.value[code] || "");

// Set initialValues
onBeforeMount(() => {
  if (props.initialValues) selected.value = [...props.initialValues];

  defaultRpcNames().then((names: Record<string, string>) => {
    rpcNames.value = names;
  });
});

function onUpdate(items: string[]) {
  if (selected.value.length > MAX_ITEMS) {
    selected.value = items.slice(0, MAX_ITEMS);
  }

  emit("change", [...selected.value].sort());
}

function deselectItem(codeToDeselect: string) {
  selected.value = selected.value.filter((code) => code !== codeToDeselect);
  onUpdate(selected.value);
}
</script>

<template>
  <div class="foods-listbox stack-s">
    <Listbox
      v-model="selected"
      :options="items"
      :optionLabel="getName"
      :virtualScrollerOptions="{ itemSize: 32 }"
      listStyle="height:250px"

      multiple
      striped
      checkmark
      filter

      filterPlaceholder="Filter codes and names..."
      emptyFilterMessage="No results found."
      emptyMessage="No results found."

      ariaLabelledby="listbox-label"

      @update:modelValue="onUpdate"
    />
    <div class="error-region" aria-live="polite">
      <p v-if="selected.length === MAX_ITEMS">
        Maximum number of food-items selected.
      </p>
    </div>
    <label><strong>Selected items:</strong></label>
    <div class="foods-listbox__selected">
      <button
        v-for="code in selectedSorted"
        v-text="getName(code)"
        :title="`Remove ${getName(code)} from preview.`"
        @click="() => deselectItem(code)"
      />
    </div>
  </div>
</template>

<style lang="scss">
@import "../../styles/constants";

.foods-listbox__selected {
  display: flex;
  flex-wrap: wrap;
  font-size: 0.875em;

  &:empty::before {
    content: "Select foods in the list below...";
    font-style: italic;
    display: inline-block;
    padding: 0.15em;
  }

  button {
    $hr-border: 2px solid $gray;

    border: 0;
    margin: 0;
    padding: 0.33em;
    width: 100%;

    display: flex;
    align-items: center;
    justify-content: space-between;

    border-bottom: $hr-border;
    border-radius: 0;

    text-align: left;

    background: transparent;
    font-weight: normal;
    color: $type; // some browsers have other defaults

    &:first-child {
      border-top: $hr-border;
    }

    &:hover {
      opacity: 0.5;
    }

    &:focus {
      outline: 2px solid black;
    }

    &::after {
      content: "×";
      display: inline-block;
      margin-left: 0.25em;
      font-size: 1.5em;
      font-weight: normal;
      line-height: 1;
    }
  }
}

.foods-listbox {
  label {
    display: block;
    font-size: 0.875em;
  }

  [data-pc-name="iconfield"] {
    display: flex;
    flex-direction: column-reverse;
    gap: 0.25em;
    margin-bottom: 1em;

    span {
      display: flex;
      align-items: center;
      font-size: 0.9em;
      gap: 0.5rem;

      &::after {
        content: "Search:";
        font-weight: bold;
      }
    }
  }

  input[type="text"] {
    appearance: none; // Avoid rounded-edges on e.g. mobile chromium

    display: block;
    border: 2px solid $gray;
    padding: 0.5em;
    border-radius: 0.25em;
    width: 100%;

    &:focus {
      border-color: black;
      outline: none;
    }
  }

  .p-virtualscroller {
    border: 2px solid $gray;

    &:focus-within {
      border-color: black;
    }
  }

  ul {
    max-width: 100%;
    max-width: 95vw; // Hack: otherwise expands beyond viewport

    // Reset ul-styles
    padding: 0;
    margin-bottom: 0;
    list-style-type: none;
  }

  li {
    margin: 0;
    padding: 0.25em 0.5em;

    font-size: 0.875em;

    &[data-p-focused="true"] {
      background: $gray;
    }

    &:hover {
      background: $blue_dove;
      cursor: pointer;
    }

    &[data-p-selected="true"] {
      font-weight: bold;

      &:hover {
        background: $red_apricot;
        color: black;
      }
    }

    &[data-p-selected="false"] svg {
      display: none;
    }

    svg {
      display: inline-block;
      margin-right: 0.425em;

      width: auto;
      height: 0.75em;
    }
  }

  .error-region {
    font-size: 0.875em;
    font-style: italic;
    text-align: right;
    color: $green_forest;
    padding: 0.15em;

    margin-top: 0;

    p {
      margin: 0;
    }

    &:empty {
      display: none;
    }
  }
}
</style>
