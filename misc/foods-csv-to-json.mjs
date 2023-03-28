/**
 * Convert a csv file with a specific format to a JSON
 * from:
 *
 *   I,II,,III,,FBS group name,IV,FCL,CPC,SUA item name
 *
 * to:
 *
 * { [EAT_ID]: {
 *   name: string,
 *   fbs: []{
 *     name: string,
 *     id: string,
 *     sua: []{
 *       name: string,
 *       id: string,
 *     }
 *   }
 * }}
 *
 * Expects the path to the csv file as parameter.
 */
import fs from "fs";
import { splitCsvRow } from "./utils.mjs";

function main(args) {
  const csvPath = args[2];
  const fileContent = fs.readFileSync(csvPath, { encoding: "utf8" });
  const [header, ...lines] = fileContent.split("\n");

  const matrix = lines.map(row => splitCsvRow(row, CSV_DELIM));

  const result = { data: [] };

  let eat = null;
  let fbs = null;
  matrix.forEach((fields) => {
    if (fields[0]) return;
    if (fields[3]) {
      const [id, name] = [fields[3], fields[4]];
      eat = { name, id, fbs: [] };
      result.data.push(eat);
      return;
    }

    if (fields[5]) {
      const [name, id] = [fields[5], fields[6]];
      fbs = { id, name, sua: [] };
      eat.fbs.push(fbs);
      // do not return
    }

    if (fields[8]) {
      const [id, name] = [fields[8], fields[9].trim()];
      const sua = { id, name };
      fbs.sua.push(sua);
    }
  });

  console.log(JSON.stringify(result, null, 2));
}

main(process.argv);
