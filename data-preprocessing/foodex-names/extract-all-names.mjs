#!/usr/bin/env node

import { readCsv } from "../utils.mjs";

function main(args) {
  if (args.length !== 1) {
    throw new Error("Expected exactly one argument: path to csv.");
  }

  const csv = readCsv(args[0], ",").slice(1);

  const names = {};
  csv.forEach((row) => {
    for ( const level of [1, 2, 3, 4]) {
      const offset = 2 * (level - 1);
      names[row[0 + offset]] = row[1 + offset];
    }
  });

  console.log(JSON.stringify(names, null, 2));
}

main(process.argv.slice(2));
