<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";

import FoodsFactorsInputs from "./FoodsFactorsInputs.vue";
import FoodsAccordion from "../FoodsAccordion.vue";

import { FACTORS } from "./constants";

export default defineComponent({
  components: { FoodsAccordion, FoodsFactorsInputs },
  props: {
    eat: {
      type: Object as PropType<EAT>,
      required: true,
    },
    open: { type: Boolean, required: true },
    currentValues: {
      type: Object as PropType<{ [k: string]: Factors }>,
      required: true,
    },
    baseValues: {
      type: Object as PropType<{ [k: string]: Factors }>,
      required: true,
    },
    hasError: {
      type: Object as PropType<{ [k: string]: boolean }>,
      required: true,
    },
  },

  computed: {
    fbsIds(): string[] {
      return this.eat.fbs.map((fbs) => fbs.id);
    },
    hasErrors(): boolean {
      return this.fbsIds.some((id) => this.hasError[id]);
    },
    hasChanges(): boolean {
      return this.fbsIds.some((id) =>
        FACTORS.some(
          (factor) =>
            this.currentValues[id][factor] !== this.baseValues[id][factor]
        )
      );
    },
  },
});
</script>

<template>
  <FoodsAccordion :open="open" @toggle-open="$emit('toggle-open', eat.id)">
    <template #summary>
      {{ eat.name }}
      <span v-if="hasChanges" class="tag tag--blue">Modified</span>
      <span v-if="hasErrors" class="tag tag--yellow">Errors</span>
    </template>
    <template #details>
      <div class="factors-grid">
        <span>Production Waste</span>
        <span>Retail Waste</span>
        <span>Consumer Waste</span>
        <span>Technical improvement</span>
      </div>
      <FoodsFactorsInputs
        v-for="fbs in eat.fbs"
        :key="fbs.id"
        :fbs="fbs"
        :current-values="currentValues[fbs.id]"
        :base-values="baseValues[fbs.id]"
        @update:factor="$emit('update:factor', $event)"
      />
    </template>
  </FoodsAccordion>
</template>
