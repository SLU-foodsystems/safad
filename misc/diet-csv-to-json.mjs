/**
 * Convert a csv file with a specific format to a JSON
 * from:
 *
 *   suaId, fbsId, amount, production waste, retail waste, consumption waste,
 *      techn. impr. factor, origin
 *
 * to:
 *
 * {
 *  origin: { [fbsId]: { [country: string]: percentage } };
 *  factors: { [fbsId]: { [{production,consumption,retail}Waste]: number } }
 *  amount: { [suaId]: number }
 * }
 *
 * Expects the path to the csv file as parameter.
 */
import fs from "fs";

const CSV_DELIM = ",";
const EXPECTED_LENGTH = 9;

const toFixedFloat = (str) => Math.round(parseFloat(str) * 100) / 100;

function main(args) {
  const csvPath = args[2];
  const fileContent = fs.readFileSync(csvPath, { encoding: "utf8" });
  // Drop the header
  const [_, ...rows] = fileContent.split("\n");

  const matrix = rows
    .map((row) => row.split(CSV_DELIM))
    .filter((x) => x.length > 1);

  const firstInvalidLengthRow = matrix.findIndex(
    (row) => row.length !== EXPECTED_LENGTH
  );
  if (firstInvalidLengthRow !== -1) {
    const len = matrix[firstInvalidLengthRow].length;
    throw new Error(
      `Invalid row length found, row ${firstInvalidLengthRow} (len=${len})\n\t${rows[firstInvalidLengthRow]}`
    );
  }

  const result = {
    amount: {},
    factors: {},
    origin: {},
    organic: {},
  };

  matrix.forEach((fields) => {
    const [
      suaId,
      fbsId,
      amount,
      organic,
      productionWaste,
      retailWaste,
      consumerWaste,
      technicalImprovement,
      originStr,
    ] = fields;

    result.amount[suaId] = toFixedFloat(amount);
    result.organic[suaId] = toFixedFloat(organic);

    if (!productionWaste) return;

    result.factors[fbsId] = {
      productionWaste: toFixedFloat(productionWaste),
      retailWaste: toFixedFloat(retailWaste),
      consumerWaste: toFixedFloat(consumerWaste),
      technicalImprovement: toFixedFloat(technicalImprovement),
    };

    result.origin[fbsId] = Object.fromEntries(
      originStr
        .split(" ")
        .map((pair) => pair.split(":"))
        .map(([country, valueStr]) => [country, toFixedFloat(valueStr)])
    );
  });

  console.log(JSON.stringify(result, null, 2));
}

main(process.argv);
