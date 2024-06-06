<script lang="ts" setup>
import { ref } from "vue";
import downloadSvgImg from "@/lib/charts/d3-exporter.ts";
const props = defineProps<{
  filename: string;
}>();

const rootEl = ref<HTMLDivElement | null>();
defineExpose({ rootEl });

async function downloadSvg(event: Event) {
  if (!(event instanceof MouseEvent)) {
    return;
  }

  let root = event.target;
  const isRootEl = (el: Element) => el.classList.contains("svg-container");
  while (root && !isRootEl(root)) {
    root = root.parentElement;
  }
  if (!root) return;

  const filename = root.dataset.filename ?? "chart";

  const svg = root.querySelector("svg");
  await downloadSvgImg(svg, filename, {});
}
</script>

<template>
  <div class="svg-container" :data-filename="props.filename" ref="rootEl">
    <slot />
    <button class="button button--slim svg-container__download" @click="downloadSvg">
      <img src="@/assets/download.svg" alt="" />
      Download
    </button>
  </div>
</template>

<style lang="scss" scoped>
@import "../styles/_constants.scss";
.svg-container {
  position: relative;
}

.svg-container__download {
  display: none;

  position: absolute;
  top: 0;
  right: 0;
  background: white;

  vertical-align: middle;
  img {
    height: 0.875em;
    width: auto;
    margin: 0;
    margin-right: 0.25em;
  }

  &:focus,
  .svg-container:hover & {
    display: block;
  }
}
</style>
