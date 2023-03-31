import fs from "fs";
import { splitCsvRow } from "./utils.mjs";
const HEADER = 'Item code (CPC),Food Balance Sheets (FBS) food categories  [2],Country of origin,Market share,Data source,"Climate impact, kg CO2e/kg","Carbon dioxide, kg CO2/kg","Methane, kg CH4/kg","Nitrous oxide, kg N2O/kg",kg HCFs/kg,"Cropland use, m2/kg","Nitrogen application, kg N/kg","Phosphorus application, kg P/kg","Freshwater use, m3/kg","Extinction rate, E/MSY/kg"';

const randomEnvFactors = () =>
  Array.from({ length: 10 }).map(() => 0.5 + Math.random());

function main(argv) {
  const dietCsvPath = argv[2];
  const fileContent = fs.readFileSync(dietCsvPath, { encoding: "utf8" });
  const [_, ...lines] = fileContent.split("\n");

  const matrix = lines
    .map((row) => splitCsvRow(row, ","))
    .filter((r) => r.length > 1);

  const envFactorsRows = matrix
    // Get the fbsId and the origin value
    .map((row) => [row[1], row[8]])
    // Filter all items that do not have an origin - only one of each fbs will
    // have one.
    .filter((pair) => !!pair[1])
    // Split the string (c1:p1 c2:p2...) to [c1, c2, ...]
    .map(([fbsId, origins]) => [
      fbsId,
      origins.split(" ").map((parts) => parts.split(":")[0]),
    ])
    .map(([fbsId, origins]) => [
      origins.map((country) => [fbsId, country, ...randomEnvFactors()]),
    ])
    .flat(2) // flatten appropriately
    .map(([fbsId, origin, ...factors]) => [
      fbsId,
      "FBS NAME",
      origin,
      0,
      ...factors,
    ]);

  console.log(HEADER + "\n" + envFactorsRows.map((row) => row.join(",")).join("\n"));
}

main(process.argv);
