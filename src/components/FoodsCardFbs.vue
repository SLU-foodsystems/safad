<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { sum, toPrecision } from "../lib/utils";

import FoodsCardSua from "./FoodsCardSua.vue";

export default defineComponent({
  components: { FoodsCardSua },
  props: {
    fbs: {
      type: Object as PropType<FBS>,
      required: true,
    },
    currentValues: {
      type: Object as PropType<{ [k: string]: number }>,
      required: true,
    },
    originalValues: {
      type: Object as PropType<{ [k: string]: number }>,
      required: true,
    },
  },

  computed: {
    ids() {
      return this.fbs.sua.map((sua: SUA) => sua.id);
    },
    relevantValues(): number[] {
      return this.ids
        .map((id: string) => this.currentValues[id])
        .filter((x: number) => !Number.isNaN(x));
    },
    aggregate(): number {
      return toPrecision(sum(this.relevantValues));
    },
  },
});
</script>

<template>
  <div class="foods-card__fbs">
    <div class="cluster cluster--between">
      <h4>{{ fbs.name }}</h4>
      <span class="u-faded">
        <span>{{ aggregate }}</span
        >&nbsp;
        <span class="foods-card__unit">g / day</span>
      </span>
    </div>
    <FoodsCardSua
      v-for="sua in fbs.sua"
      :sua="sua"
      :original-value="originalValues[sua.id]"
      :current-value="currentValues[sua.id]"
      @update:sua="$emit('update:sua', $event)"
    />
  </div>
</template>
