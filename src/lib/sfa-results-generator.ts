import type ResultsEngine from "@/lib/ResultsEngine.ts";
import { computeProcessImpacts } from "@/lib/process-emissions";
import {
  AGGREGATE_HEADERS,
  aggregateImpacts,
  labeledImpacts,
} from "@/lib/impacts-csv-utils";
import { parseCsvFile } from "./utils";

export const SFA_RESULTS_HEADER = [
  "SFA Code",
  "SFA Name",
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

function parseSfaFoodExTranslationFile(csvString: string) {
  const mappings: Record<string, string> = {};
  parseCsvFile(csvString)
    .slice(1)
    .forEach(([fe1Code, _fe1Name, fe2CodeA, fe2CodeB]) => {
      if (fe1Code === "-" || !fe2CodeA) return;
      // @ts-ignore-next-line
      mappings[fe2CodeA] = fe1Code;
      // some rows have a second column of codes as well.
      if (fe2CodeB) {
        // @ts-ignore-next-line
        mappings[fe2CodeB] = fe1Code;
      }
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

  // Compte the env. impacts of the additional, SFA processes. This is
  // a bit hacky, as we're reaching into the RE for its
  // processEnvFactors. Sorry about that :)
  const sfaProcessesImpacts = computeProcessImpacts(
    { foo: processAmounts },
    RE.processEnvFactors!
  ).foo;

  // The key "A.00" does not matter - that information is not used,
  // but it's needed for the structure (i.e. { [string]: impacts })
  Object.assign(impactsCopy, { "A.00": sfaProcessesImpacts });
  return impactsCopy;
};

export async function generateSfaResults(
  sfaRecipeData: SfaRecipeComponent[],
  RE: ResultsEngine,
  efsaNames: Record<string, string>
): Promise<string[][]> {
  const foodEx2ToFoodEx1Matchings = parseSfaFoodExTranslationFile(
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

  // First, we group all data by the SFA code in the 'results' object:
  //
  // { [sfaCode]: [name, foodex1Code, process, grossShare, netShare][] }
  //
  sfaRecipeData.forEach(
    ({ sfaCode, sfaName, foodEx2Code, process, grossShare, netShare }) => {
      if (!results[sfaCode]) {
        results[sfaCode] = [];
      }

      results[sfaCode].push([
        sfaName,
        foodEx2ToFoodEx1Matchings[foodEx2Code] || "",
        process,
        grossShare,
        netShare,
      ]);
    }
  );

  // Then, we build the rows containing the sfa footprints from the results-obj.
  const rows: (string[][] | null)[] = Object.entries(results).map(
    ([sfaCode, ingredients]) => {
      const BASE_AMOUNT = 1000; // grams, = 1 kg

      // First, compute the impact of each diet element seperately
      const ingredientRows = ingredients
        .map(([sfaName, code, process, grossShare, netShare]) => {
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
            labeledImpacts(code, netAmount, impacts, efsaNames);

          return [
            sfaCode,
            sfaName,
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
        ingredients.map(([_sfaName, code, _process, _grossShare, netShare]) => [
          code,
          netShare * BASE_AMOUNT,
        ])
      );
      if (totalImpacts === null) return null;

      // Collect all SFA-level processes, which we will add on top of what was
      // found in the recipes
      const sfaProcesses: { [process: string]: number } = {};
      ingredients.forEach(
        ([_sfaName, _code, process, grossShare, _netShare]) => {
          if (!process) return;
          sfaProcesses[process] =
            (sfaProcesses[process] || 0) + grossShare * BASE_AMOUNT;
        }
      );

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
              addProcesses(totalProcessImpacts, sfaProcesses, RE),
              totalImpacts[2],
              totalImpacts[3]
            ).map((x) => x.toString());

      const sfaName = (ingredients[0] && ingredients[0][0]) ?? "";

      return [
        [
          sfaCode,
          sfaName,
          sfaCode,
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
