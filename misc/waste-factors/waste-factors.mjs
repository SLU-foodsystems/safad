#!/usr/bin/env node
/**
 * Parse a csv with retail and consumer wastes into a JSON object.
 *
 * Takes on argument, and that is the path to the csv file.
 */


import { readCsv } from "../utils.mjs";

function main(args) {
  const wasteCsv = readCsv(args[0], ",");

  /** @type Object.<string, Object.<string, [number, number]>> */
  const results = {};
  wasteCsv.forEach(([foodCode, _foodName, countryName, _countryCode, retailWaste, consumerWaste]) => {
    if (!results[countryName]) results[countryName] = {};
    const wastes = [retailWaste, consumerWaste].map(x => {
      const parsed = parseFloat(x)
      const number = Number.isNaN(parsed) ? 0 : parsed;
      return Math.max(0, number); // Ensure non-negative wastes
    });
    results[countryName][foodCode] = wastes;
  });

  console.log(JSON.stringify(results, null, 0));
}

main(process.argv.slice(2));
