<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";

import FoodsOriginInputs from "./FoodsOriginInputs.vue";
import FoodsAccordion from "../FoodsAccordion.vue";

export default defineComponent({
  components: { FoodsAccordion, FoodsOriginInputs },

  emits: ['update:origin'],

  props: {
    eat: {
      type: Object as PropType<EAT>,
      required: true,
    },
    open: { type: Boolean, required: true },
    currentValues: {
      type: Object as PropType<{ [k: string]: OriginMap }>,
      required: true,
    },
    baseValues: {
      type: Object as PropType<{ [k: string]: OriginMap }>,
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
        Object.keys(this.baseValues[id]).some(
          (key) =>
            this.currentValues[id][key] !== this.baseValues[id][key]
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
      <FoodsOriginInputs
        v-for="fbs in eat.fbs"
        :key="fbs.id"
        :fbs="fbs"
        :current-values="currentValues[fbs.id]"
        :base-values="baseValues[fbs.id]"
        @update:origin="$emit('update:origin', $event)"
      />
    </template>
  </FoodsAccordion>
</template>
