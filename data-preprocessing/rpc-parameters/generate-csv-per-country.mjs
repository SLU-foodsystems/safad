//@ts-check

/**
 * Script for creating a sheets with RPC parameters for different countries.
 *
 * NOTE: Instead of taking the list of files as arguments, as most other scripts
 * in this project does, all paths are defined in the function main() below.
 *
 * The only input it takes is the list of countries to use generate csvs for.
 */

import * as path from "path";
import url from "url";

import { readCsv, roundToPrecision, uniq } from "../utils.mjs";

import countryCodes from "./country-codes.json" with { type: "json" };
import countryNames from "./country-names.json" with { type: "json" };

const RESULT_PRECISION = 3;
const DEBUG_PRINT_ITEMNAMES = false;
const DIRNAME = path.dirname(url.fileURLToPath(import.meta.url));

// Avoid misspelling between our countries
const COUNTRY_RENAME_MAP = {
  "Bolivia (Plurinational State of)": "Bolivia",
  "China, mainland": "China",
  // Very problematic, but only concerns Arcea Nuts from Germany.
  "China, Taiwan Province of": "China",
  "Iran (Islamic Republic of)": "Iran",
  "Rest of the World": "RoW",
  "Russian Federation": "Russia",
  "United Kingdom": "United Kingdom",
  "United States of America": "USA",
  "Côte d'Ivoire": "Cote d'Ivoire",
};

const ALL_COUNTRY_OVERRIDES = [
  [
    "A.02.08.002",
    "Sugar cane (Saccharum officinarum)",
    "Spain",
    "ES",
    1,
    0.045,
    "01802",
  ],
  [
    "A.05.05.003",
    "Palmfruit (Elaeis guineensis)",
    "Malaysia",
    "MY",
    0.3,
    0.06,
    "01491.01",
  ],
  [
    "A.05.05.003",
    "Palmfruit (Elaeis guineensis)",
    "Indonesia",
    "ID",
    0.7,
    0.06,
    "01491.01",
  ],
];

// Sua codes in the list above
const OVERRIDE_CODES = new Set(ALL_COUNTRY_OVERRIDES.map((x) => x[0]));

/**
 * @param {string | number} value
 * @returns {string | number}
 */
const maybeQuote = (value) =>
  value && typeof value === "string" && value.includes(",")
    ? `"${value}"`
    : value;

/**
 * Most complex logic in this file, where we extract the shares from the trade
 * matrix for a specific country.
 *
 * We essentially, for every consumerCountry and food item, compute how large a
 * portion (%) is produced in each producerCountry.
 *
 * @param {string[][]} matrix
 * @param {string} consumerCountry
 * @returns {Object.<string, Object.<string, number>>}
 */
function getFoodItemShares(matrix, consumerCountry) {
  const filtered = matrix
    // Skip all other countries
    .filter((row) => row[6] == consumerCountry)
    .map((x) => ({
      amount: parseFloat(x[3]),
      producerCountry: x[7],
      itemName: x[8].trim(),
    }))
    .map((x) =>
      x.producerCountry in COUNTRY_RENAME_MAP
        ? { ...x, producerCountry: COUNTRY_RENAME_MAP[x.producerCountry] }
        : x
    )
    .map((x) => ({
      ...x,
      producerCountry: countryCodes[x.producerCountry] || "NA",
    }))
    .filter(
      (x) => x.producerCountry !== "NA" && x.itemName !== "NA" && x.amount > 0
    );

  if (filtered.length === 0) {
    throw new Error("Country " + consumerCountry + " not found.");
  }

  /**
   * STEP 1: Compute the total of each item.
   */
  const totalAmounts = {};
  filtered.forEach(({ amount, itemName }) => {
    totalAmounts[itemName] = (totalAmounts[itemName] || 0) + amount;
  });

  /**
   * STEP 2: Compute the proportions:
   * { [itemName]: { [producerCountry]: percentage }}
   */
  /** @type {Object.<string, Object.<string, number>>} */
  const allProportions = {};
  filtered.forEach(({ amount, producerCountry, itemName }) => {
    if (!(itemName in allProportions)) {
      allProportions[itemName] = {};
    }

    if (!totalAmounts[itemName]) {
      throw new Error(
        "Something got messed up - totalAmount for " + itemName + " not found."
      );
    }

    allProportions[itemName][producerCountry] = roundToPrecision(
      amount / totalAmounts[itemName],
      RESULT_PRECISION
    );
  });

  return allProportions;
}

/**
 * @param {string[][]} rows
 * @returns object
 */
function createCountryWastesMap(rows) {
  /** @type {Object.<string, Object.<string, number>>}*/
  const results = {};

  rows.forEach(([category, country, valueStr]) => {
    if (!results[country]) {
      results[country] = {};
    }
    results[country][category] = parseFloat(valueStr);
    return results;
  });

  return results;
}

/**
 * @param {string[][]} rpcToSuaCodesCsv
 */
