#!/usr/bin/env node
// Converts a list of RPC parameters (currently origin, share, waste) to its
// JSON representation.
//
// Input:
//
// 1) path to csv-file
//
// Output (stdout):
//
// { data: { [rpcCode]: {
//    [origin]: { [share, waste] as [number, number] }
// }} } as JSON
//
// The idea is that this file then is combined with the env impacts sheet to
// create a net-env-impact sheet.

import { readCsv, roundToPrecision } from "./utils.mjs";

const DEBUG_INVALID_SUMS = false;
const DEBUG_PRETTY_PRINT = false;

function main(args) {
  if (args.length !== 1) {
    throw new Error("Expected exactly one argument:\n" + "\t- Path to CSV");
  }

  // Import CSV file. Slice(1) to drop header
  const recipesCsv = readCsv(args[0], ",", true).slice(1);

  // The CSV has each entry as a line. Even though they're probably sorted and
  // grouped together, we're not going to use that structure in this algorithm,
  // just to be sure.
  //
  // We will walk through each line, and successively build an object with the
  // desired shape (see header of this file).
  //
  // If we meet the same (code, origin) pair twice, we will simply overwrite it.
  const structured = recipesCsv.reduce(
    (acc, [code, _name, origin, originShare, productionWaste]) => {
      // First time we see this RPC code? add an empty object.
      if (!(code in acc)) {
        acc[code] = {};
      }

      acc[code][origin] = [
        roundToPrecision(parseFloat(originShare)),
        roundToPrecision(parseFloat(productionWaste)),
      ];

      // Pass the acc along.
      return acc;
    },
    {}
  );

  // Check if sums add up to something else than 100
  let hasInvalidSums = false;
  if (DEBUG_INVALID_SUMS) {
    Object.keys(structured).forEach((code) => {
      const sum = Object.values(structured[code])
        .map((factors) => factors[0])
        .reduce((a, b) => a + b, 0);

      if (Math.abs(1 - sum) > 0.002) {
        console.log(code, sum);
        hasInvalidSums = true;
      }
    });
  }

  if (hasInvalidSums) {
    throw new Error("Invalid sums detected, see above logs.");
  }

  const indentation = DEBUG_PRETTY_PRINT ? 2 : 0;
  console.log(JSON.stringify({ data: structured }, null, indentation));
}

main(process.argv.slice(2));
