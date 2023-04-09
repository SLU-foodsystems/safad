/**
 * Combine a Sua -> FoodEx2.2 mapping, with a Sua -> environmental factors, to
 * produce a FoodEx2.2 -> env mapping.
 *
 * Input: csv-files.
 * Output: JSON
 *
 * Usage:
 *  node <path-to-this-file>.mjs \
 *    ./path-to-sua2foodex.csv ./path-to-sua2env.csv > out.json
 */

import { readCsv } from "./utils.mjs";

function main(args) {
  // Read csv files, and drop headers
  // Format: FoodEx,SuaId
  const suaFoodExCsv = readCsv(args[0]).slice(1);
  // Format: SuaId,...factors
  const suaEnvCsv = readCsv(args[1]).slice(1);

  const suaFoodExMap = new Map(suaFoodExCsv);
  const results = Object.fromEntries(
    suaEnvCsv.map((suaId, ...envFactors) => [
      suaFoodExMap.get(suaId),
      envFactors,
    ])
  );

  const jsonString = JSON.stringify(results, null, 2);
  console.log(jsonString);
  return 0;
}

main(process.argv.slice(2));
