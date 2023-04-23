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

import { readCsv } from "./utils.mjs";

const DEBUG_PRETTY_PRINT = false;

function main(args) {
  // Read csv file and drop header
  const csv = readCsv(args[0]).slice(1);

  const structured = csv.reduce(
    (acc, [code, _name, _level, origin, _originShare, ...impacts]) => {
      if (!(code in acc)) {
        acc[code] = {};
      }

      // TODO: Ensure correct length?
      acc[code][origin] = impacts;
      return acc;
    },
    {}
  );

  const indentation = DEBUG_PRETTY_PRINT ? 2 : 0;
  const jsonString = JSON.stringify({ data: structured }, null, indentation);
  console.log(jsonString);
}

main(process.argv.slice(2));
