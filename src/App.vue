<script lang="ts">
import { defineComponent } from "vue";
import StartPage from "./components/StartPage.vue";
import FoodsConfigurator from "./components/FoodsConfigurator.vue";

type Page = "start" | "configurator";

export default defineComponent({
  components: {
    FoodsConfigurator,
    StartPage,
  },

  data() {
    return {
      page: "start" as Page,
      baseValues: null as null | BaseValues,
    };
  },

  methods: {
    onStartPageSubmit(data: BaseValues) {
      this.baseValues = data;
      this.page = "configurator";
    },
  },
});
</script>

<template>
  <StartPage v-if="page === 'start'" @submit="onStartPageSubmit" ref="startPage" />
  <FoodsConfigurator v-if="page === 'configurator' && baseValues !== null" :baseValues="baseValues" />
</template>
