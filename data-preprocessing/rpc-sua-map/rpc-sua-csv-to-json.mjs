#!/usr/bin/env node
/**
 * Takes a csv file mapping RPC-codes to a SUA codes.
 */

import { readCsv } from "../utils.mjs";

function main(args) {
  const csv = readCsv(args[0], ",").slice(1); // Slice to drop header

  const map = {};
  const handledFoodExCodes = new Set();

  csv.forEach(
    ([_foodCode, foodExCode, _foodExName, suaCode, _suaName]) => {
      if (handledFoodExCodes.has(foodExCode)) return;

      handledFoodExCodes.add(foodExCode);
      map[foodExCode] = (suaCode || "").trim();
    }
  );

  console.log(JSON.stringify(map, null, 0));
}

main(process.argv.slice(2));