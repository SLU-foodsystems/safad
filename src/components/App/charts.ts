import { ref, type Ref } from "vue";

import { rpcNames } from "@/lib/efsa-names";
import {
  aggregateImpacts,
  aggregateImpactsByCategory,
} from "@/lib/impacts-csv-utils";
import type ResultsEngine from "@/lib/ResultsEngine";
import { getRpcCodeSubset, mapValues } from "@/lib/utils";

export default function setupCharts(RE: ResultsEngine, diet: Ref<Diet>) {
  const carbonFootprints = ref<[string, number[]][]>([]);
  const dietFootprintsTotal = ref<number[]>([]);
  const dietFootprintsPerRpcCategory = ref<{ [key: string]: number[] }>({});
  const dietFootprintsPerFoodsCategory = ref<{ [key: string]: number[] }>({});

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
    return [
      "I.19.01.003.017", // Lasagna
      "A.19.01.002.003", // Pizza
      "I.19.01.001.018", // Pierogi, with vegetables
      "A.19.10.001", // Vegetable/herb soup
    ]
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
      .filter((x): x is [string, number[]] => x !== null)
      .map(([code, impacts]): [string, number[]] => [rpcNames[code], impacts]);
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
    dietFootprintsTotal.value = computeDietFootprintsTotal();
    dietFootprintsPerRpcCategory.value = computeDietFootprintsPerRpcCategory();
    dietFootprintsPerFoodsCategory.value =
      computeDietFootprintsPerFoodsCategory();
  };

  return {
    recompute,
    carbonFootprints,
    dietFootprintsTotal,
    dietFootprintsPerRpcCategory,
    dietFootprintsPerFoodsCategory,
  };
}
