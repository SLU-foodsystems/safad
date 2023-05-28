#!/usr/bin/env node
// Extracts all names from the full list of FoodEx recipes from csv to json,
//
// Input:
//
// 1) path to recipes csv-file
//
// Output:
//
// { [code]: string }

import { readCsv  } from "../utils.mjs";

function main(args) {
  if (args.length !== 1) {
    throw new Error(
      "Expected exactly one argument:\n" + "\t- Path to Recipes CSV\n"
    );
  }

  // imopprt CSVs. Slice(1) to drop header
  const recipesCsv = readCsv(args[0], ",", true).slice(1);
  const pairs = recipesCsv.map(([code, name]) => [code, name]);

  console.log(JSON.stringify(Object.fromEntries(pairs), null, 2));
}

main(process.argv.slice(2));
