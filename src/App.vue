<script lang="ts">
import { defineComponent, nextTick } from "vue";
import StartPage from "./components/StartPage.vue";
import FoodsConfigurator from "./components/FoodsConfigurator.vue";
import ResultsManager from "./lib/ResultsManager";

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
      envFactors: null as null | EnvFactors[],
      nutrFactors: null as null | NutrFactors[],
    };
  },

  methods: {
    onStartPageSubmit(data: {
      baseValues: BaseValues;
      envFactors: Record<string, Record<string, EnvFactors>>;
      nutrFactors: Record<string, NutrFactors>;
    }) {
      ResultsManager.setEnvironmentalFactors(data.envFactors);
      ResultsManager.setNutritionalFactors(data.nutrFactors);

      this.baseValues = data.baseValues;
      nextTick(() => {
        this.page = "configurator";
      });
    },
  },
});
</script>

<template>
  <StartPage v-if="page === 'start'" @submit="onStartPageSubmit" ref="startPage" />
  <FoodsConfigurator v-if="page === 'configurator' && baseValues !== null" :baseValues="baseValues" />
</template>
