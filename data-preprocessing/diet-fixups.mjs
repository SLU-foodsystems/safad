import * as fs from "fs";
import * as path from "path";

import { readCsv } from "./utils.mjs";

const maybeQuote = str => str.includes(",") ? `"${str}"` : str;
const dataToString = rows => rows.map(row => row.map(maybeQuote).join(",")).join("\n")

const FILES = [
  "SAFAD ID Diet Spec DE.csv",
  "SAFAD ID Diet Spec ES.csv",
  "SAFAD ID Diet Spec FR.csv",
  "SAFAD ID Diet Spec GR.csv",
  "SAFAD ID Diet Spec HU.csv",
  "SAFAD ID Diet Spec IE.csv",
  "SAFAD ID Diet Spec IT.csv",
  "SAFAD ID Diet Spec PL.csv",
  "SAFAD ID Diet Spec SE-B.csv",
  "SAFAD ID Diet Spec SE.csv",
].map((x) => path.resolve("../src/default-input-files/SAFAD ID Diet Spec/", x));

const fooedEx2Codes = Object.fromEntries(readCsv("../src/data/foodex-code-translations.csv").slice(1).map(([longCode,name,shortCode]) => [longCode, shortCode]))

FILES.forEach(path => {
  const rows = readCsv(path).slice(1);

  const output = "Long Code,FoodEx2 Code,L1 Category,L2 Category,Name,Amount\n" + dataToString(rows.map(([code, ...rest]) => [code, fooedEx2Codes[code] || "", ...rest]));

  fs.writeFileSync(path, output);
});
