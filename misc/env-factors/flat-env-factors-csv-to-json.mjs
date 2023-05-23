#!/usr/bin/env node
/**
 * Converts a csv with env factors to a simple json
 *
 * Input:
 * Index,Code,Name,Category,Country_name,Country_code,Carbon_Footprint,Carbon_Dioxide,Methane_fossil,Methane_bio,Nitrous_Oxide,HFC,Land,N_input,P_input,Water,Pesticides,Biodiversity,Ammonia,Labour,Animal_Welfare,Antibiotics
 *
 * Output:
 * {
 *   [code]: { [country]: number[] }
 * } as JSON
 *
 * Usage:
 *
 *  node flat-env-factors-csv-to-json.mjs "./all-rpcs.csv" >
 *    ../../src/data/env-factors-flat.json
 */

import { readCsv } from "../utils.mjs";

function main(args) {
  const results = {};

  readCsv(args[0], ";", true)
    .slice(1)
    .forEach(([_i, code, _name, _category, country, _countryCode, ...impactsStr]) => {
      // Covnert from strings to numbers
      const impacts = impactsStr.map((x) => {
        const val = Number.parseFloat(x) || 0;
        return Number.isNaN(x) ? 0 : val;
      });

      // console.log(code);

      if (!(code in results)) {
        results[code] = {};
      }

      results[code][country] = impacts;
    });

  console.log(JSON.stringify(results, null, 0));
}

main(process.argv.slice(2));
