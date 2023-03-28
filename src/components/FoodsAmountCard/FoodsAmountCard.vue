<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { sum } from "@/lib/utils";

import FoodsAmountInputs from "./FoodsAmountInputs.vue";
import FoodsAccordion from "../FoodsAccordion.vue";

export default defineComponent({
  components: { FoodsAccordion, FoodsAmountInputs },
  props: {
    eat: {
      type: Object as PropType<EAT>,
      required: true,
    },
    open: { type: Boolean, required: true },
    currentValues: {
      type: Object as PropType<{ [k: string]: number }>,
      required: true,
    },
    baseValues: {
      type: Object as PropType<{ [k: string]: number }>,
      required: true,
    },
    hasError: {
      type: Object as PropType<{ [k: string]: boolean }>,
      required: true,
    },
  },

  computed: {
    suaIds() {
      return this.eat.fbs.flatMap((fbs) => fbs.sua.map((sua) => sua.id));
    },
    relevantValues(): number[] {
      return this.suaIds
        .flatMap((id) => this.currentValues[id])
        .filter((x) => !Number.isNaN(x));
    },
    hasErrors(): boolean {
      return this.suaIds.some((id) => this.hasError[id]);
    },
    aggregate(): string {
      return (sum(this.relevantValues)).toFixed(2);
    },
    hasChanges(): boolean {
      return this.suaIds.some(
        (id) => this.currentValues[id] !== this.baseValues[id]
      );
    },
  },

  methods: {
    toggleOpen() {
      this.$emit("toggle-open", this.eat.id);
    },
  },
});
</script>

<template>
  <FoodsAccordion :open="open" @toggle-open="toggleOpen">
    <template #summary>
      {{ eat.name }}
      <span v-if="hasChanges" class="tag tag--blue">Modified</span>
      <span v-if="hasErrors" class="tag tag--yellow">Errors</span>
    </template>
    <template #aggregate
      ><span>{{ aggregate }} g / day</span></template
    >
    <template #details>
      <FoodsAmountInputs
        v-for="fbs in eat.fbs"
        :key="fbs.id"
        :fbs="fbs"
        :current-values="currentValues"
        :base-values="baseValues"
        @update:sua="$emit('update:sua', $event)"
      />
    </template>
  </FoodsAccordion>
</template>
