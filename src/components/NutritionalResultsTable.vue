<script lang="ts">
import { defineComponent, type PropType } from "vue";

export default defineComponent({
  props: {
    absoluteValues: {
      required: true,
      type: Object as PropType<NutrFactors>,
    },
    limits: {
      required: false, // TODO: For now
      type: Object as PropType<[number, number]>,
    },
  },

  data() {
    return {
      labels: [
        ["Calories, kcal", 0],
        ["Protein, g", 1],
        ["Carbohydrates, g", 2],
        ["Fat, g", 3],
        ["Saturated fatty acids, g", 4],
        ["Monounsaturated fatty acids, g", 7],
        ["Polyunsaturated fatty acids, g", 8],
        ["Vitamin A, µg Retinol equivalent (RE)", 28],
        ["Vitamin C, mg", 12],
        ["Vitamin D, µg", 9],
        ["Vitamin E, mg", 10],
        ["Calcium, mg", 17],
        ["Fibre, g", 5],
        ["Folate, µg", 15],
        ["Iodine, µg", 35],
        ["Iron, mg", 16],
        ["Magnesium, mg", 19],
        ["Niacin, mg", 32],
        ["Phosphorus, mg", 34],
        ["Potassium, mg", 18],
        ["Riboflavin, mg", 0],
        ["Sodium, mg", 20],
        ["Thiamin, mg", 30],
        ["Vitamin B12, µg", 14],
        ["Vitamin B6, mg", 13],
        ["Zinc, mg", 22],
      ] as [string, number][],
    };
  },
  methods: {

  },
});
</script>

<template>
  <div class="table-container">
    <h2>Nutrition</h2>
    <table class="results-table">
      <thead>
        <tr>
          <th>Impact factor</th>
          <th>Amount</th>
          <th>Fulfills Recommendations?</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="[label, idx] in labels">
          <th scope="row" v-text="label" />
          <td v-text="absoluteValues[idx].toExponential(2)" />
        </tr>
      </tbody>
    </table>
  </div>
</template>
