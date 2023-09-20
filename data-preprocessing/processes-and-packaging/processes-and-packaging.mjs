import { readCsv } from "../utils.mjs";

function main(args) {
  const [csvPath] = args;
  const data = readCsv(csvPath, ",").slice(1);

  const packagingData = Object.fromEntries(data.map((row) => [row[0], row[7]]));
  const preparationProcessesData = Object.fromEntries(
    data.map((row) => [row[2], row[4]]).filter(pair => pair[1] !== "")
  );

  const joined = { ...packagingData, ...preparationProcessesData };

  console.log(JSON.stringify(joined));
}

main(process.argv.slice(2));
