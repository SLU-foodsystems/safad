<script lang="ts">
import { defineComponent, type PropType } from "vue";

export default defineComponent({
  props: {
    absoluteValues: {
      required: true,
      type: Object as PropType<EnvFactors>,
    },
    changeFactors: {
      required: true,
      type: Object as PropType<EnvFactors>,
    },
  },
  methods: {
    toFixed(value: number) {
      return value.toExponential(2);
    },
    toPercentage(value: number) {
      return (value * 100).toFixed(2) + " %";
    },
    percentageDirection(value: number): "inc" | "dec" | "eq" {
      const precision = 10 ** 4;
      const rounded = Math.round(value * precision) / precision;
      if (rounded === 0) return "eq";
      return rounded > 0 ? "inc" : "dec";
    },
  },
});
</script>

<template>
  <div class="table-container">
    <h2>Environmental Impact</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Impact factor</th>
          <th>Amount</th>
          <th>Change</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Climate impact, kg CO2e</th>
          <td v-text="toFixed(absoluteValues[0])" />
          <td v-text="toPercentage(changeFactors[0])"
            :data-percentage-direction="percentageDirection(changeFactors[0])" />
        </tr>
        <tr>
          <th scope="row">Cropland use, m2</th>
          <td v-text="toFixed(absoluteValues[5])" />
          <td v-text="toPercentage(changeFactors[5])"
            :data-percentage-direction="percentageDirection(changeFactors[5])" />
        </tr>
        <tr>
          <th scope="row">Nitrogen application, kg N</th>
          <td v-text="toFixed(absoluteValues[6])" />
          <td v-text="toPercentage(changeFactors[6])"
            :data-percentage-direction="percentageDirection(changeFactors[6])" />
        </tr>
        <tr>
          <th scope="row">Phosphorus application, kg P</th>
          <td v-text="toFixed(absoluteValues[7])" />
          <td v-text="toPercentage(changeFactors[7])"
            :data-percentage-direction="percentageDirection(changeFactors[7])" />
        </tr>
        <tr>
          <th scope="row">Freshwater use, m3</th>
          <td v-text="toFixed(absoluteValues[8])" />
          <td v-text="toPercentage(changeFactors[8])"
            :data-percentage-direction="percentageDirection(changeFactors[8])" />
        </tr>
        <tr>
          <th scope="row">Extinction rate, E/MSY</th>
          <td v-text="toFixed(absoluteValues[9])" />
          <td v-text="toPercentage(changeFactors[9])"
            :data-percentage-direction="percentageDirection(changeFactors[9])" />
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
@import "../styles/constants";

.table-container {
  overflow-x: scroll;
  padding: 0 1em;
}

table {
  /* table-layout: fixed; */
  border-collapse: collapse;
  margin: 2em auto;
  width: 100%;
}

tr:hover {
  background: rgba(black, 0.1);
}

th,
td {
  text-align: right;
}

th:first-child {
  text-align: left;
}

td {
  font-family: monospace;
  font-size: 1.5em;
  width: 10ch;
}

th,
td {
  border: none;
  padding: 0.5rem 0.25rem;
}

[data-percentage-direction="inc"] {
  color: $red_plum;
  font-weight: bold;

  &::before {
    content: "+";
  }
}

[data-percentage-direction="dec"] {
  color: $green_olive;
  font-weight: bold;
}

[data-percentage-direction="eq"] {
  opacity: 0.5;
}
</style>
