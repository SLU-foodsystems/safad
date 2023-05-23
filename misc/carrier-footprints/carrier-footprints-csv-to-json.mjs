#!/usr/bin/env node
/**
 * Converts a csv with footprints of energy types to a json file.
 * Note that Electricty is the only carrier which has country-specific
 * parameters
 *
 * Input:
 * Energy carrier,Country,CountryCode,Co2,ch4,n2o
 *
 * Output:
 * {
 *   Electricty: { [country]: [co2, ch4, n2o]}
 *   [carrier]: [co2, ch4, n2o],
 * } as JSON
 *
 * Usage:
 *
 *  node carrier-footsprints-csv-to-json.mjs "./carrier-footprints.csv" >
 *    ../../src/data/carrier-footprints.json
 */

import { readCsv } from "../utils.mjs";

function main(args) {
  const csv = readCsv(args[0], ",", true).slice(1); // Drop Header

  const results = {
    Electricity: {},
  };

  csv.forEach(([carrier, country, _countryCode, ...footprintsStr]) => {
    const footprints = footprintsStr.map((x) => (x ? parseFloat(x) : 0));
    if (carrier === "Electricity") {
      results[carrier][country] = footprints;
    } else {
      results[carrier] = footprints;
    }
  });

  console.log(JSON.stringify( results, null, 0));
}

main(process.argv.slice(2));
