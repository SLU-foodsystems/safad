/**
 * Convert a csv file with a specific format to a JSON
 * from:
 *
 *  Item code (CPC)
 *  Food Balance Sheets (FBS) food categories [2]
 *  Country of origin
 *  Market share
 *  Data source
 *  Climate impact, kg CO2e/kg
 *  Carbon dioxide, kg CO2/kg
 *  Methane, kg CH4/kg
 *  Nitrous oxide, kg N2O/kg
 *  kg HCFs/kg
 *  Cropland use, m2/kg
 *  Nitrogen application, kg N/kg
 *  Phosphorus application, kg P/kg
 *  Freshwater use, m3/kg
 *  Extinction rate, E/MSY/kg
 *
 * to:
 * {
 *   [fbsId]: {
 *     [country]: {
 *       [...envFactors]: number,
 *     }
 *   }
 * }
 *
 *
 * Expects the path to the csv file as parameter.
 */
import fs from "fs";

import { splitCsvRow } from "./utils.mjs";

const CSV_DELIM = ",";

function main(args) {
  const csvPath = args[2];
  const fileContent = fs.readFileSync(csvPath, { encoding: "utf8" });
  // Drop the header
  const [_, ...rows] = fileContent.split("\n");

  // Split all rows, and drop any empty ones.
  const matrix = rows
    .map((row) => splitCsvRow(row, CSV_DELIM))
    .filter((x) => x.length > 1);

  // Populate results[fbsId][country] = [...envFactors]
  const result = {};
  matrix.forEach((fields) => {
    const [fbs, _, country] = fields;
    const N_FACTORS = 10;
    const envFactors = fields.slice(5, 5 + N_FACTORS);

    if (!(fbs in result)) {
      result[fbs] = {};
    }

    result[fbs][country] = envFactors.map((stringValue) =>
      Number.parseFloat(stringValue)
    );
  });

  console.log(JSON.stringify(result, null, 2));
}

main(process.argv);
