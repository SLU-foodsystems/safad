<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";

export default defineComponent({
  props: {
    current: {
      type: String,
      required: true,
    },
    tabs: {
      type: Array as PropType<{ label: string; id: string }[]>,
      required: true,
    },
  },
});
</script>

<template>
  <ul class="tablist" role="tablist">
    <li v-for="tab in tabs" role="presentation">
      <a role="tab" :id="tab.id" :aria-selected="current === tab.id"
      @click.prevent="$emit('click:tab', tab.id)">{{
        tab.label
      }}</a>
    </li>
  </ul>
</template>

<style scoped lang="scss">
@import "../styles/constants";

.tablist {
  $bg: white;
  margin: 0 auto;
  display: inline-flex;

  border-radius: 0.5rem;
  border: 2px solid $bg;
  overflow: hidden;
  align-items: stretch;

  li {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  a {
    display: inline-flex;
    padding: 0.5em 0.75em;
    text-decoration: none;
    cursor: pointer;
    color: $bg;
    height: 100%;
    align-items: center;

    &:hover {
      background: rgba(white, 0.25);
      opacity: 1;
    }
  }

  a[aria-selected="true"] {
    background: $bg;
    color: $green_forest;
  }
}
</style>
