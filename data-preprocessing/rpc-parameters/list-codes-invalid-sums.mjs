//@ts-check

import { readCsv } from "../utils.mjs";

const ZERO_TOLERANCE = 0.01;

/**
 * @param {string[][]} rows
 * @returns {Set<string>}
 */
function identifyInvalidSums(rows) {
  const shares = {};

  rows.forEach((row) => {
    const code = row[0];
    const share = parseFloat(row[4]);
    shares[code] = (shares[code] || 0) + share;
  });

  return new Set(
    Object.entries(shares)
      .filter(([_k, v]) => Math.abs(v - 1) > ZERO_TOLERANCE)
      .map(([code]) => code)
  );
}

/**
 * Main function
 *
 * @param {string[]} args
 */
function main(args) {
  if (args.length < 1) {
    throw new Error("Script expects one argument: <filepath>:\n\n");
  }

  const oldFile = readCsv(args[0]).slice(1);
  const relevantCodes = identifyInvalidSums(oldFile);

  console.log([...relevantCodes].join("\n"));
}

main(process.argv.slice(2));
