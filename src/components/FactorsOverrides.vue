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
    <div class="overrides__inputs cluster">
      <label class="">
        <span class="overrides__label">Production Waste</span>
        <span class="overrides__input-wrap">
          <input
            type="text"
            v-model="productionWaste"
            @change="onFieldUpdate('productionWaste')"
          />
        </span>
      </label>
      <label class="">
        <span class="overrides__label">Retail Waste</span>
        <span class="overrides__input-wrap">
          <input
            type="text"
            v-model="retailWaste"
            @change="onFieldUpdate('retailWaste')"
          />
        </span>
      </label>
      <label class="">
        <span class="overrides__label">Consumer Waste</span>
        <span class="overrides__input-wrap">
          <input
            type="text"
            v-model="consumerWaste"
            @change="onFieldUpdate('consumerWaste')"
          />
        </span>
      </label>
      <label class="">
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
