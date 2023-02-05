<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";

import FoodsCardSua from "./FoodsCardSua.vue";
import * as ModeHelpers from "./mode-helpers";

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
      return ModeHelpers.aggregate(this.relevantValues, this.mode);
    },
    unit() {
      return ModeHelpers.unit(this.mode, true);
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
        <span class="foods-card__unit" v-text="unit"/>
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
