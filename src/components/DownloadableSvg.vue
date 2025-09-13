<script lang="ts" setup>
import { ref } from "vue";
import downloadSvgImg, {
  downloadHtmlElementAsImg,
} from "@/lib/charts/d3-exporter";
import LoadingButton from "@/components/LoadingButton.vue";

const props = defineProps<{
  filename: string;
  mode: "svg" | "html";
}>();

const rootEl = ref<HTMLDivElement | null>();
defineExpose({ rootEl });

async function download(event: Event) {
  if (!(event instanceof MouseEvent)) {
    return;
  }

  let root = event.target;
  if (!(root instanceof HTMLElement)) return;
  const isRootEl = (el: HTMLElement) => el.classList.contains("svg-container");
  while (root && root instanceof HTMLElement && !isRootEl(root)) {
    root = root.parentElement;
  }
  if (!root || !(root instanceof HTMLElement)) return;

  const filename = root.dataset.filename ?? "chart";

  if (props.mode === "html") {
    await downloadHtmlElementAsImg(root, filename, { scale: 2 });
  } else {
    const svg = root.querySelector("svg");
    if (!svg) {
      console.error("No svg-element found in svg-container. Wrong mode?");
      return;
    }
    await downloadSvgImg(svg, filename, { scale: 2 });
  }
}
</script>

<template>
  <div class="svg-container" :data-filename="props.filename" ref="rootEl">
    <slot />
    <LoadingButton
      class="button--slim svg-container__download"
      :click-handler="download"
    >
      <img src="@/assets/download.svg" alt="" />
      Download
    </LoadingButton>
  </div>
</template>

<style lang="scss" scoped>
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
