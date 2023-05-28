#!/usr/bin/env node
/**
 * Converts a csv with energy demands to json
 *
 * Input:
 * Facet Code,Process,Energy Consumption,Note,Electricity,Heating oil,Natural gas,Other fossil energy sources,Bark and chips,Pellets and briquettes,Other renewable energy sources,Diesel fuel,District heating
 *
 * Output:
 * {
 *   [process]: number[]
 * } as JSON
 *
 * Usage:
 *
 *  node processes-energy-demand-csv-json.mjs "./processes-energy-demand.csv" >
 *    ../../src/data/processes-energy-demand.json
 */

import { readCsv } from "../utils.mjs";

function main(args) {
  const csv = readCsv(args[0], ",", true).slice(1); // Drop Header

  const results = Object.fromEntries(
    csv.map(([code, _processName, _totalEnergy, _note, ...demandsStrs]) => {
      // Covnert from strings to numbers
      const demands = demandsStrs.map((x) => {
        const val = Number.parseFloat(x) || 0;
        return Number.isNaN(x) ? 0 : val;
      });
      return [code, demands];
    })
  );

  console.log(JSON.stringify(results, null, 0));
}

main(process.argv.slice(2));
