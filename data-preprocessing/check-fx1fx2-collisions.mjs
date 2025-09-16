import { readCsv } from "./utils.mjs";

function parseFoodExTranslationFile(rows) {
  const mappings = {};
  rows.slice(1).forEach(([fe1Code, _fe1Name, fe2CodeA, fe2CodeB]) => {
    if (fe1Code === "-" || !fe2CodeA) return;
    mappings[fe2CodeA] = fe1Code;
    // some rows have a second column of codes as well.
    if (fe2CodeB) {
      mappings[fe2CodeB] = fe1Code;
    }
  });

  return mappings;
}

const _quote = x => `"${x}"`

function main(...args) {
  const translationCsv = readCsv("../src/data/foodex-code-translations.csv");
  const foodex2to1Matchings = parseFoodExTranslationFile(translationCsv);

  const foodex1to2Matchings = {};

  Object.entries(foodex2to1Matchings).forEach(([fx2, fx1]) => {
    if (!foodex1to2Matchings[fx1]) {
      foodex1to2Matchings[fx1] = [fx2];
    } else {
      foodex1to2Matchings[fx1].push(fx2);
    }
  });

  const collisions = Object.entries(foodex1to2Matchings)
    .filter(([fx1, fx2s]) => fx2s.length > 1)
    .map(([fx1, fx2s]) => `"${fx1}",${fx2s.map(_quote).join(",")}`)
    .join("\n");

  console.log(collisions)
}

main(process.argv.slice(2));