function createRpcSuaTranslationMaps(rpcToSuaCodesCsv) {
  const rpcToSua = {};
  const suaToRpcs = {};
  const rpcNames = {};
  rpcToSuaCodesCsv.forEach(([_foodEx2Code, rpcCode, rpcName, suaCode]) => {
    // Add rpcToSua codes: many-to-one
    rpcToSua[rpcCode] = suaCode;
    rpcNames[rpcCode] = rpcName;

    // Add suaToRpcs codes: one-to-many
    if (!suaToRpcs[suaCode]) {
      suaToRpcs[suaCode] = [];
    }
    suaToRpcs[suaCode].push(rpcCode);
  });

  return { rpcToSua, suaToRpcs, rpcNames };
}

/**
 * Main function
 *
 * @param {string[]} args
 */
function main(args) {
  if (args.length === 0 || !args[0]) {
    throw new Error(
      "Script expects one argument: <countryname>:\n\n" +
        "\tnode generate-csv-per-country.mjs Sweden\n"
    );
  }

  const [consumerCountry] = args;

  // Input file: csv of column with category (as defined in rpc) and waste
  // Create an object with { [country: string]: { [category: string]: number } }
  /** @type {Object.<string, Object.<string, number>>} */
  const wasteFactorsMap = createCountryWastesMap(
    readCsv(path.resolve(DIRNAME, "./rpc-waste-factors.csv"), ",").slice(1)
  );

  // A list of Sua Name, "match status", itemName, where
  // - matchStatus is "Yes" (Sua name is exact same as itemName) or "No", in
  //   which case the best-matching name is provided in the 3rd col
  const suaKastnerList = readCsv(
    path.resolve(DIRNAME, "./sua-kastner-list.csv"),
    ","
  ).slice(1);

  const rpcToSuaCodesCsv = readCsv(
    path.resolve(DIRNAME, "./rpc-to-sua.csv")
  ).slice(1);

  // NOTE that the trade matrix uses ; as delimiter
  const matrix = readCsv(path.resolve(DIRNAME, "./trade-matrix.csv"), ";");

  if (DEBUG_PRINT_ITEMNAMES) {
    uniq(matrix.map((x) => x[8]))
      .sort()
      .forEach((x) => console.log(x));
    return;
  }

  /** @type {Object.<string, Object.<string, number>>}*/
  const sharesPerItem = getFoodItemShares(matrix, consumerCountry);
  /** @type Array<string | number>[] */
  const fullKastnerDataRows = [];

  const { suaToRpcs, rpcNames } = createRpcSuaTranslationMaps(rpcToSuaCodesCsv);

  /**
   * The part of script where we put all parts together.
   *
   * We iterate over the "sua template", where each row is a food item (sua-code
   * , name, and category) to construct the output file.
   *
   * For each sua-code (in this list), we output the N origin rows.
   */
  suaKastnerList.forEach((row, i) => {
    const [suaCode, suaName, _category, isPerfectMatch, altItemName] = row;
    let category = _category;

    const itemName = isPerfectMatch === "Yes" ? suaName : altItemName;
    if (!itemName) {
      console.warn(
        `WARN (${i}): No matching for sua item "${suaName}" (${suaCode}) found.`
      );
      return;
    }

    if (OVERRIDE_CODES.has(suaCode)) {
      return;
    }

    const shares = sharesPerItem[itemName] || { RoW: 1 };

    let waste = wasteFactorsMap[consumerCountry][category];
    if (!waste) {
      console.warn(
        `WARN (${i}): No waste found for category "${category}" (item "${itemName}").`
      );
      category = "Other";
      waste = wasteFactorsMap[consumerCountry][category];
    }

    /** @type {string[]} a*/
    const rpcCodes = suaToRpcs[suaCode];
    if (!rpcCodes) {
      // throw new Error("No rpc-codes found for sua " + suaCode);
      return;
    }

    rpcCodes.forEach((rpcCode) => {
      //"RPC Code,RPC Name,Producer Country Name,Producer Country Code,Share,Waste,SUA Code";
      // And we store in the final results as a list, to be made into a csv.
      Object.entries(shares).forEach(([prodCountry, share]) => {
        if (share < 0.01) return;
        fullKastnerDataRows.push([
          rpcCode,
          rpcNames[rpcCode],
          countryNames[prodCountry],
          prodCountry,
          share,
          waste,
          suaCode,
        ]);
      });
    });
  });

  // Add the overrides that we hard-code to all files.
  ALL_COUNTRY_OVERRIDES.forEach((row) => {
    fullKastnerDataRows.push(row);
  });

  const HEADER =
    "RPC Code,RPC Name,Producer Country Name,Producer Country Code,Share,Waste,SUA Code";

  const body = fullKastnerDataRows
    .map((x) => x.map((val) => maybeQuote(val)).join(","))
    .join("\n");

  const data = HEADER + "\n" + body;

  console.log(data);
}

main(process.argv.slice(2));
