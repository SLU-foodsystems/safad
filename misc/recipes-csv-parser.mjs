// Converts the full list of FoodEx recipes from csv to json,
// including yields from processes.
//
// Input:
//
// 1) path to recipes csv-file
// 2) path to processes csv-file
//
// Output:
//
// { data: { [code]: { [component]: ratio as number }} } as JSON
//
// Modifications include:
// - Remove any self-references.
// - Remove any empty objects

import { readCsv, roundToPrecision } from "./utils.mjs";

const DEBUG_INVALID_SUMS = false;
const DEBUG_REMOVED_ITEMS = false;

/**
 * Remove any self-references with a null-process
 */
function removeNullSelfReferences(obj) {
  Object.entries(obj).forEach(([id, values]) => {
    const _nBefore = obj[id].length;

    obj[id] = obj[id].filter(
      ([foodCode, process]) => foodCode !== id || process !== ""
    );

    const itemsWereRemoved = _nBefore !== obj[id].length;
    if (DEBUG_REMOVED_ITEMS && itemsWereRemoved) {
      const fixedWidth = (str, len) =>
        str + (str.length >= len ? "" : " ".repeat(len - id.length));
      console.log(
        fixedWidth(id, 15),
        "\t",
        values.map((t) => t.slice(1).join("\t")).join("\n")
      );

      obj[id] = obj[id].filter((el) => !isSelfReference(el));
    }
  });

  // console.log(nonFullYields.join("\n"))
}

/**
 * Precautionary: Delete any empty rulesets.
 */
function deleteEmptyValues(obj) {
  Object.entries(obj).forEach(([id, values]) => {
    const nSubComponents = values.length;
    if (nSubComponents === 0) delete obj[id];
  });
}

function buildYieldMap(processesCsv) {
  const yieldMap = {};

  processesCsv
    .map(
      ([
        code,
        _foodName,
        _foodEx2Code,
        _foodEx2Name,
        facets,
        _facetDesc,
        yieldFactorStr,
      ]) => [code, facets, parseFloat(yieldFactorStr)]
    )
    .forEach(([code, facets, yieldFactor]) => {
      const key = code + "|" + facets;
      yieldMap[key] = yieldFactor;
    });

  return yieldMap;
}

function main(args) {
  if (args.length !== 2) {
    throw new Error(
      "Expected exactly two arguments:\n" +
        "\t- Path to Recipes CSV\n" +
        "\t- Path to Processes CSV\n"
    );
  }

  // imopprt CSVs. Slice(1) to drop header
  const recipesCsv = readCsv(args[0], ",", true).slice(1);
  // For unknown reasons, the 'smart' split doesn't work for the recipes, but it
  // does for the processes. Conveniently, it's not needed for the recipes, but
  // it is for the processes.
  const processesCsv = readCsv(args[1], ",", false).slice(1);

  const yieldMap = buildYieldMap(processesCsv);
  const recipes = {};

  recipesCsv.forEach(([code, component, facetStr, perc, prob]) => {
    // TODO: may be a better / data-structure to store entries, rather than
    // the complete object (i.e. { code: [component, ratio][] })
    const value = roundToPrecision(parseFloat(perc) * parseFloat(prob) / 100, 3);

    if (value === 0) return;

    // Note to self: I've checked that all missing values here are of the facet
    // "To be further disaggregated (d)", which is why we can just assume a 1
    const yieldFactor = yieldMap[component + "|" + facetStr] || 1;

    const PROCESS_UNSPECIFIED = "F28.A07XD";
    const processes = facetStr
      .split("$")
      .filter((f) => f.startsWith("F28.") && f !== PROCESS_UNSPECIFIED);

    const entry = [component, processes, value, yieldFactor];

    if (code in recipes) {
      recipes[code].push(entry);
    } else {
      recipes[code] = [entry];
    }
  });

  // Check if sums add up to something else than 100
  if (DEBUG_INVALID_SUMS) {
    Object.keys(recipes).forEach((code) => {
      const sum = recipes[code]
        .map((triplet) => triplet[2])
        .reduce((a, b) => a + b, 0);

      if (Math.abs(1 - sum) > 0.002) console.log(code, sum);
    });
  }

  removeNullSelfReferences(recipes);
  deleteEmptyValues(recipes);

  // Log aliases
  // console.log(Object.entries(recipes).filter(([id]) => recipes[id].length === 1).map(x => x[1]))

  if (!DEBUG_REMOVED_ITEMS && !DEBUG_INVALID_SUMS) {
    console.log(JSON.stringify({ data: recipes }));
  }
}

main(process.argv.slice(2));
