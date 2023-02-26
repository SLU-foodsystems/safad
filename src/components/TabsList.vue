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
  methods: {
    onKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowLeft":
        case "ArrowUp":
        case "ArrowDown":
          event.preventDefault();
          // Work out which key the user is pressing and
          const currentIndex = this.tabs
            .map((tab) => tab.id)
            .indexOf(this.current);
          // Calculate the new tab's index where appropriate
          const direction =
            event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;

          const newIndex = Math.max(
            0,
            Math.min(this.tabs.length - 1, currentIndex + direction)
          );

          // Avoid unnecessary propagation if the same value
          if (newIndex === currentIndex) return;

          // Simulate click
          this.$emit('click:tab', this.tabs[newIndex].id);
          break;
        default:
          return;
      }
    },
  },
});
</script>

<template>
  <ul class="tablist" role="tablist">
    <li v-for="tab in tabs" role="presentation">
      <a
        role="tab"
        :id="tab.id"
        :aria-selected="current === tab.id"
        :tabindex="current === tab.id ? 0 : -1"
        v-text="tab.label"
        @keydown="onKeyDown"
        @click.prevent="$emit('click:tab', tab.id)"
      />
    </li>
  </ul>
</template>

<style scoped lang="scss">
@import "../styles/constants";

.tablist {
  $bg: black;
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
    color: white;

    &:focus {
      /* TODO: Focus indicator missing */
    }

    &::selection {
      background: white;
      color: black;
    }
  }
}
</style>
