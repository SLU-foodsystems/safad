#!/usr/bin/env node
/**
 * Converts a csv with GHG-factors (per kg) of transport between countries to a
 * json file.
 *
 * Input:
 * Production_country_code,Production_country,Consumption_country_code,Consumption_country,CO2e,CO2,CH4_fossil,N2O
 *
 * Output:
 * {
 *   [Consumption_country]: { [Production_country]: [co2e, CO2, CH4, N2O]},
 * } as JSON
 *
 * Usage:
 *
 *  node transport-ghg-factors-csv-to-json.mjs "./transport-ghg-factors.csv" >
 *    ../../src/data/transport-ghg-factors.json
 */

import { readCsv } from "../utils.mjs";

function main(args) {
  const csv = readCsv(args[0], ",").slice(4); // Drop Headers

  const results = {};

  csv
    .map((row) => row.map((x) => x.trim())) // Trim all fields
    .forEach(
      ([
        _prodCountryCode,
        productionCountry,
        _consumptionCountryCode,
        consumptionCountry,
        ...ghgsStrs
      ]) => {
        // Convert all GHG factors to numbers, falling back to 0 if missing
        const ghgs = ghgsStrs
          .map((x) => (x ? parseFloat(x) : 0))
          .map((x) => (Number.isNaN(x) ? 0 : x));

        if (!(consumptionCountry in results)) {
          results[consumptionCountry] = {};
        }
        results[consumptionCountry][productionCountry] = ghgs;
      }
    );

  console.log(JSON.stringify(results, null, 0));
}

main(process.argv.slice(2));
