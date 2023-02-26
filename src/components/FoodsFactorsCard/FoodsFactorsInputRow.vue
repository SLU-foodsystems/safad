<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { inputValueToNumber } from "@/lib/utils";

const generateRandomId = () => "input-" + Math.floor(Math.random() * 1e8);

export default defineComponent({
  props: {
    id: {
      type: String,
      required: true,
    },
    factor: {
      type: String as PropType<keyof Factor>,
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
      uniqueId: generateRandomId(),
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

    onInput(event: Event) {
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
  <div class="foods-accordion__input-row" :class="{
    'has-changed': hasChanged,
    'has-error': hasError,
  }">
    <label class="foods-accordion__sua-name u-visually-hidden" :for="uniqueId">{{ label }}</label>

    <span class="cluster" style="flex-shrink: 0">
      <button class="u-faded button--subtle" v-text="baseValue" v-if="hasChanged" @click="reset" title="Reset to base value" />
      <input type="text" :id="uniqueId" placeholder="0.00" required="false" pattern="^([0-9.,]*)$"
        :class="{ 'has-error': hasError }" v-model="rawValue" @change="onInput" />
    </span>
  </div>
</template>
