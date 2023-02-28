<script lang="ts">
import { inputValueToNumber } from "@/lib/utils";
import { defineComponent } from "vue";

export default defineComponent({
  emits: ["set-factors-override"],

  data() {
    return {
      productionWaste: "",
      retailWaste: "",
      consumerWaste: "",
      technicalImprovement: "",
    };
  },

  methods: {
    onFieldUpdate(factor: keyof Factors) {
      const numericValue = inputValueToNumber(this[factor]);
      const isInvalid =
        Number.isNaN(numericValue) || numericValue < 0 || numericValue > 100;
      const value = isInvalid ? null : numericValue;

      this.$emit("set-factors-override", { factor, value });
    },
  },
});
</script>

<template>
  <div class="overrides stack">
    <h3>Overrides</h3>
    <p>Set a factor to the same value for all foods, regardless of what's typed
    into the detail inputs below. Empty fields have no effect.</p>
    <div class="overrides__container cluster">
      <label>
        <span class="overrides__label">Production Waste</span>
        <span class="overrides__input-wrap">
          <input
            type="text"
            v-model="productionWaste"
            @change="onFieldUpdate('productionWaste')"
          />
        </span>
      </label>
      <label>
        <span class="overrides__label">Retail Waste</span>
        <span class="overrides__input-wrap">
          <input
            type="text"
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
    margin-left: 1.5em;
    margin-right: 0.5em;
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

  &::after {
    content: "%";
  }
}

.overrides__label {
  font-weight: bold;
}


</style>
