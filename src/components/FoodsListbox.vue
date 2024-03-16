<script setup lang="ts">
import { defaultRpcNames } from "@/lib/efsa-names";
import { computed, onBeforeMount, ref } from "vue";

const MAX_ITEMS = 6;

// Go between efsa-code IDs (A.01.[...]) and prefixed codes, unique for the DOM
const ID_PREFIX = "listbox-el-";
const codeToId = (code: string) => ID_PREFIX + code;
const idToCode = (id: string) => id.substring(ID_PREFIX.length);

const props = defineProps<{
  foodCodes: string[];
  initialValues: string[] | undefined;
}>();

const emit = defineEmits<{
  (e: "change", codes: string[]): void;
}>();

// Keep track of codes selected
const selected = ref(new Set<string>());
// Sorted list, for drawing in UI
const selectedSorted = computed(() => [...selected.value].sort());
// Helper to check if code is selectd
const isSelected = (code: string) => selected.value.has(code);
const getName = (code: string) => code + " " + (defaultRpcNames[code] || "");

// Set initialValues
onBeforeMount(() => {
  if (props.initialValues) selected.value = new Set(props.initialValues);
});

const searchString = ref("");
const filteredFoodCodes = computed(() => {
  const query = searchString.value
    ? searchString.value.trim().toLowerCase()
    : "";
  if (!query) return props.foodCodes;

  return props.foodCodes.filter((code) => {
    const name = getName(code).toLowerCase();
    return name.includes(query);
  });
});

function notifyChange() {
  emit("change", [...selected.value].sort());
}

// Add / remove from set of selected codes
function toggleSelected(code: string) {
  if (isSelected(code)) {
    selected.value.delete(code);
  } else {
    if (selected.value.size >= MAX_ITEMS) {
      // TODO: Display error;
      return;
    }
    selected.value.add(code);
  }
  notifyChange();
}

