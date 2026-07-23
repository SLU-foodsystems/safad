#!/usr/bin/env node
// Extracts all names from the full list of FoodEx recipes from the Recipes file
// (SAFAD IP Recipes.csv) to json of shape { [code]: name }
//
// Usage:
//  node ./extract-names.mjs "../src/default-input-files/SAFAD IP Recipes.csv" >
//      ../../src/data/rpc-names.json

import { readCsv } from "./utils.mjs";

function main(args) {
  if (args.length !== 1) {
    throw new Error(
      "Expected exactly one argument:\n" + "\t- Path to Recipes CSV\n"
    );
  }

  // Import csv and drop header
  const recipesCsv = readCsv(args[0], ",").slice(1);
  // Primary codes: Take the first two cols in each row: code and name
  const componentPairs = recipesCsv.map(([code, name]) => [code, name]);
  // Secondary codes: Take the code and name of the components (ingredients)
  const subcomponentPairs = recipesCsv.map(
    ([_code, _name, componentCode, componentName]) => [
      componentCode,
      componentName,
    ]
  );

  console.log(
    JSON.stringify(
      Object.fromEntries([...componentPairs, ...subcomponentPairs]),
      null,
      2
    )
  );
}

main(process.argv.slice(2));
