#!/usr/bin/env node

import { readCsv } from "../utils.mjs";

function main(args) {
  if (args.length !== 2) {
    throw new Error("Expected exactly two arguments: path to csv, and level.")
  }

  const [csvPath, levelStr] = args;
  const csv = readCsv(csvPath, ',').slice(1);

  const level = Number.parseInt(levelStr, 10);
  const offset = 2 * (level - 1);

  const pairs = csv.map(row => {
    return [row[0 + offset], row[1 + offset]];
  });

  const obj = Object.fromEntries(pairs);

  console.log(JSON.stringify(obj, null, 2));
}

main(process.argv.slice(2));
