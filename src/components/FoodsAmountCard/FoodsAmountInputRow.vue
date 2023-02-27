<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { inputValueToNumber, generateRandomId } from "@/lib/utils";

export default defineComponent({
  props: {
    sua: {
      type: Object as PropType<SUA>,
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
      this.$emit("update:sua", {
        id: this.sua.id,
        value,
        error,
      });
    },
    reset() {
      this.rawValue = String(this.baseValue);
      this.hasError = false;
      this.emitUpdate(this.baseValue, false);
    },
    onInput(event: Event) {
      const target = event.target as HTMLInputElement;
      const value = inputValueToNumber(target.value);

      const hasError = value < 0 || target.validity.patternMismatch
      this.hasError = hasError;

      if (!Number.isNaN(value)) {
        this.emitUpdate(value, hasError);
      } else {
        this.emitUpdate(this.currentValue, hasError);
      }
    },
  },
});
</script>

<template>
  <div
    class="foods-accordion__input-row cluster cluster--between"
    :class="{
      'foods-accordion__sua--changed': hasChanged,
      'foods-accordion__sua--error': hasError,
    }"
  >
    <label class="foods-accordion__sua-name" :for="uniqueId">{{ sua.name }}</label>

    <span class="cluster" style="flex-shrink: 0">
      <button
        class="u-faded button--subtle"
        v-text="baseValue"
        v-if="hasChanged"
        @click="reset"
        title="Reset to base value"
      />
      <input
        type="text"
        :id="uniqueId"
        placeholder="0.00"
        required="false"
        pattern="^([0-9.,]*)$"
        :class="{ 'has-error': hasError }"
        v-model="rawValue"
        @change="onInput"
      />
    </span>
  </div>
</template>
