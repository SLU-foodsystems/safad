<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    show: Boolean,
  },
});
</script>

<template>
  <Transition>
    <div class="missing-data-overlay" v-if="show">
      <slot>
        Missing or incomplete data.
      </slot>
    </div>
  </Transition>
</template>

<style lang="scss">
.missing-data-overlay {
  position: absolute;
  display: flex;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;

  align-items: center;
  justify-content: center;

  background: rgba(white, 0.85) !important;
  font-size: 1.25em;
  font-weight: bold;
  text-align: center;

  &.v-enter-active,
  &.v-leave-active {
    transition: opacity 0.5s ease;
  }

  &.v-enter-from,
  &.v-leave-to {
    opacity: 0;
  }
}
</style>
