<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { inputValueToNumber, generateRandomId } from "@/lib/utils";

export default defineComponent({
  props: {
    id: {
      type: String,
      required: true,
    },
    factor: {
      type: String as PropType<keyof Factors>,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    baseValue: {
      type: Number,
      required: true,
    },
    currentValue: {
      type: Number,
      required: true,
    },
  },

  emits: ["update:factor"],

  data() {
    return {
      rawValue: String(this.currentValue),
      hasError: false,
      uniqueId: generateRandomId("input-"),
    };
  },

  computed: {
    hasChanged() {
      return String(this.baseValue) != this.rawValue;
    },
  },

  methods: {
    emitUpdate(value: number, error: boolean) {
      this.$emit("update:factor", {
        id: this.id,
        factor: this.factor,
        value,
        error,
      });
    },
    reset() {
      this.rawValue = String(this.baseValue);
      this.hasError = false;
      this.emitUpdate(this.baseValue, false);
    },
    onChange(event: Event) {
      const target = event.target as HTMLInputElement;
      const value = inputValueToNumber(target.value);

      const clampedValue = Math.min(100, Math.max(0, value));
      const hasError =
        value !== clampedValue || target.validity.patternMismatch;
      this.hasError = hasError;

      if (!Number.isNaN(value)) {
        this.emitUpdate(clampedValue, hasError);
      } else {
        this.emitUpdate(this.currentValue, hasError);
      }
    },
  },
});
</script>

<template>
  <div class="foods-accordion__row cluster cluster--between"
  :data-factor="factor"
  :class="{
    'has-changed': hasChanged,
    'has-error': hasError,
  }">
    <label :for="uniqueId" v-text="label" />

    <span class="cluster" style="flex-shrink: 0">
      <button
        v-if="hasChanged"
        class="u-faded button--subtle"
        title="Reset to base value"
        @click="reset"
        v-text="baseValue.toFixed(2)"
      />
      <span class="cluster cluster--s-gap">
      <input
        type="text"
        placeholder="0.00"
        required="false"
        pattern="^([0-9.,]*)$"
        :id="uniqueId"
        :class="{ 'has-error': hasError }"
        v-model="rawValue"
        @change="onChange"
      />
      %
      </span>
    </span>
  </div>
</template>
