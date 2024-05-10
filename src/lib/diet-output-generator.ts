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
          const impacts = RE.computeImpacts([[subcode, subamount]]);
          return [
            code,
            name,
            "Component",
            ...labeledImpacts(subcode, subamount, impacts, efsaNames),
          ];
        })
        .filter((x): x is string[] => x !== null);

      // We compute the total impacts as well, which will include additional
      // processes and packaging
      const totalImpacts = RE.computeImpacts([[code, amount]]);
      if (totalImpacts === null) return null;

      const processesImpactsRow = labeledImpacts(
        "Processes",
        amount,
        [{}, totalImpacts[1], {}, {}],
        efsaNames
      );
      const packagingImpactsRow = labeledImpacts(
        "Packaging",
        amount,
        [{}, {}, totalImpacts[2], {}],
        efsaNames
      );

      return [
        [
          code,
          name,
          "Total",
          ...labeledImpacts(code, amount, totalImpacts, efsaNames),
        ],
        // drop names and amount for processing and packaging rows
        [code, name, "Component", "", "Processes", "Processes and packaging", "Processes and packaging", "", ...processesImpactsRow.slice(5)],
        [code, name, "Component", "", "Packaging", "Processes and packaging", "Processes and packaging", "", ...packagingImpactsRow.slice(5)],
        ...ingredientRows,
      ];
    })
    .filter((x): x is string[][] => x !== null)
    .flat(1);
