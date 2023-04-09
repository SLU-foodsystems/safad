import fs from "fs";

/**
 * Split a string into a vector of parts by the CSV_DELIM, while ignoring any
 * occurances inside double-quotes.
 *
 * NOTE: this assumes
 */
export function splitCsvRow(str, delimitor) {
  if (!str.includes('"')) return str.split(delimitor);
  let sanityCounter = 0;

  const splitPoints = [];
  // Position of the delimitor (normally a comma)
  let posDelim = str.indexOf(delimitor, -1);
  // Position of the quote
  let posQuote = str.indexOf('"', -1);

  // Repeat until we've iterated over all quotes
  while (posQuote > -1) {
    if (sanityCounter++ > 2000) {
      throw new Error(
        "The script seems to have got stuck in an endless loop. Input was:\n\t" +
          str
      );
    }
    // Add all commas up to the quote to the splitPoints.
    while (posDelim < posQuote) {
      splitPoints.push(posDelim);
      posDelim = str.indexOf(delimitor, posDelim + 1);
    }

    let posQuoteEnd = str.indexOf('"', posQuote + 1);
    posQuote = str.indexOf('"', posQuoteEnd + 1);
    posDelim = str.indexOf(delimitor, posQuoteEnd);
  }

  while (posDelim > -1) {
    console.log("Outer loop 2");
    splitPoints.push(posDelim);
    posDelim = str.indexOf(delimitor, posDelim + 1);
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

export function readCsv(fpath, delim = ",") {
  const fileContent = fs.readFileSync(fpath, { encoding: "utf8" });

  const rows = fileContent.split("\n");
  return rows.map((row) => splitCsvRow(row, delim)).filter((x) => x.length > 1);
}
