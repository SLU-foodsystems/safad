import type ResultsEngine from "@/lib/ResultsEngine.ts";
import { computeProcessImpacts } from "@/lib/process-emissions";
import {
  AGGREGATE_HEADERS,
  aggregateImpacts,
  labeledImpacts,
} from "@/lib/impacts-csv-utils";
import { parseCsvFile } from "./utils";

export const SLV_RESULTS_HEADER = [
  "SLV Code",
  "SLV Name",
  "Ingredient Code",
  "Ingredient Name",
  "L1 Name",
  "L2 Name",
  "Gross Amount (g)",
  "Net Amount (g)",
  ...AGGREGATE_HEADERS,
  "Processes",
  "Packaging",
];

import foodexTranslationTableUrl from "@/data/foodex-code-translations.csv?url";

function parseSlvFoodExTranslationFile(csvString: string) {
  const mappings: Record<string, string> = {};
  parseCsvFile(csvString)
    .slice(1)
    .forEach(([fe1Code, _fe1Name, fe2CodeA, fe2CodeB]) => {
      if (fe1Code === "-" || !fe2CodeA) return;
      mappings[fe2CodeA] = fe1Code;
      // some rows have a second column of codes as well.
      if (fe2CodeB) mappings[fe2CodeB] = fe1Code;
    });

  return mappings;
}

const addProcesses = (
  processImpacts: NestedRecord<string, number[]>,
  processAmounts: Record<string, number>,
  RE: ResultsEngine
): NestedRecord<string, number[]> => {
  const hasProcesses = Object.keys(processAmounts).length > 0;
  if (!hasProcesses) return processImpacts;

  const impactsCopy = { ...processImpacts };

  // Compte the env. impacts of the additional, slv processes. This is
  // a bit hacky, as we're reaching into the RE for its
  // processEnvFactors. Sorry about that :)
  const slvProcessesImpacts = computeProcessImpacts(
    { foo: processAmounts },
    RE.processEnvFactors!
  ).foo;

  // The key "A.00" does not matter - that information is not used,
  // but it's needed for the structure (i.e. { [string]: impacts })
  Object.assign(impactsCopy, { "A.00": slvProcessesImpacts });
  return impactsCopy;
};

export async function generateSlvResults(
  slvRecipeData: SlvRecipeComponent[],
  RE: ResultsEngine
): Promise<string[][]> {
  const foodEx2ToFoodEx1Matchings = parseSlvFoodExTranslationFile(
    await fetch(foodexTranslationTableUrl).then((res) => {
      if (!res.ok) {
        console.error("File not found for foodex code translation table.");
        throw new Error(res.statusText);
      }
      return res.text();
    })
  );

  const results: Record<string, [string, string, string, number, number][]> =
    {};

  // First, we group all data by the SLV code, i.e. slv and then ingredients
  slvRecipeData.forEach(
    ({ slvCode, slvName, foodEx2Code, process, grossShare, netShare }) => {
      if (!results[slvCode]) {
        results[slvCode] = [];
      }

      results[slvCode].push([
        slvName,
        foodEx2ToFoodEx1Matchings[foodEx2Code],
        process,
        grossShare,
        netShare,
      ]);
    }
  );

  const rows: (string[][] | null)[] = Object.entries(results).map(
    ([slvCode, ingredients]) => {
      const BASE_AMOUNT = 1000; // grams, = 1 kg

      // Collect all slv-level processes
      const slvProcesses: { [process: string]: number } = {};
      ingredients.forEach(
        ([_slvName, _code, process, grossShare, _netShare]) => {
          if (!process) return;
          slvProcesses[process] =
            (slvProcesses[process] || 0) + grossShare * BASE_AMOUNT;
        }
      );

      // Now, compute the impact of each diet element seperately
      const ingredientRows = ingredients
        .map(([slvName, code, process, grossShare, netShare]) => {
          const grossAmount = grossShare * BASE_AMOUNT;
          const netAmount = netShare * BASE_AMOUNT;
          const impacts = RE.computeImpacts([[code, netAmount]]);

          if (impacts === null) return null;

          // Replace the process-impacts with one with our extra processes
          impacts[1] = addProcesses(
            impacts[1],
            process ? { [process]: grossAmount } : {},
            RE
          );

          const [_code, name, l1Name, l2Name, _netAmount, ...impactsVector] =
            labeledImpacts(code, netAmount, impacts);

          return [
            slvCode,
            slvName,
            code,
            name,
            l1Name,
            l2Name,
            grossAmount.toFixed(2),
            netAmount.toFixed(2),
            ...impactsVector,
          ];
        })
        .filter((x): x is string[] => x !== null);

      // And, for good measure, we compute the total impacts as well: the sum of
      // the disaggregate items
      const totalImpacts = RE.computeImpacts(
        ingredients.map(([_slvName, code, _process, _grossShare, netShare]) => [
          code,
          netShare * BASE_AMOUNT,
        ])
      );
      if (totalImpacts === null) return null;

      const rpcImpacts = totalImpacts[0];
      let totalProcessImpacts = totalImpacts[1];

      const missingRpcImpacts = Object.entries(rpcImpacts).filter(
        (kv) => kv[1] === null
      );

      const totalImpactsVector: string[] =
        missingRpcImpacts.length > 0
          ? AGGREGATE_HEADERS.map((_) => "NA")
          : aggregateImpacts(
              totalImpacts[0] as Record<string, number[]>,
              addProcesses(totalProcessImpacts, slvProcesses, RE),
              totalImpacts[2],
              totalImpacts[3]
            ).map((x) => x.toString());

      const slvName = ingredients[0][0];

      return [
        [
          slvCode,
          slvName,
          slvCode,
          "(total)",
          "",
          "",
          "1000",
          "1000",
          ...totalImpactsVector,
          "",
          "",
        ],
        ...ingredientRows,
      ];
    }
  );

  return rows.filter((x): x is string[][] => x !== null).flat(1);
}
