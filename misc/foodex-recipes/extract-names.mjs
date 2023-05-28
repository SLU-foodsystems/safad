#!/usr/bin/env node
// Extracts all names from the full list of FoodEx recipes from csv to json,
//
// Usage:
//  node ./extract-names.mjs ./foodex-recipes.csv > ../../src/data/rpc-names.json

import { readCsv  } from "../utils.mjs";

function main(args) {
  if (args.length !== 1) {
    throw new Error(
      "Expected exactly one argument:\n" + "\t- Path to Recipes CSV\n"
    );
  }

  // imopprt CSVs. Slice(1) to drop header
  const recipesCsv = readCsv(args[0], ",").slice(1);
  const componentPairs = recipesCsv.map(([code, name]) => [code, name]);
  const subcomponentPairs = recipesCsv.map(([_code, _name, componentCode, componentName]) => [componentCode, componentName]);

  console.log(JSON.stringify(Object.fromEntries([...componentPairs, ...subcomponentPairs]), null, 2));
}

main(process.argv.slice(2));
