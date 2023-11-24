/**
 * Merges the two recipe files from the original EFSA recipes, table 4 and 5,
 * into a single, consolidated file.
 */
import { readCsv } from "./utils.mjs";

function buildProcessesDataMap(processesCsv) {
  const map = {};

  processesCsv
    .map(
      ([
        code,
        _foodName,
        _foodEx2Code,
        _foodEx2Name,
        facets,
        facetDesc,
        yieldFactorStr,
        allocationFactorStr,
      ]) => [
        code,
        facets,
        facetDesc,
        parseFloat(yieldFactorStr),
        parseFloat(allocationFactorStr),
      ]
    )
    .forEach(([code, facets, facetDesc, yieldFactor, allocationFactor]) => {
      // Overwrite allocation factor for this specific process
      const PROCESS_UNSPECIFIED = "F28.A07XD";
      if (facets === PROCESS_UNSPECIFIED) allocationFactor = 1;
      const key = code + "|" + facets;
      map[key] = { yieldFactor, allocationFactor, facetDesc };
    });

  return map;
}

function main(args) {
  const [recipesFilePath, processesFilePath] = args;

  const recipesCsv = readCsv(recipesFilePath).slice(1);
  const processesCsv = readCsv(processesFilePath).slice(1);

  const yieldMap = buildProcessesDataMap(processesCsv);

  const merged = recipesCsv.map(
    ([code, name, component, componentName, facetCodes, perc, prob]) => {
      if (code === "") return; // Empty row

      const processesData = yieldMap[component + "|" + facetCodes] || {};
      const yieldFactor = processesData.yieldFactor || 1;
      const allocationFactor  = processesData.allocationFactor || 1;
      const facetDesc = processesData.facetDesc || "";

      return [
        code,
        name,
        component,
        componentName,
        facetCodes,
        facetDesc,
        perc,
        prob,
        yieldFactor,
        allocationFactor,
      ].map((x) => `"${x}"`);
    }
  );

  const HEADER = [
    "Food code",
    "Food name",
    "Component code",
    "Component name",
    "Facet(s) code",
    "Facet(s) Description",
    "Percentage",
    "Probability",
    "Reverse Yield Factor",
    "Allocation Factor",
  ].join(",");
  console.log(HEADER + "\n" + merged.map((row) => row.join(",")).join("\n"));
}

main(process.argv.slice(2));
