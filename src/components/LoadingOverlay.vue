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
    <div class="loading-overlay" v-if="show"></div>
  </Transition>
</template>

<style lang="scss">
.loading-overlay {
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

  &::after {
    content: 'Loading...';
  }

  &::before {
    $size: 0.875em;
    content: '';
    border-radius: #{2*$size};
    width: $size;
    height: $size;
    display: block;
    border: 2px solid #06f;
    border-left-color: transparent;
    margin-right: 0.5em;
    animation: rotate 1.0s linear infinite;

  }

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
