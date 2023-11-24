/**
 * Computes the impacts of each RPC in the recipe.
 */

import ResultsEngine from "@/lib/ResultsEngine";
import { LL_COUNTRY_CODES } from "../constants";
import * as DefaultInputFiles from "../default-input-files";
import { labeledImpacts, DETAILED_RESULTS_HEADER } from "../impacts-csv-utils";
import { stringifyCsvData } from "@/lib/utils";

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

export default async function computeFootprintsForEachRpcWithOrigin(): Promise<
  string[][]
> {
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

    const impactsCsv = stringifyCsvData(
      RE.computeImpactsOfRecipe()
        .map(([code, amount, impacts]) =>
          impacts === null ? null : labeledImpacts(code, amount, impacts)
        )
        .filter((x): x is string[] => x !== null)
    );

    return [countryName, DETAILED_RESULTS_HEADER.join(",") + "\n" + impactsCsv];
  });

  return results;
}
