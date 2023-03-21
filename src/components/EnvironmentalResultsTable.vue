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
  <table>
    <thead>
      <tr>
        <th>Impact factor</th>
        <th>Amount</th>
        <th>Change</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Climate impact, kg CO2e</td>
        <td v-text="toFixed(absoluteValues[0])" />
        <td v-text="toPercentage(changeFactors[0])"
          :data-percentage-direction="percentageDirection(changeFactors[0])" />
      </tr>
      <tr>
        <td>Carbon dioxide, kg CO2</td>
        <td v-text="toFixed(absoluteValues[1])" />
        <td v-text="toPercentage(changeFactors[1])"
          :data-percentage-direction="percentageDirection(changeFactors[1])" />
      </tr>
      <tr>
        <td>Methane, kg CH4</td>
        <td v-text="toFixed(absoluteValues[2])" />
        <td v-text="toPercentage(changeFactors[2])"
          :data-percentage-direction="percentageDirection(changeFactors[2])" />
      </tr>
      <tr>
        <td>Nitrous oxide, kg N2O</td>
        <td v-text="toFixed(absoluteValues[3])" />
        <td v-text="toPercentage(changeFactors[3])"
          :data-percentage-direction="percentageDirection(changeFactors[3])" />
      </tr>
      <tr>
        <td>kg HCFs</td>
        <td v-text="toFixed(absoluteValues[4])" />
        <td v-text="toPercentage(changeFactors[4])"
          :data-percentage-direction="percentageDirection(changeFactors[4])" />
      </tr>
      <tr>
        <td>Cropland use, m2</td>
        <td v-text="toFixed(absoluteValues[5])" />
        <td v-text="toPercentage(changeFactors[5])"
          :data-percentage-direction="percentageDirection(changeFactors[5])" />
      </tr>
      <tr>
        <td>Nitrogen application, kg N</td>
        <td v-text="toFixed(absoluteValues[6])" />
        <td v-text="toPercentage(changeFactors[6])"
          :data-percentage-direction="percentageDirection(changeFactors[6])" />
      </tr>
      <tr>
        <td>Phosphorus application, kg P</td>
        <td v-text="toFixed(absoluteValues[7])" />
        <td v-text="toPercentage(changeFactors[7])"
          :data-percentage-direction="percentageDirection(changeFactors[7])" />
      </tr>
      <tr>
        <td>Freshwater use, m3</td>
        <td v-text="toFixed(absoluteValues[8])" />
        <td v-text="toPercentage(changeFactors[8])"
          :data-percentage-direction="percentageDirection(changeFactors[8])" />
      </tr>
      <tr>
        <td>Extinction rate, E/MSY</td>
        <td v-text="toFixed(absoluteValues[9])" />
        <td v-text="toPercentage(changeFactors[9])"
          :data-percentage-direction="percentageDirection(changeFactors[9])" />
      </tr>
    </tbody>
  </table>
</template>

<style lang="scss" scoped>
@import "../styles/constants";

table {
  table-layout: fixed;
  border-collapse: collapse;
  margin: 2em auto;
  width: 100%;
}

tr:hover {
  background: rgba(black, 0.1);
}

th {
  text-align: left;
}

th,
td {
  border: none;
  padding: 0.5rem 0.25rem;

  &~& {
    text-align: right;
    font-family: monospace;
    font-size: 1.5em;
  }
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
