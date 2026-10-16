<script lang="ts" setup>
import { defineComponent, h, nextTick, onMounted, onUnmounted, ref } from "vue";

const selectedTab = ref("model");
const isWide = ref(false);
const tabs = [
  { id: "model", label: "Model and crop production" },
  { id: "environmental", label: "Environmental indicators" },
  { id: "animal", label: "Animal-source foods and fish" },
  { id: "novel", label: "Novel foods and background data" },
];
const tabNavigationKeys = new Set([
  "ArrowRight",
  "ArrowDown",
  "ArrowLeft",
  "ArrowUp",
  "Home",
  "End",
]);

let mediaQuery: MediaQueryList | undefined;
const updateOrientation = (event: MediaQueryListEvent) =>
  (isWide.value = event.matches);

const moveTab = async (event: KeyboardEvent, index: number) => {
  if (!tabNavigationKeys.has(event.key)) return;
  event.preventDefault();
  const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (index + direction + tabs.length) % tabs.length;
  selectedTab.value = tabs[nextIndex].id;
  await nextTick();
  (event.currentTarget as HTMLElement).parentElement
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    [nextIndex]?.focus();
};

onMounted(() => {
  mediaQuery = window.matchMedia("(min-width: 1400px)");
  isWide.value = mediaQuery.matches;
  mediaQuery.addEventListener("change", updateOrientation);
});

onUnmounted(() => {
  mediaQuery?.removeEventListener("change", updateOrientation);
});

const ExternalLink = defineComponent({
  props: { href: String },
  setup(props, { slots }) {
    const attrs = {
      href: props.href,
      rel: "nofollow noopener",
      target: "_blank",
    };
    return () => h("a", attrs, slots.default?.());
  },
});
</script>

