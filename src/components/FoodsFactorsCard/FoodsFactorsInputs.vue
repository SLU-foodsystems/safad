<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { factors, labels } from "./constants"

import FoodsFactorsInputRow from "./FoodsFactorsInputRow.vue";

export default defineComponent({
  components: { FoodsFactorsInputRow },
  props: {
    fbs: {
      type: Object as PropType<FBS>,
      required: true,
    },
    currentValues: {
      type: Object as PropType<Factors>,
      required: true,
    },
    baseValues: {
      type: Object as PropType<Factors>,
      required: true,
    },
  },

  data() {
    return {
      labels,
      factors,
    };
  },
});
</script>

<template>
  <section>
    <header class="foods-accordion__sub-header cluster cluster--between">
      <h4>{{ fbs.name }}</h4>
    </header>
    <div class="foods-factors__container factors-grid">
      <FoodsFactorsInputRow
        v-for="factor in factors"
        :id="fbs.id" :factor="factor" :label="labels[factor]"
        :base-value="baseValues[factor]" :current-value="currentValues[factor]"
        @update:factor="$emit('update:factor', $event)" />
    </div>
  </section>
</template>
