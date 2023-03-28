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
      type: Array as PropType<{ label: string; id: string; caption: string; }[]>,
      required: true,
    },
  },
  emits: ["click:tab"],
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
    <li v-for="tab in tabs" role="presentation" class="stack">
      <a
        role="tab"
        :id="tab.id"
        :aria-selected="current === tab.id"
        :tabindex="current === tab.id ? 0 : -1"
        @keydown="onKeyDown"
        @click.prevent="$emit('click:tab', tab.id)"
      >
        <span class="tablist__title" v-text="tab.label" />
        <span class="tablist__caption" v-text="tab.caption" />
      </a>
    </li>
  </ul>
</template>

<style scoped lang="scss">
@import "../styles/constants";

.tablist {
  $bg: black;
  margin: 0 auto;

  li {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  a {
    display: block;
    padding: 1em;
    color: $bg;

    font-weight: normal;
    text-decoration: none;

    cursor: pointer;
    height: 100%;

    &:hover {
      background: rgba(white, 0.25);
      opacity: 1;
    }

    &:focus {
      box-shadow: none;
      background: transparent;
      outline: 1px dashed rgba(black, 0.5);
      /* TODO: Focus indicator missing */
    }

    span {
      display: block;
    }
  }

  a[aria-selected="true"] {
    box-shadow: inset 0.5em 0 0 $blue_seabay;

    &::selection {
      background: white;
      color: black;
    }
  }
}

.tablist__title {
  margin-bottom: 0.25em;

  a[aria-selected="true"] & {
    font-weight: bold;
  }
}

.tablist__caption {
  font-size: 0.875em;
  opacity: 0.75;
}
</style>
