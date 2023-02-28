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
          <svg viewBox="0 0 8 10" aria-hidden="true" focusable="false">
            <polygon points="0 0, 0 10, 8 5"/>
          </svg>
          <slot name="summary" />
        </span>
        <span class="cluster">
          <slot name="aggregate" />
        </span>
      </button>
    </h3>
    <div class="foods-accordion__body" v-show="open">
      <slot name="details" />
    </div>
  </div>
</template>

<style lang="scss">
@import "../styles/constants";

$pad-h: 0.5rem;

.foods-accordion {
  width: 100%;
  font-size: 0.875em;
}

.foods-accordion__header {
  margin: 0 auto;
  display: block;


  button {
    background: transparent;
    border: 0;
    border-bottom: 2px solid $lightgray;

    width: 100%;
    padding: 1em $pad-h 1em 0;
    text-align: left;
  }

  svg {
    width: 0.6em;
    height: auto;
  }

  [aria-expanded="true"] {
    border-bottom-color: transparent;
    svg {
      transform: rotate(90deg)
    }
  }

  [aria-expanded] rect {
    fill: currentColor;
  }
}

.foods-accordion__body {
  width: 100%;
  padding-left: 1.5em;

  > * + * {
    margin-top: 1em;
  }
}

.foods-accordion__sub-header {
  padding: 0 $pad-h;
  h4 {
    font-weight: bold;
  }
}

.foods-accordion__row {
  flex-wrap: nowrap !important; /* sue me!! (otherwise .cluster takes prio) */
  padding: 0 $pad-h;

  &:hover {
    background: $gray;
  }

  label {
    flex-grow: 1;
    flex-shrink: 1;
  }

  input[type="text"] {
    padding: 0.25em;
    width: 5em;
    text-align: right;
    margin: 2px 0;

    &.has-error,
    &:not(:placeholder-shown):invalid {
      border-color: $yellow_corn;
      box-shadow: 0 0 0 3px rgba($yellow_corn, 0.2);
    }
  }

  &.has-changed {
    box-shadow: -0.5em 0 0 $blue_seabay;
  }

  &.has-error {
    box-shadow: -0.5em 0 0 $yellow_resin;
  }
}

</style>
