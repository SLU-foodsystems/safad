<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";

import FoodsOrganicInputRow from "./FoodsOrganicInputRow.vue";

export default defineComponent({
  components: { FoodsOrganicInputRow },
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
});
</script>

<template>
  <section>
    <header class="foods-accordion__sub-header cluster cluster--between">
      <h4>{{ fbs.name }}</h4>
    </header>
    <FoodsOrganicInputRow
      v-for="sua in fbs.sua"
      :sua="sua"
      :base-value="baseValues[sua.id]"
      :current-value="currentValues[sua.id]"
      @update:organic="$emit('update:organic', $event)"
    />
  </section>
</template>


