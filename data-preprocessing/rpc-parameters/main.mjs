//@ts-check

/**
 * Script for creating a sheets with RPC parameters for different countries.
 *
 * NOTE: Instead of taking the list of files as arguments, as most other scripts
 * in this project does, all paths are defined in the function main() below.
 *
 * The only input it takes is the country-code to use generate a csv for.
 *
 * Usage:
 *
 *    node generate-csv-per-country.mjs SE > "SAFAD IP Origin and Waste of RPC SE.csv"
 *
 * Or, for multiple files at once:
 *
 *    for c in DE ES FR GR HU IE IT PL SE; do node generate-csv-per-country.mjs "$c" > "SAFAD IP Origin and Waste of RPC $c.csv"; done
 */

import * as path from "path";
import url from "url";

import { asCsvString, readCsv, roundToPrecision } from "../utils.mjs";

import countryCodes from "./country-codes.json" with { type: "json" };
import countryNames from "./country-names.json" with { type: "json" };

const RESULT_PRECISION = 3;
const MIN_SHARE_THRESHOLD = 0.01; // Shares lower than tihs get excluded.
const DIRNAME = path.dirname(url.fileURLToPath(import.meta.url));

const LL_COUNTRIES = {
  DE: "Germany",
  ES: "Spain",
  FR: "France",
  GR: "Greece",
  HU: "Hungary",
  IE: "Ireland",
  IT: "Italy",
  PL: "Poland",
  SE: "Sweden",
};

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
      itemCode: x[4].trim(),
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
    .filter((x) => x.producerCountry !== "NA" && x.itemCode && x.amount > 0);

  if (filtered.length === 0) {
    throw new Error("Country " + consumerCountry + " not found.");
  }

  /**
   * STEP 1: Compute the total of each item.
   */
  const totalAmounts = {};
  filtered.forEach(({ amount, itemCode }) => {
    totalAmounts[itemCode] = (totalAmounts[itemCode] || 0) + amount;
  });

  /**
   * STEP 2: Compute the proportions:
   * { [itemCode]: { [producerCountry]: percentage }}
   */
  /** @type {Object.<string, Object.<string, number>>} */
  const allProportions = {};
  filtered.forEach(({ amount, producerCountry, itemCode }) => {
    if (!(itemCode in allProportions)) {
      allProportions[itemCode] = {};
    }

    if (!totalAmounts[itemCode]) {
      throw new Error(
        "Unexpected behaviour. Value totalAmount for " +
          itemCode +
          " not found or 0."
      );
    }

    allProportions[itemCode][producerCountry] =
      (allProportions[itemCode][producerCountry] || 0) + amount;
  });

  /**
   * STEP 3: Convert the absolute values to relative values
   *
   * Necessary since some producerCountries can appear twice (mostly only CN, as
   * two countries are assigned that code due to our COUNTRY_RENAME_MAP
   */
  Object.entries(allProportions).forEach(
    ([itemCode, proportionsPerProdCountry]) => {
      Object.keys(proportionsPerProdCountry).forEach((producerCountry) => {
        const total = totalAmounts[itemCode];
        const share = proportionsPerProdCountry[producerCountry] / total;
        if (share < MIN_SHARE_THRESHOLD) {
          delete proportionsPerProdCountry[producerCountry];
        } else {
          proportionsPerProdCountry[producerCountry] = share;
        }
      });
    }
  );

  /**
   * STEP 4: Round values, and ensure shares adds up to 1.
   *
   * After rounding / discarding certain shares, we want to round up the shares
   * to equal 1 (i.e. 100%) again.
   */
  Object.values(allProportions).forEach((proportionsPerProdCountry) => {
    const sum = Object.values(proportionsPerProdCountry).reduce(
      (a, b) => a + b,
      0
    );

    Object.keys(proportionsPerProdCountry).forEach((producerCountry) => {
      const newShare = roundToPrecision(
        proportionsPerProdCountry[producerCountry] / sum,
        RESULT_PRECISION
      );
      proportionsPerProdCountry[producerCountry] = newShare;
    });
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
      "Script expects one argument: <country-code>:\n\n" +
        "\tnode generate-csv-per-country.mjs Sweden\n"
    );
  }

  const [consumerCountryCode] = args;
  const consumerCountry = LL_COUNTRIES[consumerCountryCode];
  if (!consumerCountry) {
    throw new Error(
      "Expected first argument 'country-code' to be one of the following values:\n\t" +
        Object.keys(LL_COUNTRIES).join(" ") +
        "\nbut got: " +
        consumerCountryCode
    );
  }

  const tradeMatrixFileName =
    args.length >= 2 && args[1] ? args[1] : "trade-matrix.csv";

  // Input file: csv of column with category (as defined in rpc) and waste
  // Create an object with { [country: string]: { [category: string]: number } }
  /** @type {Object.<string, Object.<string, number>>} */
  const wasteFactorsMap = createCountryWastesMap(
    readCsv(path.resolve(DIRNAME, "./rpc-waste-factors.csv"), ",").slice(1)
  );

  // A list of Sua Code, Sua Name, Category, Item Code, and Item Name, where
  // `Item` refers to the standard used by the kastner file (FAO?)
  const suaKastnerList = readCsv(
    path.resolve(DIRNAME, "./sua-kastner-list.csv"),
    ","
  ).slice(1);

  const rpcToSuaCodesCsv = readCsv(
    path.resolve(DIRNAME, "./rpc-to-sua.csv")
  ).slice(1);
  // Extract rpcNames and a suaToRpcs conversion map
  const { suaToRpcs, rpcNames } = createRpcSuaTranslationMaps(rpcToSuaCodesCsv);

  // NOTE: the trade matrix csv-file uses semicolon (;) as its delimiter
  const matrix = readCsv(path.resolve(DIRNAME, tradeMatrixFileName), ";");

  /** @type {Object.<string, Object.<string, number>>}*/
  const sharesPerItem = getFoodItemShares(matrix, consumerCountry);
  /** @type Array<string | number>[] */
  const fullKastnerDataRows = [];

  // For debugging
  const _rpcCodesCache = new Set();

  /**
   * The part of script where we put all parts together.
   *
   * We iterate over the "SUA kastner list", where each row is a food item
   * (sua-code, name, and category) to construct the output file.
   *
   * For each sua-code (in said list), we output N origin rows.
   */
  suaKastnerList.forEach((row, i) => {
    const [suaCode, suaName, maybeCategory, itemCode, itemName] = row;

    let category = maybeCategory; // Overwritten if waste not found for this category
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
      console.error(
        `ERR (row ${i}): RPC codes missing for SUA item: ${suaName} (${suaCode})` +
          `. Item is ${itemName} (${itemCode}).`
      );
      return;
    }

    if (!itemCode && !suaCode.startsWith("BF-")) {
      console.warn(
        `ERR (row ${i}): No code found for sua item "${suaName}" (${suaCode}).`
      );
      return;
    }

    if (!sharesPerItem[itemCode]) {
      console.warn(
        `WARN (${i}): No shares found for sua item "${suaName}" (${suaCode}) ` +
          `(item "${itemName}" with code "${itemCode}"). Allocating all to RoW.`
      );
    }

    const shares = sharesPerItem[itemCode] || { RoW: 1 };
    rpcCodes.forEach((rpcCode) => {
      // Skip if we add this value manually
      if (OVERRIDE_CODES.has(rpcCode)) return;
      // Skip if we've already encountered this rpc-code
      if (_rpcCodesCache.has(rpcCode)) {
        console.warn(
          `WARN: Duplicate entries for rpc ${rpcNames[rpcCode]} ` +
            `${rpcCode}.`
        );
        return;
      } else {
        _rpcCodesCache.add(rpcCode);
      }

      // And we store in the final results as a list, to be made into a csv.
      Object.entries(shares).forEach(([prodCountry, share]) => {
        if (share < MIN_SHARE_THRESHOLD) return;
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

  const HEADER = [
    "RPC Code",
    "RPC Name",
    "Producer Country Name",
    "Producer Country Code",
    "Share",
    "Waste",
    "SUA Code",
  ];

  console.log(
    asCsvString([HEADER, ...fullKastnerDataRows], {
      NEWLINE: "\n",
      withBOM: true,
    })
  );
}

main(process.argv.slice(2));
