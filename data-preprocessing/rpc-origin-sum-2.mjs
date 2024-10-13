import { readCsv } from "./utils.mjs";

const maybeQuote = (str) => (str.includes(",") ? `"${str}"` : str);

const asCsvString = (rows) =>
  rows.map((row) => row.map(maybeQuote).join(",")).join("\n");

function main(args) {
  const [filepath] = args;
  const [header, ...rows] = readCsv(filepath);
  const groupedByCode = {};
  const shares = {};

  rows.forEach((row) => {
    const code = row[0];
    if (!(code in groupedByCode)) groupedByCode[code] = [];
    groupedByCode[code].push(row);

    shares[code] = (shares[code] || 0) + parseFloat(row[4]);
  });

  const invalidSumShares = Object.entries(shares)
    .filter(([k, v]) => v === 2)
    .map((kv) => kv[0]).join("\n");
  console.log(filepath);
  console.log(invalidSumShares);
}

main(process.argv.slice(2));
