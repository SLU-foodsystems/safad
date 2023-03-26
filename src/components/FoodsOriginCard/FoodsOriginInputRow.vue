<script lang="ts">
import { defineComponent } from "vue";
import { inputValueToNumber, generateRandomId } from "@/lib/utils";

export default defineComponent({
  props: {
    id: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    max: {
      type: Number,
      required: true,
    },
    disabled: {
      type: Boolean,
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

  emits: ["update:origin"],
  expose: ["reset"],

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
    countryName() {
      switch (this.country) {
        case "de":
          return "🇩🇪 Germany";
        case "dk":
          return "🇩🇰 Denmark";
        case "es":
          return "🇪🇸 Spain";
        case "fr":
          return "🇫🇷 France";
        case "gb":
          return "🇬🇧 Great Britain";
        case "in":
          return "🇮🇳 India";
        case "ir":
          return "🇮🇪 Ireland";
        case "se":
          return "🇸🇪 Sweden";
        case "us":
          return "🇺🇸 USA";
        default:
          return `Unknown (${this.country})`;
      }
    },
  },

  methods: {
    emitUpdate(value: number, error: boolean) {
      this.$emit("update:origin", {
        id: this.id,
        country: this.country,
        value,
        error,
      });
    },
    reset() {
      if (!this.hasChanged) return;
      this.rawValue = String(this.baseValue);
      this.hasError = false;
      this.emitUpdate(this.baseValue, false);
    },
    onChange(event: Event) {
      const target = event.target as HTMLInputElement;
      const value = inputValueToNumber(target.value);

      const clampedValue = Math.min(100, Math.max(0, value));
      const hasError =
        Number.isNaN(value) ||
        value !== clampedValue ||
        target.validity.patternMismatch;
      this.hasError = hasError;

      if (hasError) {
        this.emitUpdate(clampedValue, hasError);
      } else {
        this.emitUpdate(this.currentValue, hasError);
      }
    },
    onRangeInput(event: Event) {
      const stringValue = this.rawValue;
      const numericValue = inputValueToNumber(stringValue);
      if (numericValue > this.max) {
        this.rawValue = this.max.toFixed(2);
        event.preventDefault();
      }
    },
  },
});
</script>

<template>
  <div
    class="foods-accordion__row cluster foods__range-container"
    :class="{
      'has-changed': hasChanged,
      'has-error': hasError,
    }"
  >
    <label :for="uniqueId" v-text="countryName" />
    <input
      type="range"
      :id="uniqueId"
      min="0"
      step="0.01"
      max="100"
      v-model="rawValue"
      @input="onRangeInput"
      @change="onChange"
      :disabled="disabled"
    />
    <div class="cluster cluster--s-gap">
      <input
        type="text"
        placeholder="0.00"
        required="false"
        pattern="^([0-9.,]*)$"
        :id="uniqueId"
        v-model="rawValue"
        @change="onChange"
        :class="{ 'has-error': hasError }"
        :disabled="disabled"
      />
      %
    </div>
  </div>
</template>

<style lang="scss">
.foods__range-container {
  display: flex;

  label {
    $w: 6em;
    width: $w;
    flex: 0 0 $w;
  }

  input[type="range"] {
    flex-grow: 1;
    flex-basis: 8em;
  }

  input[type="text"] {
    flex-grow: 0;
  }
}
</style>
