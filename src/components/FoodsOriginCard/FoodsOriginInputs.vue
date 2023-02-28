<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";

import FoodsOriginInputRow from "./FoodsOriginInputRow.vue";

export default defineComponent({
  components: { FoodsOriginInputRow },
  props: {
    fbs: {
      type: Object as PropType<FBS>,
      required: true,
    },
    currentValues: {
      type: Object as PropType<OriginMap>,
      required: true,
    },
    baseValues: {
      type: Object as PropType<OriginMap>,
      required: true,
    },
  },

  computed: {
    countries() {
      return Object.keys(this.baseValues).sort();
    },
    maxValues() {
      const entries = Object.entries(this.currentValues);
      const sum = entries.map((kv) => kv[1]).reduce((a, b) => a + b, 0);

      return Object.fromEntries(entries.map(([k, v]) => [k, v + 100 - sum]));
    },
    hasChanges() {
      return this.countries.some(
        (country) => this.baseValues[country] !== this.currentValues[country]
      );
    },
  },

  methods: {
    reset() {
      (this.$refs.inputRows as any[])!.forEach((ref) => ref.reset());
    },
  },
});
</script>

<template>
  <section>
    <header class="foods-accordion__sub-header cluster cluster--between">
      <h4>{{ fbs.name }}</h4>
      <button class="button--subtle" v-show="hasChanges" @click="reset">
        Reset
      </button>
    </header>
    <div class="foods-factors__container">
      <FoodsOriginInputRow v-for="country in countries" :id="fbs.id" :country="country" :max="maxValues[country]"
        :disabled="countries.length === 1"
        ref="inputRows" :base-value="baseValues[country]" :current-value="currentValues[country]"
        @update:origin="$emit('update:origin', $event)" />
    </div>
  </section>
</template>
