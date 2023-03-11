<script lang="ts">
import { inputValueToNumber } from "@/lib/utils";
import { defineComponent } from "vue";

export default defineComponent({
  emits: ["change:values", "change:mode"],

  data() {
    return {
      productionWaste: "",
      retailWaste: "",
      consumerWaste: "",
      technicalImprovement: "",

      relativeMode: false,
    };
  },

  methods: {
    onFieldUpdate(factor: keyof Factors) {
      const numericValue = inputValueToNumber(this[factor]);
      const isInvalid =
        Number.isNaN(numericValue) || numericValue < 0 || numericValue > 100;
      const value = isInvalid ? null : numericValue;

      this.$emit("change:values", { factor, value });
    },
    onModeChange() {
      this.$emit("change:mode", this.relativeMode ? "relative" : "absolute");
    },
  },
});
</script>

<template>
  <div class="overrides stack" :class="{ 'is-absolute': !relativeMode }">
    <div class="cluster cluster--between">
      <h3>Overrides</h3>
      <label class="toggle cluster cluster--s-gap">
        <input type="checkbox" class="u-visually-hidden" v-model="relativeMode"
        @change="onModeChange">
        <span class="toggle__label--off">Absolute values</span>
        <span class="toggle__knob" />
        <span class="toggle__label--on">Relative change</span>
      </label>
    </div>
    <p v-if="relativeMode">Change a factor by a given amount for all foods,
    regardless of what's typed into the detail inputs below. Empty fields have
    no effect.</p>
    <p v-if="!relativeMode">Set a factor to the same value for all foods, regardless of what's typed
    into the detail inputs below. Empty fields have no effect.</p>
    <div class="overrides__container cluster">
      <label>
        <span class="overrides__label">Production Waste</span>
        <span class="overrides__input-wrap">
          <input
            type="text"
            v-model="productionWaste"
            placeholder="None"
            @change="onFieldUpdate('productionWaste')"
          />
        </span>
      </label>
      <label>
        <span class="overrides__label">Retail Waste</span>
        <span class="overrides__input-wrap">
          <input
            type="text"
            placeholder="None"
            v-model="retailWaste"
            @change="onFieldUpdate('retailWaste')"
          />
        </span>
      </label>
      <label>
        <span class="overrides__label">Consumer Waste</span>
        <span class="overrides__input-wrap">
          <input
            type="text"
            placeholder="None"
            v-model="consumerWaste"
            @change="onFieldUpdate('consumerWaste')"
          />
        </span>
      </label>
      <label>
        <span class="overrides__label">Technical Improvement</span>
        <span class="overrides__input-wrap">
          <input
            type="text"
            placeholder="None"
            v-model="technicalImprovement"
            @change="onFieldUpdate('technicalImprovement')"
          />
        </span>
      </label>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "../styles/constants";

.overrides {
  padding: 1.5em 1em;
  background: $lightgray;
  box-shadow: inset 0 0 0 2px $gray;

  label {
    text-align: center;
  }

  input {
    text-align: right;
    width: 5em;
    margin: 0 0.5em;
  }
}

.overrides__container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: end;
}

.overrides__input-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;

  &::before {
    content: "×";
    opacity: 0.5;
    font-size: 0.875em;
    width: 2ch;

    .is-absolute & {
      content: "=";
      font-weight: bold;
    }
  }

  &::after {
    content: "%";
  }
}

.overrides__label {
  font-weight: bold;
}
</style>
