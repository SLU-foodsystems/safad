import { ref, type Ref } from "vue";

import { rpcNames } from "@/lib/efsa-names";
import {
  aggregateImpacts,
  aggregateImpactsByCategory,
} from "@/lib/impacts-csv-utils";
import type ResultsEngine from "@/lib/ResultsEngine";

export default function setupCharts(RE: ResultsEngine, diet: Ref<Diet>) {
  const carbonFootprints = ref<[string, number[]][]>([]);
  const dietFootprintsTotal = ref<number[]>([]);
  const dietFootprintsPerCategory = ref<{ [key: string]: number[] }>({});

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
    const [rpcFootprintsMaybeNull, ...rest] = RE.computeImpacts(diet.value);
    // Filter out any NA-footprints
    const rpcFootprints = Object.fromEntries(
      Object.entries(rpcFootprintsMaybeNull).filter(
        (kv): kv is [string, number[]] => kv[1] !== null
      )
    );

    return aggregateImpacts(rpcFootprints, ...rest);
  };
  const computeDietFootprintsPerCategory = () => {
    return aggregateImpactsByCategory(...RE.computeImpacts(diet.value));
  };

  const recompute = () => {
    carbonFootprints.value = computeCarbonFootprints();
    dietFootprintsTotal.value = computeDietFootprintsTotal();
    dietFootprintsPerCategory.value = computeDietFootprintsPerCategory();
  };

  return {
    recompute,
    carbonFootprints,
    dietFootprintsTotal,
    dietFootprintsPerCategory,
  };
}
