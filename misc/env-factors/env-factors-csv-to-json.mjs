#!/usr/bin/env node
/**
 * Convert a csv file of environmental impacts to its JSON format.
 *
 * Input: path to csv-file.
 * Output: JSON
 *
 * Usage:
 *  node <path-to-this-file>.mjs ./data/env-impacts.csv > out.json
 */

import { readCsv } from "../utils.mjs";

const DEBUG_PRETTY_PRINT = false;

function main(args) {
  const [envFactorsCsvPath] = args;
  if (!envFactorsCsvPath) {
    throw new Error("Missing path to env factors file.")
  }

  // Read csv file and drop header
  const envFactorsCsv = readCsv(envFactorsCsvPath, ",").slice(1);

  const structured = envFactorsCsv.reduce(
    (acc, [_i, code, _name, _category, originName, _originCode, ...impactsStr]) => {
      if (!(code in acc)) {
        acc[code] = {};
      }

      if (originName.toLowerCase().trim() === "Rest of world") {
        originName = "RoW";
      }

      // TODO: Ensure correct length?
      acc[code][originName] = impactsStr.map((x) => {
        const val = parseFloat(x);
        return Number.isNaN(val) ? 0 : val;
      });
      return acc;
    },
    {}
  );

  const indentation = DEBUG_PRETTY_PRINT ? 2 : 0;
  const jsonString = JSON.stringify({ data: structured }, null, indentation);
  console.log(jsonString);
}

main(process.argv.slice(2));
