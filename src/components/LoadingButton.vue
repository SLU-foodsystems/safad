<script lang="ts" setup>
import { ref } from "vue";

const props = defineProps<{
  clickHandler: (event: Event) => void;
}>();

const isLoading = ref(false);

async function onClick(event: Event) {
  isLoading.value = true;
  try {
    props.clickHandler(event);
  } catch {}
  isLoading.value = false;
}
</script>

<template>
  <button
    class="button"
    :class="{ 'button--loading': isLoading }"
    @click="onClick"
  >
    <slot />
  </button>
</template>
