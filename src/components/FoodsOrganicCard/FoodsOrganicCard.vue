<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";

import FoodsOrganicInputs from "./FoodsOrganicInputs.vue";
import FoodsAccordion from "../FoodsAccordion.vue";

export default defineComponent({
  components: { FoodsAccordion, FoodsOrganicInputs },
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
    hasErrors(): boolean {
      return this.suaIds.some((id: string) => this.hasError[id]);
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
    <template #details>
      <FoodsOrganicInputs
        v-for="fbs in eat.fbs"
        :key="fbs.id"
        :fbs="fbs"
        :current-values="currentValues"
        :base-values="baseValues"
        @update:organic="$emit('update:organic', $event)"
      />
    </template>
  </FoodsAccordion>
</template>
