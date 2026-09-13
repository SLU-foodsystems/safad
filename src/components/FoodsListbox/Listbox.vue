<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from "vue";

type Option = Record<string, unknown>;

const props = withDefaults(
  defineProps<{
    options: Option[];
    optionValue?: string;
    optionLabel?: string;
    multiple?: boolean;
    checkmark?: boolean;
    filter?: boolean;
    filterPlaceholder?: string;
    emptyFilterMessage?: string;
    emptyMessage?: string;
    ariaLabel?: string;
    ariaLabelledby?: string;
    listStyle?: string;
    virtualScrollerOptions?: {
      itemSize: number;
    };
  }>(),
  {
    optionValue: "value",
    optionLabel: "label",
    multiple: false,
    checkmark: false,
    filter: false,
    filterPlaceholder: "Filter...",
    emptyFilterMessage: "No results found.",
    emptyMessage: "No results found.",
    ariaLabel: undefined,
    ariaLabelledby: undefined,
    listStyle: undefined,
    virtualScrollerOptions: () => ({ itemSize: 32 }),
  }
);

const modelValue = defineModel<string[]>({ default: () => [] });
const listboxId = useId();

const filterText = ref("");
const focusedIndex = ref(0);
const scrollTop = ref(0);
const viewportHeight = ref(250);
const listbox = ref<HTMLElement>();
const rowHeights = ref<Record<string, number>>({});
const rowElements = new Map<string, HTMLElement>();
const elementKeys = new WeakMap<HTMLElement, string>();
const resizeObserver =
  typeof ResizeObserver === "undefined"
    ? undefined
    : new ResizeObserver((entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          const key = elementKeys.get(element);
          if (key && rowHeights.value[key] !== element.offsetHeight) {
            const index = filteredOptions.value.findIndex(
              (option) => valueOf(option) === key
            );
            const oldHeight =
              rowHeights.value[key] || props.virtualScrollerOptions.itemSize;
            const rowTop = index < 0 ? 0 : offsets.value[index];
            const heightDelta = element.offsetHeight - oldHeight;
            if (rowTop < scrollTop.value && listbox.value) {
              listbox.value.scrollTop += heightDelta;
              scrollTop.value += heightDelta;
            }
            rowHeights.value[key] = element.offsetHeight;
          }
        }
      });
const containerResizeObserver =
  typeof ResizeObserver === "undefined"
    ? undefined
    : new ResizeObserver(([entry]) => {
        viewportHeight.value = entry.contentRect.height;
      });

const filteredOptions = computed(() => {
  const query = filterText.value.trim().toLocaleLowerCase();
  if (!query) return props.options;
  return props.options.filter((option) =>
    String(option[props.optionLabel]).toLocaleLowerCase().includes(query)
  );
});

const offsets = computed(() => {
  const values = [0];
  for (const option of filteredOptions.value) {
    const key = valueOf(option);
    values.push(
      values[values.length - 1] +
        (rowHeights.value[key] || props.virtualScrollerOptions.itemSize)
    );
  }
  return values;
});

