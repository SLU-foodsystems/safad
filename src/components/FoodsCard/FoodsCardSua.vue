<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { inputValueToNumber } from "@/lib/utils";
import * as ModeHelpers from "./mode-helpers";

const generateRandomId = () => "input-" + Math.floor(Math.random() * 1e8);

export default defineComponent({
  props: {
    sua: {
      type: Object as PropType<SUA>,
      required: true,
    },
    mode: {
      type: String,
      required: true,
    },
    baseValue: Number,
    currentValue: Number,
  },

  data() {
    return {
      rawValue: String(this.currentValue),
      hasError: false,
      id: generateRandomId(),
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

      const [min, max] = ModeHelpers.limits(this.mode);

      const cappedValue = Math.min(max, Math.max(min, numericValue));
      const hasError =
        target.validity.patternMismatch || cappedValue !== numericValue;
      this.hasError = hasError;

      if (!Number.isNaN(numericValue)) {
        this.$emit("update:sua", {
          id: this.sua.id,
          value: cappedValue,
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
    <label class="foods-card__sua-name" :for="id">{{ sua.name }}</label>

    <span class="cluster" style="flex-shrink: 0">
      <span class="u-faded" v-text="baseValue" v-if="hasChanged" />
      <input
        type="text"
        :id="id"
        placeholder="0.00"
        required="false"
        pattern="^([0-9.,]*)$"
        :class="{ 'has-error': hasError }"
        v-model="rawValue"
        @input="onInput"
      />
    </span>
  </div>
</template>
