#!/usr/env/bash node

import * as utils from "../utils.mjs";

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

  return (foodEx2Code) => {
    if (!foodEx2Code) return "";

    const code = foodEx2Code.trim();
    if (!(code in mappings)) {
      // Log on new codes
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

  const toFloat = (str, fallback = 0) => {
    const f = Number.parseFloat(str.trim());
    return Number.isNaN(f) ? fallback : f;
  };

  // Select only the relevant information of each row, replacing
  //  - foodex2 codes with fooxex1 codes
  //  - slv process names with foodex process/facet codes
  const preprocessed = recipes.map(
    ([
      slvId,
      _slvName,
      _i1Name,
      _i1Share,
      _i1Desc,
      i1ProcessName,
      _i1YieldFactor,
      _i1PublicationSource,
      i1FoodEx2Code,
      i1NetShare,
      _i1NetAmountDesc,
      _i2Name,
      i2ProcessName,
      i2YieldFactor,
      _i2PublicationSource,
      i2FoodEx2Code,
    ]) => [
      slvId,
      codeTranslator(i1FoodEx2Code),
      processTranslator(i1ProcessName),
      toFloat(i1NetShare, 0),
      codeTranslator(i2FoodEx2Code),
      processTranslator(i2ProcessName),
      toFloat(i2YieldFactor, 1),
    ]
  );

  // Now, take each row and break it down to the smallest of the two ingredients,
  // i.e. i2 when there is one, and otherwise i1.
  // Also record track of which processes and their amounts
  const disaggregateResults = preprocessed.map(
    ([slvId, i1Code, i1Process, i1NetShare, i2Code, i2Process, i2Yield]) => {
      const processes = [];
      if (i1Process) {
        processes.push({ code: i1Process, amount: i1NetShare });
      }

      if (!i2Code) {
        return {
          slvId,
          rpc: {
            code: i1Code,
            amount: i1NetShare,
          },
          processes,
        };
      }

      if (i2Process) {
        processes.push({ code: i2Process, amount: i1NetShare * i2Yield });
      }

      return {
        slvId,
        rpc: {
          code: i2Code,
          amount: i1NetShare * i2Yield,
        },
        processes,
      };
    }
  );

  const results = {};
  disaggregateResults.forEach(({ slvId, rpc, processes }) => {
    if (!results[slvId]) {
      results[slvId] = { rpcs: {}, processes: {} };
    }

    results[slvId].rpcs[rpc.code] =
      (results[slvId].rpcs[rpc.code] || 0) + rpc.amount;

    processes.forEach(({ code, amount }) => {
      results[slvId].processes[code] =
        (results[slvId].processes[code] || 0) + amount;
    });
  });

  // Convert all to decimal values (e.g. 0.1 instead of 10 %)
  Object.values(results).map((obj) => {
    ["rpcs", "processes"].forEach((key) => {
      Object.keys(obj[key]).forEach((code) => {
        const newValue = obj[key][code] / 100;
        const DP = 2; // decimal places
        obj[key][code] = Math.round(newValue * 10 ** DP) / 10 ** DP;
      });
    });
  });

  console.log(JSON.stringify(results, null, 2));
}

main(process.argv.slice(2));
