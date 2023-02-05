<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { average, sum, toPrecision } from "@/lib/utils";

import FoodsCardSua from "./FoodsCardSua.vue";

export default defineComponent({
  components: { FoodsCardSua },
  props: {
    fbs: {
      type: Object as PropType<FBS>,
      required: true,
    },
    mode: {
      type: String,
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
      if (this.mode === "percentage") {
        return toPrecision(average(this.relevantValues));
      }
      return toPrecision(sum(this.relevantValues));
    },
  },
});
</script>

<template>
  <section class="foods-card__fbs">
    <header class="foods-card__fbs-header cluster cluster--between">
      <h4>{{ fbs.name }}</h4>
      <span class="u-faded">
        <span>{{ aggregate }}</span
        >&nbsp;
        <span class="foods-card__unit" v-text="mode === 'amount' ? 'g' : '%' "/>
      </span>
    </header>
    <FoodsCardSua
      v-for="sua in fbs.sua"
      :sua="sua"
      :mode="mode"
      :base-value="baseValues[sua.id]"
      :current-value="currentValues[sua.id]"
      @update:sua="$emit('update:sua', $event)"
    />
  </section>
</template>
