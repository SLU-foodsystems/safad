//@ts-check

import { asCsvString, readCsv } from "../utils.mjs";

const ZERO_TOLERANCE = 0.01;

const CODES_TO_EXCLUDE = [
  "A.02.07.009", // Palm hearts
  "A.05.05.002", // Palm nuts (palmoil kernels)
  "A.05.05.003", // Palmfruit (Elaeis guineensis)
];

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
  if (args.length < 2) {
    throw new Error("Script expects two argument: <old-file> <new-file>:\n\n");
  }

  const [oldFilePath, newFilePath] = args;

  const oldFile = readCsv(oldFilePath).slice(1);
  const [HEADER, ...newFile] = readCsv(newFilePath);

  const relevantCodes = identifyInvalidSums(oldFile);
  CODES_TO_EXCLUDE.forEach((c) => relevantCodes.delete(c));

  const csv = asCsvString(
    [HEADER, ...newFile.filter((row) => relevantCodes.has(row[0]))],
    {
      NEWLINE: "\n",
      withBOM: false, // already part of the HEADER
    }
  );
  console.log(csv);
}

main(process.argv.slice(2));
