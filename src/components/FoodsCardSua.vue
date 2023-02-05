<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { inputValueToNumber } from "../lib/utils";

export default defineComponent({
  props: {
    sua: {
      type: Object as PropType<SUA>,
      required: true,
    },
    baseValue: Number,
    currentValue: Number,
  },

  data() {
    return {
      rawValue: String(this.currentValue),
      hasError: false,
    };
  },

  computed: {
    hasChanged() {
      return String(this.baseValue) != this.rawValue;
    },
  },

  methods: {
    onInput(event: Event) {
      const target = event.target as HTMLInputElement;
      const numericValue = inputValueToNumber(target.value);
      const hasError = target.validity.patternMismatch;
      this.hasError = hasError;

      if (!Number.isNaN(numericValue)) {
        this.$emit("update:sua", {
          id: this.sua.id,
          value: numericValue,
          error: hasError,
        });
      } else {
        this.$emit("update:sua", {
          id: this.sua.id,
          value: this.currentValue,
          error: hasError,
        });
      }
    },
  },
});
</script>

<template>
  <div
    class="foods-card__sua cluster cluster--between"
    :class="{
      'foods-card__sua--changed': hasChanged,
      'foods-card__sua--error': hasError,
    }"
  >
    <span class="foods-card__sua-name">{{ sua.name }}</span>

    <span class="cluster" style="flex-shrink: 0">
      <span class="u-faded" v-text="baseValue" v-if="hasChanged" />
      <input
        type="text"
        placeholder="0.0"
        required="false"
        pattern="^([0-9.,]*)$"
        v-model="rawValue"
        @input="onInput"
      />
    </span>
  </div>
</template>
