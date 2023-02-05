<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import FoodsCardFbs from "./FoodsCardFbs.vue";
import { sum, toPrecision } from "../lib/utils";

export default defineComponent({
  components: { FoodsCardFbs },
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
    aggregate(): number {
      return toPrecision(sum(this.relevantValues));
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
  <div class="foods-card" role="region" :data-open="open">
    <h3 class="foods-card__header">
      <button
        class="cluster cluster--between"
        :aria-expanded="open"
        @click="toggleOpen"
      >
        <span class="cluster"
          >{{ eat.name }}
          <span v-if="hasChanges" class="tag tag--blue">Modified</span>
          <span v-if="hasErrors" class="tag tag--yellow">Errors</span>
        </span>
        <span class="cluster">
          <span
            ><span>{{ aggregate }}</span
            >&nbsp;g</span
          >
          <svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">
            <rect class="vert" height="8" width="2" y="1" x="4" />
            <rect height="2" width="8" y="4" x="1" />
          </svg>
        </span>
      </button>
    </h3>
    <div class="foods-card__body" v-show="open">
      <FoodsCardFbs
        v-for="fbs in eat.fbs"
        :key="fbs.id"
        :fbs="fbs"
        :current-values="currentValues"
        :base-values="baseValues"
        @update:sua="$emit('update:sua', $event)"
      />
    </div>
  </div>
</template>
