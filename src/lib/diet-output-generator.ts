import type ResultsEngine from "@/lib/ResultsEngine.ts";
import {
  DETAILED_RESULTS_HEADER,
  labeledImpacts,
} from "@/lib/impacts-csv-utils";

export const DIET_RESULTS_HEADER = [
  "Food-product Code",
  "Food-product Name",
  "Food-product or ingredient",
  ...DETAILED_RESULTS_HEADER,
];

export const computeDietFootprints = (
  diet: Diet,
  RE: ResultsEngine,
  efsaNames: Record<string, string>
): string[][] =>
  diet
    .map(([code, amount]) => {
      const [rpcAmounts] = RE.reduceDiet([[code, amount]]);
      const name = efsaNames[code];

      // First, compute the impact of each diet element seperately
      const ingredientRows: string[][] = rpcAmounts
        .map(([subcode, subamount]) => {
          const impacts = RE.computeImpacts([[subcode, subamount]]);
          return [
            code,
            name,
            "Ingredient",
            ...labeledImpacts(subcode, subamount, impacts, efsaNames),
          ];
        })
        .filter((x): x is string[] => x !== null);

      // We compute the total impacts as well, which will include additional
      // processes and packaging
      const totalImpacts = RE.computeImpacts([[code, amount]]);
      if (totalImpacts === null) return null;

      return [
        [
          code,
          name,
          "Food-product",
          ...labeledImpacts(code, amount, totalImpacts, efsaNames),
        ],
        ...ingredientRows,
      ];
    })
    .filter((x): x is string[][] => x !== null)
    .flat(1);