const visibleRange = computed(() => {
  const values = offsets.value;
  const buffer = 5;
  const indexAt = (offset: number) => {
    let low = 0;
    let high = filteredOptions.value.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (values[middle + 1] <= offset) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  const start = Math.max(0, indexAt(scrollTop.value) - buffer);
  const end = Math.min(
    filteredOptions.value.length,
    indexAt(scrollTop.value + viewportHeight.value) + buffer
  );
  return {
    start,
    end,
    top: values[start],
    bottom: values[values.length - 1] - values[end],
  };
});

const visibleOptions = computed(() =>
  filteredOptions.value.slice(visibleRange.value.start, visibleRange.value.end)
);

watch([filterText, () => props.options], () => {
  scrollTop.value = 0;
  focusedIndex.value = 0;
  if (listbox.value) listbox.value.scrollTop = 0;
});

function setRowRef(key: string, element: unknown) {
  const previous = rowElements.get(key);
  if (previous) resizeObserver?.unobserve(previous);
  if (!(element instanceof HTMLElement)) {
    rowElements.delete(key);
    return;
  }
  rowElements.set(key, element);
  elementKeys.set(element, key);
  resizeObserver?.observe(element);
  rowHeights.value[key] = element.offsetHeight;
}

function onScroll() {
  scrollTop.value = listbox.value?.scrollTop ?? 0;
}

function scrollFocusedIntoView() {
  const element = listbox.value;
  const index = focusedIndex.value;
  if (!element || index < 0 || index >= filteredOptions.value.length) return;
  const top = offsets.value[index];
  const bottom = offsets.value[index + 1];
  if (top < element.scrollTop) element.scrollTop = top;
  else if (bottom > element.scrollTop + element.clientHeight) {
    element.scrollTop = bottom - element.clientHeight;
  }
}

onMounted(() => {
  if (listbox.value) {
    viewportHeight.value = listbox.value.clientHeight;
    containerResizeObserver?.observe(listbox.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  containerResizeObserver?.disconnect();
});

function valueOf(option: Option) {
  return String(option[props.optionValue]);
}

function labelOf(option: Option) {
  return String(option[props.optionLabel]);
}

function isSelected(option: Option) {
  return modelValue.value.includes(valueOf(option));
}

function select(option: Option) {
  const value = valueOf(option);
  const next = props.multiple
    ? isSelected(option)
      ? modelValue.value.filter((selected) => selected !== value)
      : [...modelValue.value, value]
    : [value];
  modelValue.value = next;
}

function onKeydown(event: KeyboardEvent) {
  if (!filteredOptions.value.length) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    focusedIndex.value =
      (focusedIndex.value + 1) % filteredOptions.value.length;
    scrollFocusedIntoView();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    focusedIndex.value =
      (focusedIndex.value - 1 + filteredOptions.value.length) %
      filteredOptions.value.length;
    scrollFocusedIntoView();
  } else if (event.key === "Home") {
    event.preventDefault();
    focusedIndex.value = 0;
    scrollFocusedIntoView();
  } else if (event.key === "End") {
    event.preventDefault();
    focusedIndex.value = filteredOptions.value.length - 1;
    scrollFocusedIntoView();
  } else if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    select(filteredOptions.value[focusedIndex.value]);
  }
}
</script>

<template>
  <div class="listbox">
    <div v-if="filter" class="listbox__filter">
      <input
        v-model="filterText"
        type="text"
        :placeholder="filterPlaceholder"
        aria-label="Search"
      />
      <span>
        <img
          src="@/assets/filter.svg"
          width="14"
          height="14"
          loading="lazy"
          alt=""
        />
        Search:
      </span>
    </div>
    <ul
      ref="listbox"
      class="listbox__options"
      role="listbox"
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      :aria-multiselectable="multiple"
      :aria-activedescendant="
        filteredOptions.length ? `${listboxId}-option-${focusedIndex}` : undefined
      "
      :style="listStyle"
      tabindex="0"
      @keydown="onKeydown"
      @scroll="onScroll"
    >
      <li
        v-if="filteredOptions.length"
        class="listbox__spacer"
        aria-hidden="true"
        :style="{ height: `${visibleRange.top}px` }"
      />
      <li
        v-for="(option, index) in visibleOptions"
        :key="String(valueOf(option))"
        :ref="(element) => setRowRef(valueOf(option), element)"
        :id="`${listboxId}-option-${index + visibleRange.start}`"
        role="option"
        :aria-selected="isSelected(option)"
        :aria-setsize="filteredOptions.length"
        :aria-posinset="index + visibleRange.start + 1"
        :data-p-focused="index + visibleRange.start === focusedIndex"
        :data-p-selected="isSelected(option)"
        @click="select(option)"
        @mouseenter="focusedIndex = index + visibleRange.start"
      >
        <svg
          v-if="checkmark && isSelected(option)"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path
            d="M1 6.5 4.5 10 11 2"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          />
        </svg>
        {{ labelOf(option) }}
      </li>
      <li
        v-if="filteredOptions.length"
        class="listbox__spacer"
        aria-hidden="true"
        :style="{
          height: `${visibleRange.bottom}px`,
        }"
      />
      <li v-if="!filteredOptions.length" class="listbox__empty">
        {{ filterText ? emptyFilterMessage : emptyMessage }}
      </li>
    </ul>
  </div>
</template>