function updateScroll(id: string) {
  if (!listboxNode.value) return;
  const selectedOption = document.getElementById(id);
  if (selectedOption) {
    const scrollBottom =
      listboxNode.value.clientHeight + listboxNode.value.scrollTop;
    const elementBottom =
      selectedOption.offsetTop + selectedOption.offsetHeight;

    if (elementBottom > scrollBottom) {
      listboxNode.value.scrollTop =
        elementBottom - listboxNode.value.clientHeight;
    } else if (selectedOption.offsetTop < listboxNode.value.scrollTop) {
      listboxNode.value.scrollTop = selectedOption.offsetTop;
    }

    selectedOption.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function onListItemClick(event: Event) {
  // Search upward in DOM-tree until we find
  let el = event.target as HTMLElement | null;
  while (el && el.tagName !== "LI") {
    el = el.parentElement;

    if (el?.tagName === "UL") {
      el = null; // Terminate early
    }
  }
  if (!el) return;

  const code = idToCode(el.id);
  if (!code) return;
  focusItem(el.id);
  toggleSelected(code);
  updateScroll(el.id);
}

function findNextOption(currentOption: Element) {
  if (!listboxNode.value) return null;
  const allOptions = Array.from(
    listboxNode.value.querySelectorAll('[role="option"]')
  ); // get options array
  const currentOptionIndex = allOptions.indexOf(currentOption);
  let nextOption = null;

  if (currentOptionIndex > -1 && currentOptionIndex < allOptions.length - 1) {
    nextOption = allOptions[currentOptionIndex + 1];
  }

  return nextOption;
}

/* Return the previous listbox option, if it exists; otherwise, returns null */
function findPreviousOption(currentOption: Element) {
  if (!listboxNode.value) return null;
  const allOptions = Array.from(
    listboxNode.value.querySelectorAll('[role="option"]')
  ); // get options array
  const currentOptionIndex = allOptions.indexOf(currentOption);
  let previousOption = null;

  if (currentOptionIndex > -1 && currentOptionIndex > 0) {
    previousOption = allOptions[currentOptionIndex - 1];
  }

  return previousOption;
}

function onKeypress(event: KeyboardEvent) {
  if (!listboxNode.value) return;
  const lastActiveId = activeDescendant.value;
  const allOptions = listboxNode.value.querySelectorAll('[role="option"]');
  const currentItem = activeDescendant.value
    ? document.getElementById(activeDescendant.value)
    : allOptions[0];

  let nextItem: Element | null = currentItem;

  if (!currentItem) return;

  switch (event.key) {
    case "ArrowUp":
    case "ArrowDown":
      event.preventDefault();
      // If there's no active item, focus the first one
      if (!activeDescendant.value) {
        focusItem(currentItem.id);
        return;
      }

      if (event.key === "ArrowUp") {
        nextItem = findPreviousOption(currentItem);
      } else {
        nextItem = findNextOption(currentItem);
      }

      if (nextItem) {
        focusItem(nextItem.id);
      }
      break;

    case "Home":
      event.preventDefault();
      focusFirstItem();
      break;

    case "End":
      event.preventDefault();
      focusLastItem();
      break;

    case "Enter":
    case " ":
      event.preventDefault();
      if (!activeDescendant.value) break;
      toggleSelected(idToCode(activeDescendant.value));
      break;

    case "Backspace":
    case "Delete":
      event.preventDefault();
      if (!activeDescendant.value) break;
      selected.value.delete(idToCode(activeDescendant.value));
      notifyChange();
      break;
  }

  if (activeDescendant.value !== lastActiveId && activeDescendant.value) {
    updateScroll(activeDescendant.value);
  }
}

const listboxNode = ref<HTMLUListElement | null>();
const activeDescendant = ref<string | null>(null);
// const keysSoFar = ref("");
const focusedItem = ref("");

function focusItem(id: string) {
  if (!listboxNode.value) return;

  focusedItem.value = id;
  listboxNode.value.setAttribute("aria-activedescendant", id);
  activeDescendant.value = id;
}

// Re-activate the last focused item, if any.
function setupFocus() {
  if (!listboxNode.value || !activeDescendant.value) return;
  updateScroll(activeDescendant.value);
  focusItem(activeDescendant.value);
}

// On blur, to release the focused state from the UI
function releaseFocus() {
  focusedItem.value = "";
}

function focusFirstItem() {
  if (!listboxNode.value) return;
  const firstItem = listboxNode.value.querySelector('[role="option"]');

  if (firstItem) {
    focusItem(firstItem.id);
  }
}

function focusLastItem() {
  if (!listboxNode.value) return;
  const itemList = listboxNode.value.querySelectorAll('[role="option"]');

  if (itemList.length) {
    focusItem(itemList[itemList.length - 1].id);
  }
}
</script>

<template>
  <div class="foods-listbox stack-s">
    <label>
      <strong>Filter:</strong>
      <input
        type="search"
        v-model="searchString"
        placeholder="Filter codes and names..."
      />
    </label>
    <label id="listbox-label"><strong>Select up to 6 foods:</strong></label>
    <ul
      ref="listboxNode"
      tabindex="0"
      role="listbox"
      aria-multiselectable="true"
      aria-activedescendant=""
      aria-labelledby="listbox-label"
      @keydown="onKeypress"
      @focus="setupFocus"
      @blur="releaseFocus"
    >
      <li
        v-for="code in filteredFoodCodes"
        :key="code"
        role="option"
        :aria-selected="isSelected(code)"
        :id="codeToId(code)"
        :class="{
          'is-selected': isSelected(code),
          'is-focused': focusedItem === codeToId(code),
        }"
        v-text="getName(code)"
        @click="onListItemClick"
      />
    </ul>
    <div class="error-region" aria-live="polite">
      <p v-if="selected.size === MAX_ITEMS">
        Maximum number of food-items selected.
      </p>
    </div>
    <label><strong>Selected items:</strong></label>
    <div class="foods-listbox__selected">
      <button
        v-for="code in selectedSorted"
        v-text="getName(code)"
        :title="`Remove ${getName(code)} from preview.`"
        @click="() => toggleSelected(code)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "../styles/constants";

.foods-listbox__selected {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.875em;

  &:empty::before {
    content: "Select foods in the list below...";
    font-style: italic;
    display: inline-block;
    padding: 0.15em;
  }

  button {
    display: flex;
    border: 1px solid rgba(black, 0.15);
    border-radius: 0.25em;
    padding: 0.15em 0.5em;
    align-items: center;

    text-align: left;

    background: $gray;
    font-weight: bold;

    &::after {
      content: "×";
      display: inline-block;
      margin-left: 0.25em;
      font-size: 1.5em;
      font-weight: normal;
      line-height: 1;
    }

    &:hover {
      opacity: 0.5;
    }

    &:focus {
      outline: 2px solid black;
    }
  }
}

label {
  display: block;
  font-size: 0.875em;
}

input[type="search"] {
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

ul {
  position: relative;
  height: 12em;
  overflow-y: scroll;
  resize: vertical;

  border: 2px solid $gray;

  // Reset ul-styles
  padding: 0;
  margin-bottom: 0;
  list-style-type: none;

  &:focus {
    outline: 2px solid black;
    outline-offset: 2px;
  }
}

li {
  margin: 0;
  padding: 0.25em 0.5em;

  font-size: 0.875em;

  &.is-focused {
    background: $gray;
  }

  &:hover {
    background: $blue_dove;
    cursor: pointer;
  }

  &.is-selected {
    font-weight: bold;

    &::before {
      content: "\2713";
      display: inline-block;
      padding: 0 0.425em 0 0;
    }

    &:hover {
      background: $red_apricot;
      color: black;
    }
  }
}

.error-region {
  font-size: 0.875em;
  font-style: italic;
  text-align: right;
  color: $green_forest;
  padding: 0.15em;

  margin-top: 0;

  p { margin: 0; }

  &:empty {
    display: none;
  }
}
</style>
