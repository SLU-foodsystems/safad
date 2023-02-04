<script lang="ts">
  import { defineComponent } from "vue";

  const tabs = [
    {
      label: "Amount",
      id: "amount",
    },
    {
      label: "Tech. Impr.",
      id: "technical-improvement",
    },
    {
      label: "Waste",
      id: "waste",
    },
    {
      label: "Origin",
      id: "origin",
    },
  ];

  export default defineComponent({
    /* props: { */
    /*   current: String, */
    /*   tabs: { */
    /*     type: Array, */
    /*   }, */
    /* }, */
    data() {
      return {
        selected: "amount",
        tabs,
      };
    }
  });
</script>

<template>
  <div class="center u-tac">
    <ul class="tablist" role="tablist">
      <li v-for="tab in tabs" role="presentation">
        <a role="tab" :id="tab.id" :aria-selected="selected === tab.id">{{ tab.label }}</a>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
@import "../styles/constants";

.tablist {
  $accent: $green_forest;
  margin: 0 auto;
  display: inline-flex;

  border-radius: 0.5rem;
  border: 2px solid $accent;
  overflow: hidden;

  li {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  a {
    display: inline-block;
    padding: 0.5em 0.75em;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      background: $gray_feather;
      opacity: 1;
    }
  }

  a[aria-selected="true"] {
    background: $accent;
    color: white;
  }
}
</style>