<template>
  <section class="sources-section stack stack-l">
    <h2 class="hr-header"><span>Sources used in the calculations</span></h2>
    <p>
      SAFAD combines scientific literature, life-cycle databases and official
      statistics.
      <ExternalLink href="https://doi.org/10.1016/j.jclepro.2025.146002"
        >Röös et al. (2025)</ExternalLink
      >
      describes the SAFAD model and its indicator framework. The main sources
      are grouped below by what they are used for; detailed crop-specific
      sources are available in the
      <ExternalLink
        href="https://github.com/SLU-foodsystems/safad/tree/main/data-preprocessing/rpc-footprints"
        >data-preprocessing workbooks</ExternalLink
      >.
    </p>
    <div class="sources-box">
      <div
        class="sources-tabs"
        role="tablist"
        aria-label="Source categories"
        :aria-orientation="isWide ? 'vertical' : 'horizontal'"
      >
        <button
          v-for="(tab, index) in tabs"
          :id="`source-tab-${tab.id}`"
          :key="tab.id"
          class="sources-tab"
          :class="{ 'sources-tab--active': selectedTab === tab.id }"
          role="tab"
          :aria-selected="selectedTab === tab.id"
          :aria-controls="`sources-panel-${tab.id}`"
          :tabindex="selectedTab === tab.id ? 0 : -1"
          @click="selectedTab = tab.id"
          @keydown="moveTab($event, index)"
        >
          {{ tab.label }}
        </button>
      </div>
      <div
        v-if="selectedTab === 'model'"
        id="sources-panel-model"
        class="sources-panel"
        role="tabpanel"
        aria-labelledby="source-tab-model"
        tabindex="0"
      >
        <h3>Model and crop production</h3>
        <ul>
          <li>
            FAOSTAT, Eurostat and the Swedish Board of Agriculture provide crop
            yields and production data. The average of the years 2020-2024 is
            used where available.
          </li>
          <li>
            ecoinvent 3.12, Ludemann et al. (2025), IFA and crop-specific
            studies provide fertiliser, pesticide, field-operation and
            emission-factor data. These include
            <ExternalLink href="https://doi.org/10.1016/j.spc.2021.01.017"
              >Tidåker et al. (2021)</ExternalLink
            >,
            <ExternalLink href="https://doi.org/10.1021/es2030577"
              >Stoessel et al. (2012)</ExternalLink
            >, Jensen et al. (2024), Jordbruksverket (2011, 2013), and the
            Danish EPA pesticide-use report (2024).
          </li>
          <li>
            Trade shares and transport origins use data from Thomas Kastner,
            with methods described by
            <ExternalLink href="https://doi.org/10.1016/j.ecolecon.2011.01.012"
              >Kastner et al. (2011)</ExternalLink
            >
            and
            <ExternalLink href="https://doi.org/10.1016/j.gloenvcha.2020.102066"
              >Laroche et al. (2020).</ExternalLink
            >
          </li>
          <li>
            Crop residue calculations based on
            <ExternalLink
              href="https://www.ipcc.ch/report/2019-refinement-to-the-2006-ipcc-guidelines-for-national-greenhouse-gas-inventories"
              >IPCC (2019)</ExternalLink
            >.
          </li>
        </ul>
      </div>
      <div
        v-else-if="selectedTab === 'environmental'"
        id="sources-panel-environmental"
        class="sources-panel"
        role="tabpanel"
        aria-labelledby="source-tab-environmental"
        tabindex="0"
      >
        <h3>Environmental indicators</h3>
        <ul>
          <li>
            <ExternalLink href="https://doi.org/10.1038/s41597-024-03051-3"
              >Mialyk et al. (2024)</ExternalLink
            >
            provide crop blue-water footprints.
          </li>
          <li>
            Land-use change uses the DeDuCE model and
            <ExternalLink href="https://zenodo.org/records/19133750"
              >Sigh et al. (2026)</ExternalLink
            >
          </li>
          <li>
            Biodiversity uses
            <ExternalLink href="https://doi.org/10.1021/acs.est.3c04191"
              >Scherer et al. (2023)</ExternalLink
            >
          </li>
          <li>Rice methane uses FAOSTAT rice emissions and production data.</li>
          <li>
            Mineral fertiliser emissions factors are from
            <ExternalLink href="">Hoxha &amp; Christensen (2018)</ExternalLink>.
          </li>
          <li>
            District heating is based on Gode et al. (2011) for Sweden and
            Trafik-, Bygge- og Boligstyrelsen (2020) for Denmark.
          </li>
          <li>
            For a list of emissions factors sources, see the corresponding excel
            file.
          </li>
        </ul>
      </div>
      <div
        v-else-if="selectedTab === 'animal'"
        id="sources-panel-animal"
        class="sources-panel"
        role="tabpanel"
        aria-labelledby="source-tab-animal"
        tabindex="0"
      >
        <h3>Animal-source foods and fish</h3>
        <ul>
          <li>
            Livestock footprints draw on Ahlgren et al. (2022, 2023), Bava et
            al. (2017), Landquist et al. (2020), Morgensen et al. (2015), Abín
            et al. (2018), Guillaume et al. (2022), Ledgard et al. (2011), Paris
            et al. (2022) and Zira et al. (2023).
          </li>
          <li>
            Wild-caught and farmed fish use Gephart et al. (2021) and Moberg et
            al. (2019)
          </li>
          <li>
            Animal-welfare and antibiotic indicators use
            <ExternalLink href="https://doi.org/10.1016/j.spc.2025.08.020">
              Rydhmer and Röös (2025)</ExternalLink
            >.
          </li>
          <li>
            Mekonnen &amp; Hoekstra (2011) provide blue freshwater-use data for
            forage crops in the livestock models.
          </li>
        </ul>
      </div>
      <div
        v-else
        id="sources-panel-novel"
        class="sources-panel"
        role="tabpanel"
        aria-labelledby="source-tab-novel"
        tabindex="0"
      >
        <h3>Novel foods and background data</h3>
        <ul>
          <li>
            Novel-food estimates use the dedicated workbook’s inventories and
            literature, including Smetana et al. (2015, 2016, 2017), Oonincx
            &amp; de Boer (2012), Järviö et al. (2021), Tuomisto et al. (2022),
            Mazac et al. (2022) and Behaderovic &amp; Berglund (2022).
          </li>
          <li>
            Background electricity, fuels and fertilisers use ecoinvent
            (3.9.1/3.12), Gode et al. (2011), Yara International (2010) and the
            IPCC characterisation factors.
          </li>
          <li>
            IPCC (2006, 2019, 2021) and FAOSTAT support greenhouse-gas
            calculations.
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use "sass:color";
@use "../../styles/constants";
$bg: constants.$red_grape;
$bg-light: color.adjust($bg, $lightness: 10%);

.sources-section {
  width: 70rem;
  max-width: calc(100vw - 2rem);
  margin: 4em auto 0;

  > p {
    max-width: 70rem;
    margin-left: auto;
    margin-right: auto;
  }

  ::selection {
    background: white;
    color: $bg;
  }
}

.sources-box {
  display: grid;
  border-radius: 1em;
  background: $bg;
  color: white;
  overflow: hidden;
}

.sources-tabs {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  padding: 0.5em;
}

.sources-tab {
  border: 0;
  border-radius: 0.65em;
  padding: 0.75em 1em;
  background: transparent;
  cursor: pointer;
  font: inherit;
  text-align: left;
  color: constants.$red_apricot;

  &:hover,
  &:focus-visible,
  &--active {
    background: $bg-light;
  }

  &:focus-visible {
    outline: 2px solid currentColor;
  }
}

.sources-panel {
  padding: 1.5em;
  background: $bg-light;

  h3 {
    margin-top: 0;
  }

  ul {
    padding-left: 1.25em;
  }

  li + li {
    margin-top: 0.75em;
  }
}

@media (min-width: constants.$measure--wide) {
  .sources-box {
    grid-template-columns: max-content 1fr;
  }
}

@media (max-width: constants.$measure--wide) {
  .sources-box {
    display: block;
  }

  .sources-tabs {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
