<script setup lang="ts">
const props = defineProps<{
  aspectRatio: number;
}>();

const width = 100;
const height = width * props.aspectRatio;

const viewBox = `0 0 ${width} ${height}`;
</script>

<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="viewBox"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  ></svg>
</template>

<style lang="scss" scoped>
svg {
  width: 100%;
  height: auto;
  position: relative;

  background-image: url("@/assets/spinner.svg");
  background-repeat: no-repeat;
  background-position: center center;
  background-size: 3em 3em;
  animation: rotate 1s linear infinite;
}
</style>
