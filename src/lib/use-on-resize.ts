import { onBeforeUnmount, onMounted, ref } from "vue";
import { debounce } from "./utils";

export function useOnResize(callback: () => void, debounceMs = 200) {
  const width = ref(window.innerWidth);
  const height = ref(window.innerHeight);

  const debouncedCallback = debounce(callback, debounceMs);

  function update() {
    width.value = window.innerWidth;
    height.value = window.innerHeight;
    debouncedCallback();
  }

  onMounted(() => {
    window.addEventListener("resize", update);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", update);
  });

  return { width, height };
}
