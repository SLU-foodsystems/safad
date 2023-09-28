#!/usr/bin/env node
/**
 * Converts a csv with GHG-demands of energy types to a json file.
 * Note that Electricty is the only carrier which has country-specific
 * parameters
 *
 * Input:
 * Energy carrier,Country,CountryCode,Co2,ch4,n2o
 *
 * Output:
 * {
 *   Electricty: { [countryCode]: [co2, ch4, n2o]},
 *   [carrier]: [co2, ch4, n2o],
 * } as JSON
 *
 * Usage:
 *
 *  node carrier-ghg-factors-csv-to-json.mjs "./carrier-ghg-factors.csv" >
 *    ../../src/data/carrier-ghg-factors.json
 */

import { readCsv } from "../utils.mjs";

function main(args) {
  const csv = readCsv(args[0], ",").slice(1); // Drop Header

  const results = {
    Electricity: {},
  };

  csv
    .map((row) => row.map((x) => x.trim()))
    .forEach(([carrier, _country, countryCode, ...ghgsStrs]) => {
      const ghgs = ghgsStrs.map((x) => (x ? parseFloat(x) : 0));
      if (carrier === "Electricity") {
        results[carrier][countryCode] = ghgs;
      } else {
        results[carrier] = ghgs;
      }
    });

  console.log(JSON.stringify(results, null, 0));
}

main(process.argv.slice(2));
