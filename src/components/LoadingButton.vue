<script lang="ts" setup>
import { ref } from "vue";

const props = defineProps<{
  clickHandler: (event: Event) => void | Promise<void>;
}>();

const isLoading = ref(false);

async function onClick(event: Event) {
  if (isLoading.value) return;

  isLoading.value = true;
  try {
    await props.clickHandler(event);
  } finally {
    isLoading.value = false;
  }
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
