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
const EXPECTED_LENGTH = 8;

function main(args) {
  const csvPath = args[2];
  const fileContent = fs.readFileSync(csvPath, { encoding: "utf8" });
  // Drop the header
  const [_, ...rows] = fileContent.split("\n");

  const matrix = rows.map((row) => row.split(CSV_DELIM)).filter(x => x.length > 1);

  const firstInvalidLengthRow = matrix.findIndex(
    (row) => row.length !== EXPECTED_LENGTH
  );
  if (firstInvalidLengthRow !== -1) {
    const len = matrix[firstInvalidLengthRow].length;
    console.log(matrix[firstInvalidLengthRow]);
    throw new Error(
      `Invalid row length found, row ${firstInvalidLengthRow} (len=${len})`
    );
  }

  const result = {
    amount: {},
    origin: {},
    factors: {},
  };

  matrix.forEach((fields) => {
    const [
      suaId,
      fbsId,
      amount,
      productionWaste,
      retailWaste,
      consumerWaste,
      technicalImprovement,
      originStr,
    ] = fields;

    result.amount[suaId] = amount;

    if (!productionWaste) return;

    result.factors[fbsId] = {
      productionWaste: parseFloat(productionWaste),
      retailWaste: parseFloat(retailWaste),
      consumerWaste: parseFloat(consumerWaste),
      technicalImprovement: parseFloat(technicalImprovement),
    };

    result.origin[fbsId] = Object.fromEntries(
      originStr
        .split(" ")
        .map((pair) => pair.split(":"))
        .map(([country, valueStr]) => [country, parseFloat(valueStr)])
    );
  });

  console.log(JSON.stringify(result, null, 2));
}

main(process.argv);
