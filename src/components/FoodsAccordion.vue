<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    open: { type: Boolean, required: true },
  },
  emits: ["toggle-open"],
});
</script>

<template>
  <div class="foods-accordion" role="region" :data-open="open">
    <h3 class="foods-accordion__header">
      <button
        class="cluster cluster--between"
        :aria-expanded="open"
        @click="$emit('toggle-open')"
      >
        <span class="cluster">
          <slot name="summary" />
        </span>
        <span class="cluster">
          <slot name="aggregate" />
          <svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">
            <rect class="vert" height="8" width="2" y="1" x="4" />
            <rect height="2" width="8" y="4" x="1" />
          </svg>
        </span>
      </button>
    </h3>
    <div class="foods-accordion__body" v-show="open">
      <slot name="details" />
    </div>
  </div>
</template>
