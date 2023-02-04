<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { inputValueToNumber } from "../lib/utils";

export default defineComponent({
  props: {
    sua: {
      type: Object as PropType<SUA>,
      required: true,
    },
    originalValue: Number,
    currentValue: Number,
  },

  data() {
    return {
      rawValue: String(this.currentValue),
    };
  },

  computed: {
    hasChanged() {
      return String(this.originalValue) != this.rawValue;
    },
  },

  methods: {
    onInput(event: Event) {
      const { value } = event.target as HTMLInputElement;
      const numericValue = inputValueToNumber(value);
      if (!Number.isNaN(numericValue)) {
        this.$emit("update:sua", { id: this.sua.id, value: numericValue });
      }
    },
  },
});
</script>

<template>
  <div class="foods-card__sua cluster cluster--between">
    <span>{{ sua.name }} <span v-if="hasChanged">FOO</span></span>
    <input type="text" placeholder="0.0" required="false" pattern="^([0-9.,]*)$" v-model="rawValue" @input="onInput" />
  </div>
</template>
