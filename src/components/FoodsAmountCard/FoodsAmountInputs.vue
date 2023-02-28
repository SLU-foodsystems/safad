<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";

import FoodsAmountInputRow from "./FoodsAmountInputRow.vue";
import { sum, toPrecision } from "@/lib/utils";

export default defineComponent({
  components: { FoodsAmountInputRow },
  props: {
    fbs: {
      type: Object as PropType<FBS>,
      required: true,
    },
    currentValues: {
      type: Object as PropType<{ [k: string]: number }>,
      required: true,
    },
    baseValues: {
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
  <section>
    <header class="foods-accordion__sub-header cluster cluster--between">
      <h4>{{ fbs.name }}</h4>
      <span class="u-faded">
        <span>{{ aggregate }}</span>&nbsp;&nbsp;g
      </span>
    </header>
    <FoodsAmountInputRow
      v-for="sua in fbs.sua"
      :sua="sua"
      :base-value="baseValues[sua.id]"
      :current-value="currentValues[sua.id]"
      @update:sua="$emit('update:sua', $event)"
    />
  </section>
</template>
