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
// - Check for loops.

import { readCsv, roundToPrecision } from "./utils.mjs";

const DEBUG_INVALID_SUMS = false;

const concatenateSets = (...sets) =>
  new Set(sets.flatMap((set) => Array.from(set)));

/**
 * Remove any self-references. I am, however, not entirely sure I can do this,
 * as we then remove a process.
 */
function removeSelfReferences(obj) {
  Object.entries(obj).forEach(([id, values]) => {
    const hasSelfReference = values.find(tuple => tuple[0] === id);
    if (hasSelfReference) {
      obj[id] = obj[id].filter((el) => el[0] !== id);
    }
  });
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

/**
 * Check for loops using a recursive function that throws when a loop is found.
 */
const checkForLoops = (recipes, id) => {
  // Base case: No recipe found for the key. Return a unit-set with the id.
  if (!(id in recipes)) {
    return new Set([id]);
  }

  // Find the ids of all sub-components in the recipe
  const keys = recipes[id].map(x => x[0]);
  // If we have a self-reference, we can throw immediately.
  // Should never be the case, because of the above removeSelfReferences
  if (keys.includes(id)) {
    throw new Error("Key found in immediate child " + id);
  }

  // Recurse: Join all sub-sets, i.e. find all keys deeper in the hierarchy
  const recursedKeys = concatenateSets(
    keys.map((key) => checkForLoops(recipes, key))
  );
  if (recursedKeys.has(id)) {
    throw new Error("Key found in deeper recursion");
  }
  return new Set(recursedKeys);
};

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

  // TODO: Ignoring facet here.
  recipesCsv.forEach(([code, component, facet, perc, prob]) => {
    // TODO: may be a better / data-structure to store entries, rather than
    // the complete object (i.e. { code: [component, ratio][] })
    const value = roundToPrecision(parseFloat(perc) * parseFloat(prob), 3);

    if (value === 0) return;

    // Note to self: I've checked that all missing values here are of the facet
    // "To be further disaggregated (d)", which is why we can just assume a 1
    const yieldFactor = yieldMap[component + "|" + facet] || 1;
    if (facet === "To be further disaggregated (d)") {
      facet = "";
    }
    const entry = [component, facet, value, yieldFactor];

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

      if (Math.abs(100 - sum) > 0.2) console.log(code, sum);
    });
  }

  removeSelfReferences(recipes);
  deleteEmptyValues(recipes);

  // Log aliases
  // console.log(Object.entries(recipes).filter(([id]) => recipes[id].length === 1).map(x => x[1]))

  // Ensure that there are no loops.
  Object.keys(recipes).forEach(id => checkForLoops(recipes, id))

  console.log(JSON.stringify({ data: recipes }));
}

main(process.argv.slice(2));
