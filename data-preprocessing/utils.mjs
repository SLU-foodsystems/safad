import fs from "fs";

/**
 * Split a csv-document into a 2d-array, while ignoring any delimiter-
 * occurances inside double-quotes.
 *
 * e.g. 'hello, world, 3, "foo, bar", 10' ->
 *      [['hello', 'world', 3, 'foo, bar', 10]]
 */
function csvToArr(str, delim = ",") {
  let line = [""];
  const ret = [line];
  let quote = false;

  for (let i = 0; i < str.length; i++) {
    const cur = str[i];
    const next = str[i + 1];

    if (!quote) {
      const cellIsEmpty = line[line.length - 1].length === 0;
      if (cur === '"' && cellIsEmpty) quote = true;
      else if (cur === delim) line.push("");
      else if (cur === "\r" && next === "\n") {
        line = [""];
        ret.push(line);
        i++;
      } else if (cur === "\n" || cur === "\r") {
        line = [""];
        ret.push(line);
      } else line[line.length - 1] += cur;
    } else {
      if (cur === '"' && next === '"') {
        line[line.length - 1] += cur;
        i++;
      } else if (cur === '"') quote = false;
      else line[line.length - 1] += cur;
    }
  }
  return ret;
}

export function readCsv(fpath, delim = ",") {
  const fileContent = fs.readFileSync(fpath, { encoding: "utf8" });
  return csvToArr(fileContent, delim).filter((x) => x.length > 1);
}

export const asCsvString = (rows, { NEWLINE = "\n", withBOM = true }) =>
  (withBOM ? "\ufeff" : "") +
  rows.map((row) => row.map(maybeQuote).join(",")).join(NEWLINE);

/**
 * @param {number} value
 * @param {number} dp
 * @returns {number}
 */
export function roundToPrecision(number, decimalPoints = 2) {
  const k = 10 ** decimalPoints;
  return Math.round(number * k) / k;
}

/**
 * @param {(string | number | Symbol)[]} xs
 */
export const uniq = (xs) => [...new Set(xs)];

/**
 * @param {number[]} numbers
 */
export const sum = (numbers) => numbers.reduce((a, b) => a + b, 0);

/**
 * @param {string | number} value
 * @returns {string | number}
 */
export const maybeQuote = (value) =>
  value && typeof value === "string" && value.includes(",")
    ? `"${value}"`
    : value;
