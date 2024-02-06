/**
 * Computes the footprints of each rpc in the recipe.
 */

import { uniq } from "@/lib/utils";
import { expandedImpacts, AGGREGATE_HEADERS } from "@/lib/impacts-csv-utils";
import * as DefaultInputFiles from "@/lib/default-input-files";
import ResultsEngine from "@/lib/ResultsEngine";
import {
  ENV_IMPACTS_ZERO,
  LL_COUNTRY_CODES,
  TRANSPORT_EMISSIONS_ZERO,
} from "@/lib/constants";
import { configureResultsEngine } from "@/lib/default-input-files";

import { categoryNames } from "../efsa-names";

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

const LL_COUNTRIES: LlCountryName[] = [
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

export async function computeFootprintsForDiets(): Promise<
  [string, string[][]][]
> {
  const RE = new ResultsEngine();

  const diets: Record<LlCountryName, Diet> = {
    France: await DefaultInputFiles.parsed.diet("France"),
    Germany: await DefaultInputFiles.parsed.diet("Germany"),
    Greece: await DefaultInputFiles.parsed.diet("Greece"),
    Hungary: await DefaultInputFiles.parsed.diet("Hungary"),
    Ireland: await DefaultInputFiles.parsed.diet("Ireland"),
    Italy: await DefaultInputFiles.parsed.diet("Italy"),
    Spain: await DefaultInputFiles.parsed.diet("Spain"),
    Sweden: await DefaultInputFiles.parsed.diet("Sweden"),
    SwedenBaseline: await DefaultInputFiles.parsed.diet("SwedenBaseline"),
  };

  const allResults = LL_COUNTRIES.map((countryName) => {
    const countryCode = LL_COUNTRY_CODES[countryName];
    if (countryName === "SwedenBaseline") {
      configureResultsEngine(RE, "SE");
    } else {
      configureResultsEngine(RE, countryCode);
    }

    const diet = diets[countryName];
    const results = RE.computeImpactsByCategory(diet);

    if (results === null) return null;
    const categories = uniq([
      ...Object.keys(results[0]),
      ...Object.keys(results[1]),
    ]).sort();

    const data = categories.map((categoryId) => {
      const [rpcImpacts, processImpacts, packagingImpacts, transportImpacts] =
        results.map((x) => x[categoryId]);

      const footprints = expandedImpacts(
        rpcImpacts || ENV_IMPACTS_ZERO,
        processImpacts || [0, 0, 0],
        packagingImpacts || [0, 0],
        transportImpacts || TRANSPORT_EMISSIONS_ZERO
      );

      return [categoryId, `"${categoryNames[categoryId]}"`, ...footprints];
    });

    return [countryName, data] as [string, string[][]];
  }).filter((x): x is [string, string[][]] => x !== null);

  return allResults;
}

export default async function computeFootprintsForEachRpcWithOrigin(): Promise<
  string[][]
> {
  const HEADER = ["Category Code", "Category Name", ...AGGREGATE_HEADERS];
  return (await computeFootprintsForDiets()).map(([country, data]) => [
    country,
    HEADER + "\n" + data.map((row) => row.join(",")).join("\n"),
  ]);
}
