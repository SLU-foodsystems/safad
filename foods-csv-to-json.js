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

const CSV_DELIM = ",";

/**
 * Split a string into a vector of parts by the CSV_DELIM, while ignoring any
 * occurances inside double-quotes.
 */
function splitCsvRow(str) {
  if (!str.includes('"')) return str.split(CSV_DELIM);

  const splitPoints = [];
  let posDelim = str.indexOf(CSV_DELIM, -1);
  let posQuote = str.indexOf('"', -1);

  // Repeat until we've iterated over all quotes
  while (posQuote > -1) {
    // Add all commas up to the quote to the splitPoints.
    while (posDelim < posQuote) {
      splitPoints.push(posDelim);
      posDelim = str.indexOf(CSV_DELIM, posDelim + 1);
    }

    let posQuoteEnd = str.indexOf('"', posQuote + 1);
    posQuote = str.indexOf('"', posQuoteEnd + 1);
    posDelim = str.indexOf(CSV_DELIM, posQuoteEnd);
  }

  while (posDelim > -1) {
    splitPoints.push(posDelim);
    posDelim = str.indexOf(CSV_DELIM, posDelim + 1);
  }

  // Add the last index, just to make the iteration below easier
  splitPoints.push(str.length - 1);

  let prev = 0;
  return splitPoints.map((idx) => {
    const part = str.substring(prev, idx);
    prev = idx + 1;
    return part;
  });
}

function main(args) {
  const csvPath = args[2];
  const fileContent = fs.readFileSync(csvPath, { encoding: "utf8" });
  const lines = fileContent.split("\n");
  lines.pop();

  const matrix = lines.map(splitCsvRow);

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
