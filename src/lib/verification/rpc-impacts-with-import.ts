/**
 * Computes the impacts of each RPC in the recipe.
 */

import {
  getRpcCodeSubset,
  listAllProcesses,
  maybeQuoteValue,
} from "@/lib/utils";
import { AGGREGATE_HEADERS, aggregateImpacts } from "@/lib/impacts-csv-utils";

import categoryNamesJson from "@/data/category-names.json";
import namesJson from "@/data/rpc-names.json";

import ResultsEngine from "@/lib/ResultsEngine";
import { LL_COUNTRY_CODES } from "../constants";
import * as DefaultInputFiles from "../default-input-files";

type LlCountryName =
  | "France"
  | "Germany"
  | "Greece"
  | "Hungary"
  | "Ireland"
  | "Italy"
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

const categoryNames = categoryNamesJson as Record<string, string>;
const getCategoryName = (code: string, level: number) => {
  const levelCode = getRpcCodeSubset(code, level);
  return categoryNames[levelCode] || `NOT FOUND (${levelCode})`;
};

export default async function computeFootprintsForEachRpcWithOrigin(): Promise<
  string[][]
> {
  const foodsRecipes = await DefaultInputFiles.parsed.foodsRecipes();
  const codesInRecipes = new Set(Object.keys(foodsRecipes));
  Object.values(foodsRecipes).forEach((recipe: FoodsRecipeEntry) => {
    recipe.forEach((component) => {
      const code = component[0];
      codesInRecipes.add(code);
    });
  });

  const header = [
    "Code",
    "Name",
    "L1 Category",
    "L2 Category",
    "% Waste (Retail- and consumer)",
    ...AGGREGATE_HEADERS,
    "Processes",
    "Packeting",
  ];

  const names = namesJson as Record<string, string>;

  const RE = new ResultsEngine();

  const results = LL_COUNTRIES.map((countryName) => {
    if (countryName === "SwedenBaseline") {
      DefaultInputFiles.configureResultsEngine(RE, "SE");
    } else {
      DefaultInputFiles.configureResultsEngine(
        RE,
        LL_COUNTRY_CODES[countryName]
      );
    }

    const impactsPerDiet = [...codesInRecipes]
      .sort()
      .map((code) => {
        const impacts = RE.computeImpacts([[code, 1000]]);
        if (impacts === null) {
          return null;
        }
        const [
          rpcImpacts,
          processImpacts,
          packagingImpacts,
          transportEmissions,
        ] = impacts;
        const processes = listAllProcesses(processImpacts).join("$");
        const packeting = listAllProcesses(packagingImpacts).join("$");

        return [
          code,
          maybeQuoteValue(names[code] || "NAME NOT FOUND"),
          maybeQuoteValue(getCategoryName(code, 1)),
          maybeQuoteValue(getCategoryName(code, 2)),
          "TODO",
          ...aggregateImpacts(
            rpcImpacts,
            processImpacts,
            packagingImpacts,
            transportEmissions
          ),
          processes,
          packeting,
        ];
      })
      .filter((x): x is string[] => x !== null);

    const impactsCsv = impactsPerDiet.map((row) => row.join(",")).join("\n");

    return [countryName, header.join(",") + "\n" + impactsCsv];
  });

  return results;
}
