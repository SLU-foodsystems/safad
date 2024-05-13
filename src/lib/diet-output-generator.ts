import type ResultsEngine from "@/lib/ResultsEngine.ts";
import {
  DETAILED_RESULTS_HEADER,
  labeledImpacts,
} from "@/lib/impacts-csv-utils";

export const DIET_RESULTS_HEADER = [
  "Food-product Code",
  "Food-product Name",
  "Total or component",
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
          const impacts = RE.computeImpacts([[subcode, subamount]], false);
          const filteredImpacts = [
            impacts[0],
            {},
            {},
            {},
          ] satisfies ImpactsTuple;

          return [
            code,
            name,
            "Component",
            ...labeledImpacts(subcode, subamount, filteredImpacts, efsaNames),
          ];
        })
        .filter((x): x is string[] => x !== null);

      // We compute the total impacts as well, which will include additional
      // processes and packaging
      const totalImpacts = RE.computeImpacts([[code, amount]]);
      if (totalImpacts === null) return null;

      const createRow = (impactsIdx: 1 | 2 | 3, category: string) => {
        const impactsTuple: ImpactsTuple = [
          {},
          impactsIdx === 1 ? totalImpacts[1] : {},
          impactsIdx === 2 ? totalImpacts[2] : {},
          impactsIdx === 3 ? totalImpacts[3] : {},
        ];

        const impactsRow = labeledImpacts(
          category,
          amount,
          impactsTuple,
          efsaNames
        );

        return [
          code,
          category,
          "Component",
          "",
          category,
          "Processes, packaging and transport",
          "Processes, packaging and transport",
          "",
          ...impactsRow.slice(5),
        ];
      };

      return [
        [
          code,
          name,
          "Total",
          ...labeledImpacts(code, amount, totalImpacts, efsaNames),
        ],
        // drop names and amount for processing and packaging rows
        createRow(1, "Processes"),
        createRow(2, "Packaging"),
        createRow(3, "Transport"),
        ...ingredientRows,
      ];
    })
    .filter((x): x is string[][] => x !== null)
    .flat(1);
