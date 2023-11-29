/**
 * Computes the footprints of each rpc in the recipe.
 */

import reduceDiet from "@/lib/rpc-reducer";
import * as DefaultInputFiles from "@/lib/default-input-files";
import {getDietBreakdown} from "@/lib/impacts-csv-utils";

type LlCountryName =
  | "France"
  | "Germany"
  | "Greece"
  | "Hungary"
  | "Ireland"
  | "Italy"
  | "Poland"
  | "Spain"
  | "Sweden"
  | "SwedenBaseline";

let LL_COUNTRIES: LlCountryName[] = [
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Spain",
  "Sweden",
  "SwedenBaseline",
];

export default async function computeFootprintsForEachRpcWithOrigin(): Promise<
  string[][]
> {
  const HEADER = [
    "Code",
    "Name",
    "Amount",
    "Breaks down into code",
    "Name",
    "Amount",
  ];

  const dietFiles = {
    France: await DefaultInputFiles.parsed.diet("FR"),
    Germany: await DefaultInputFiles.parsed.diet("DE"),
    Greece: await DefaultInputFiles.parsed.diet("GR"),
    Hungary: await DefaultInputFiles.parsed.diet("HU"),
    Ireland: await DefaultInputFiles.parsed.diet("IE"),
    Italy: await DefaultInputFiles.parsed.diet("IT"),
    Spain: await DefaultInputFiles.parsed.diet("ES"),
    Sweden: await DefaultInputFiles.parsed.diet("SE"),
    SwedenBaseline: await DefaultInputFiles.parsed.diet("SE-B"),
  } as Record<string, Diet>;

  const processesAndPackagingCsvData =
    await DefaultInputFiles.parsed.preparationProcessesAndPackaging();

  const recipes = await DefaultInputFiles.parsed.foodsRecipes();

  const allResults = LL_COUNTRIES.map((country) => {
    const subDietRows= getDietBreakdown(dietFiles[country]
      .map(([code, amount]): [string, number, Diet] => [
        code,
        amount,
        reduceDiet([[code, amount]], recipes, processesAndPackagingCsvData)[0],
      ]))

    const csv = subDietRows.map(row => row.join(",")).join("\n");
    return [country, HEADER.join(",") + "\n" + csv];
  });

  return allResults;
}
