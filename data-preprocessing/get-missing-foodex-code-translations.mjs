import fs from "fs";
import { readCsv } from "./utils.mjs";

const _q = (x) => `"${x}"`;

const allCodes = fs
  .readFileSync("./all-codes.csv", { encoding: "utf-8" })
  .split("\n")
  .filter((x) => x.trim() !== "")
  .map((x) => {
    const idx = x.indexOf(",");
    return [x.substring(0, idx), x.substring(idx + 1)];
  });
const translations = readCsv("../src/data/foodex-code-translations.csv");

const fx1ToFx2 = Object.fromEntries(
  translations.slice(1).map((x) => [x[0], x[2]])
);

function main(...args) {
  const names = {
    "A.16.08.009": "Fish sauce",
  };

  const dietFiles = [
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
  ]
    .map((x) => "../src/default-input-files/SAFAD ID Diet Spec/" + x)
    .map((fpath) => readCsv(fpath).slice(1))
    .flat(1);

  dietFiles.forEach((x) => (names[x[0]] = x[3]));

  const dietLongCodesWithShortCodes = [
    ...new Set(dietFiles.filter((x) => x[1] === "").map((x) => x[0])),
    "A.16.08.009", // Fish sauce
  ].map((code) => [code, _q(names[code])].join(","));

  const dietLongCodesSet = new Set(
    dietFiles.filter((x) => x[1] === "").map((x) => x[0])
  );

  const allCodesWithMissingShort = [
    ...new Set(allCodes.filter(([fx1]) => !(fx1 in fx1ToFx2))),
  ].map(([fx1, n]) =>
    [fx1, n, dietLongCodesSet.has(fx1) ? "Yes" : "No"].join(",")
  );
  // console.log(dietLongCodesWithShortCodes.join("\n"));
  // console.log(allCodesWithMissingShort.join("\n"));
  //

  // Test to print all fx1 codes in diet files that HAVE translations but not in our joint translations file. Turns out, there are none. good to know!
  // dietFiles
  //   .map((row) => [row[0], row[1]])
  //   .filter(([fx1, fx2]) => fx2 && !(fx1 in fx1ToFx2))
  //   .forEach((x) => console.log(x));
}

main(process.argv.slice(2));
