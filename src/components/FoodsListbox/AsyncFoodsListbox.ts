import { defineAsyncComponent } from "vue";
import Placeholder from "./FoodsListboxPlaceholder.vue";

export default defineAsyncComponent({
  loader: () => import("./FoodsListbox.vue"),
  loadingComponent: Placeholder,
});
