import { ref, type Ref } from "vue";

import {
  aggregateImpacts,
  aggregateImpactsByCategory,
} from "@/lib/impacts-csv-utils";
import type ResultsEngine from "@/lib/ResultsEngine";
import { getRpcCodeSubset, mapValues } from "@/lib/utils";
import {
  computeFoodProcessEnergy,
  computeFoodRecipeAmounts,
  computeFoodPreparationYields,
  type FoodProcessEnergy,
  type FoodPreparationYields,
  type FoodRecipeAmounts,
} from "@/lib/food-processing-energy";

export default function setupCharts(
  RE: ResultsEngine,
  diet: Ref<Diet>,
  foodCodes: Ref<string[]>
) {
  const carbonFootprints = ref<[string, number[]][]>([]);
  const foodProcessEnergy = ref<FoodProcessEnergy>({});
  const foodRecipeAmounts = ref<FoodRecipeAmounts>({});
  const foodPreparationYields = ref<FoodPreparationYields>({});
  const dietFootprintsTotal = ref<number[]>([]);
  const dietFootprintsPerRpcCategory = ref<{ [key: string]: number[] }>({});
  const dietFootprintsPerFoodsCategory = ref<{ [key: string]: number[] }>({});
  const dietAmountsPerRpcCategory = ref<{ [key: string]: number }>({});

  const aggregateNonNullImpacts = (impacts: ImpactsTuple): number[] => {
    const [rpcFootprintsMaybeNull, ...rest] = impacts;
    // Filter out any NA-footprints
    const rpcFootprints = Object.fromEntries(
      Object.entries(rpcFootprintsMaybeNull).filter(
        (kv): kv is [string, number[]] => kv[1] !== null
      )
    );

    return aggregateImpacts(rpcFootprints, ...rest);
  };

  const computeCarbonFootprints = () => {
    if (!foodCodes.value) return [];
    return foodCodes.value
      .map((foodCode) => {
        const impacts = RE.computeImpacts([[foodCode, 1000]]);
        if (Object.values(impacts[0]).some((v) => v === null)) {
          return null;
        }
        return [
          foodCode,
          aggregateImpacts(
            impacts[0] as Record<string, number[]>,
            impacts[1],
            impacts[2],
            impacts[3]
          ),
        ];
      })
      .filter((x): x is [string, number[]] => x !== null);
  };

  const computedDietAmountsPerRpcCategory = () => {
    if (!diet.value) return {};
    // TODO: could avoid reducing the diet first, to instead get the food groups
    const [rpcAmounts] = RE.reduceDiet(diet.value, true);
    const amountsPerCategory: Record<string, number> = {};
    rpcAmounts.forEach(([code, amount]) => {
      const l1Code = getRpcCodeSubset(code, 1);
      amountsPerCategory[l1Code] = (amountsPerCategory[l1Code] || 0) + amount;
    });
    return amountsPerCategory;
  };

  const computeFoodProcessEnergyPreview = () => {
    if (!RE.foodsRecipes || !RE.processesEnergyDemands) return {};
    const energy = computeFoodProcessEnergy(
      RE.foodsRecipes,
      RE.processesEnergyDemands
    );
    return Object.fromEntries(
      foodCodes.value.map((code) => [code, energy[code] || {}])
    );
  };

  const computeDietFootprintsTotal = () => {
    if (!diet.value) return [];
    const impacts = RE.computeImpacts(diet.value);
    return aggregateNonNullImpacts(impacts);
  };

  const computeDietFootprintsPerRpcCategory = () =>
    diet.value
      ? aggregateImpactsByCategory(...RE.computeImpacts(diet.value))
      : {};

  const computeDietFootprintsPerFoodsCategory = (): Record<
    string,
    number[]
  > => {
    if (!diet.value) return {};

    const dietsPerCategory: Record<string, Diet> = {};
    diet.value.forEach(([code, amount]) => {
      const l1Code = getRpcCodeSubset(code, 1);
      if (!dietsPerCategory[l1Code]) {
        dietsPerCategory[l1Code] = [];
      }
      dietsPerCategory[l1Code].push([code, amount]);
    });

    return mapValues(dietsPerCategory, (diet) => {
      const impacts = RE.computeImpacts(diet);
      return aggregateNonNullImpacts(impacts);
    });
  };

  const recompute = () => {
    carbonFootprints.value = computeCarbonFootprints();
    foodProcessEnergy.value = computeFoodProcessEnergyPreview();
    if (RE.foodsRecipes) {
      const amounts = computeFoodRecipeAmounts(RE.foodsRecipes);
      foodRecipeAmounts.value = Object.fromEntries(
        foodCodes.value.map((code) => [code, amounts[code] || []])
      );
      const yields = computeFoodPreparationYields(RE.foodsRecipes);
      foodPreparationYields.value = Object.fromEntries(
        foodCodes.value.map((code) => [code, yields[code] ?? null])
      );
    }
    dietFootprintsTotal.value = computeDietFootprintsTotal();
    dietFootprintsPerRpcCategory.value = computeDietFootprintsPerRpcCategory();
    dietFootprintsPerFoodsCategory.value =
      computeDietFootprintsPerFoodsCategory();
    dietAmountsPerRpcCategory.value = computedDietAmountsPerRpcCategory();
  };

  return {
    recompute,
    carbonFootprints,
    foodProcessEnergy,
    foodRecipeAmounts,
    foodPreparationYields,
    dietFootprintsTotal,
    dietFootprintsPerRpcCategory,
    dietFootprintsPerFoodsCategory,
    dietAmountsPerRpcCategory,
  };
}
