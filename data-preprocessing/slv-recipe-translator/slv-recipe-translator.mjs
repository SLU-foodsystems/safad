#!/usr/env/bash node

import * as utils from "../utils.mjs";

/** @param {number} val */
const perc2Decimal = (val) => val / 100;

/**
 * Generate a function mapping an slv process name to a facet, where such a
 * matching exists.
 *
 * Extracts the relevant information from the csv file, assuming the process
 * name and the foodex process code (facet) are the first two columns.
 */
function getProcessTranslator(csvFile) {
  const matchings = Object.fromEntries(
    csvFile
      .map(([slvProcessName, foodExProcessCode]) => [
        slvProcessName,
        foodExProcessCode,
      ])
      .filter(([name]) => name && name.trim() !== "Rå")
  );

  return (slvProcessName) =>
    slvProcessName in matchings ? matchings[slvProcessName] : "";
}

/**
 * Generate a function mapping an foodex2 (short) codes with foodex1 (long)
 * codes.
 *
 * Logs an error when codes without matchings are checked
 */
const getCodeTranslator = (csvFile) => {
  const mappings = {};
  csvFile
    .map(([fe1Code, _fe1Name, fe2CodeA, fe2CodeB]) =>
      [fe1Code, fe2CodeA, fe2CodeB].map((x) => x.trim())
    )
    .forEach(([fe1Code, fe2CodeA, fe2CodeB]) => {
      if (fe1Code === "-" || !fe2CodeA) return;
      mappings[fe2CodeA] = fe1Code;
      // some rows have a second column of codes as well.
      if (fe2CodeB) mappings[fe2CodeB] = fe1Code;
    });

  const missingCodes = new Set();

  /**
   * @param {string} foodEx2Code
   * @returns {string}
   */
  return (foodEx2Code) => {
    if (!foodEx2Code) return "";

    const code = foodEx2Code.trim();
    if (!(code in mappings)) {
      // Avoid warning multiple times for a single code.
      if (!missingCodes.has(code)) {
        console.error("No FoodEx1 code found for FoodEx2 code " + code);
        missingCodes.add(code);
      }
      return "MISSING";
    }

    return mappings[code];
  };
};

function main(args) {
  // Read recipe csv
  const recipes = utils.readCsv(args[0]).slice(1);

  const processTranslationsCsv = utils
    .readCsv("./slv-to-foodex-processes.csv")
    .slice(2);

  const foodExTranslationsCsv = utils
    .readCsv("./foodex2-to-foodex1.csv")
    .slice(1);

  const processTranslator = getProcessTranslator(processTranslationsCsv);
  const codeTranslator = getCodeTranslator(foodExTranslationsCsv);

  /**
   * @param {string} str
   * @param {number?} fallback
   */
  const toFloat = (str, fallback = 0) => {
    const f = Number.parseFloat(str.trim());
    return Number.isNaN(f) ? fallback : f;
  };

  // Select only the relevant information of each row, replacing
  //  - foodex2 codes with fooxex1 codes
  //  - slv process names with foodex process/facet codes
  const ingredientsList = recipes.map(
    ([
      slvId,
      _slvName,
      _i1Name,
      i1Share,
      _i1Desc,
      i1ProcessName,
      _i1YieldFactor,
      _i1PublicationSource,
      i1FoodEx2Code,
      i1NetShare,
      _i1NetAmountDesc,
      _i2Name,
    ]) => ({
      slvId,
      code: codeTranslator(i1FoodEx2Code),
      foodEx2Code: i1FoodEx2Code,
      process: processTranslator(i1ProcessName),
      grossShare: toFloat(i1Share, 0),
      netShare: toFloat(i1NetShare, 0),
    })
  );

  const results = {};
  ingredientsList.forEach(
    ({ slvId, foodEx2Code, grossShare, code, netShare, process }) => {
      if (perc2Decimal(grossShare) === 0 && perc2Decimal(netShare) === 0) return;
      if (!results[slvId]) {
        results[slvId] = [];
      }
      results[slvId].push([
        code,
        foodEx2Code,
        perc2Decimal(grossShare),
        perc2Decimal(netShare),
        process || "",
      ]);
    }
  );

  console.log(JSON.stringify(results, null, 2));
}

main(process.argv.slice(2));
