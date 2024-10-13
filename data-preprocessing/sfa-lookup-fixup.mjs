import { readCsv, asCsvString } from "./utils.mjs";

const stripFacet = (code) =>
  code.includes("#") ? code.substring(0, code.substring("#")) : code;

function main() {
  const recipesFile = readCsv(
    "../src/default-input-files/SAFAD IP SFA Recipes.csv"
  );
  const codeNames = Object.fromEntries(
    readCsv("../src/data/foodex-code-translations.csv").map((row) => [
      row[2],
      row[1],
    ])
  );

  const getName = (code, otherwise = "(Not found)") =>
    (code && codeNames[code]) || otherwise;

  const newRecipesFile = recipesFile.map((row, i) => {
    if (i === 0)
      return [
        ...row,
        "Name for level 1 short-code",
        "Nme for level 2 short-code",
      ];

    const l1Code = stripFacet(row[8]);
    const l2Code = stripFacet(row[14] || "");

    return [...row, getName(l1Code), getName(l2Code, "")];
  });

  console.log(asCsvString(newRecipesFile, { NEWLINE: "\n", withBOM: true }));
}

main();
