#!/usr/bin/env node
//@ts-check

/**
 * Script for creating a sheets with RPC parameters for different countries.
 *
 * Instead of taking the list of files as arguments, as most other scripts in
 * this project does, his defines all paths in the function main() below.
 *
 * The only input it takes is the list of countries to use generate csvs for.
 */

import * as fs from "fs";
import * as path from "path";
import url from "url";

import { readCsv, roundToPrecision, uniq } from "../utils.mjs";

const ROW_THRESHOLD = 0.1;
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
  "United Kingdom": "UK",
  "United States of America": "USA",
  "Côte d'Ivoire": "Cote d'Ivoire",
};

const ALL_COUNTRY_OVERRIDES = [
  ["01802", "Sugar cane", "Sugar crops", "Spain", 1, 0.045, 0],
  ["01491.01", "Oil palm fruit", "Oil crops, tree", "Malaysia", 0.3, 0.06, 0],
  ["01491.01", "Oil palm fruit", "Oil crops, tree", "Indonesia", 0.7, 0.06, 0],
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

const _countries = new Set();
/**
 * Most complex logic in this file, where we extract the shares from the trade
 * matrix for a specific country.
 *
 * We essentially, for every consumerCountry and food item, compute how large a
 * portion (%) is produced in each producerCountry.
 *
 * @param {string[][]} matrix
 * @param {string} country
 * @returns {Object.<string, Object.<string, number>>}
 */
function getFoodItemShares(matrix, country) {
  const filtered = matrix
    // Skip all other countries
    .filter((row) => row[6] == country)
    .map((x) => ({
      amount: parseFloat(x[3]),
      producerCountry: x[7],
      itemName: x[8].trim(),
    }))
    .map((x) => {
      if (x.producerCountry in COUNTRY_RENAME_MAP) {
        return { ...x, producerCountry: COUNTRY_RENAME_MAP[x.producerCountry] };
      }
      return x;
    })
    .filter(
      (x) => x.producerCountry !== "NA" && x.itemName !== "NA" && x.amount > 0
    );

  if (filtered.length === 0) {
    throw new Error("Country " + country + " not found.");
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

    allProportions[itemName][producerCountry] = amount / totalAmounts[itemName];
  });

  /**
   * STEP 3: Simplify the above proportions by aggregating all values below a
   * certain threshold to a 'rest of world' key.
   */
  /** @type {Object.<string, Object.<string, number>>} */
  const simplifiedProportions = {};
  Object.keys(allProportions).forEach((itemName) => {
    const result = {};

    // Step 3a: Only transfer value if larger than threshold
    Object.entries(allProportions[itemName]).forEach(([country, value]) => {
      if (value > ROW_THRESHOLD) {
        result[country] = value;
        _countries.add(country);
      }
    });

    // Steb 3b: Add whatever is left of 100% as RoW
    const importsSum = Object.values(result).reduce((a, b) => a + b, 0);
    result.RoW = Math.max(0, 1 - importsSum);

    // Step 3c: Round to precision to avoid too many decimal points
    simplifiedProportions[itemName] = Object.fromEntries(
      Object.entries(result)
        .map(
          ([k, v]) =>
            /** @type {[string, number]} */ ([
              k,
              roundToPrecision(v, RESULT_PRECISION),
            ])
        )
        .filter(([_k, v]) => v > 0)
    );
  });

  return simplifiedProportions;
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
 * Main function
 *
 * @param {string[]} args
 */
function main(args) {
  const [...countries] = args;

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

  // NOTE that the trade matrix uses ; as delimiter
  const matrix = readCsv(path.resolve(DIRNAME, "./trade-matrix.csv"), ";");

  if (DEBUG_PRINT_ITEMNAMES) {
    uniq(matrix.map((x) => x[8]))
      .sort()
      .forEach((x) => console.log(x));
    return;
  }

  /** @type {Object.<string, Object.<string, Object.<string, number>>>}*/
  const sharesPerCountryAndItem = Object.fromEntries(
    countries.map((c) => [c, getFoodItemShares(matrix, c)])
  );

  /** @type Object.<string, (string | number)[][]> */
  const rpcParametersPerCountry = Object.fromEntries(
    countries.map((c) => [c, []])
  );

  /**
   * The part of script where we put all parts together.
   *
   * We iterate over the "sua template", where each row is a food item (sua-code
   * , name, and category) to construct the final results.
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

    // For each country, we extract the share and waste for this specific food
    countries.forEach((consumerCountry) => {
      const shares = sharesPerCountryAndItem[consumerCountry][itemName] || {
        RoW: 1,
      };

      let waste = wasteFactorsMap[consumerCountry][category];
      if (!waste) {
        console.warn(
          `WARN (${i}): No waste found for category "${category}" (item "${itemName}").`
        );
        category = "Other";
        waste = wasteFactorsMap[consumerCountry][category];
      }

      // And we store in the final results as a list, to be made into a csv.
      Object.entries(shares).forEach(([prodCountry, share]) => {
        rpcParametersPerCountry[consumerCountry].push([
          suaCode,
          suaName,
          category,
          prodCountry,
          share,
          waste,
          0, // organic
        ]);
      });
    });
  });

  countries.forEach((consumerCountry) => {
    ALL_COUNTRY_OVERRIDES.forEach((row) => {
      rpcParametersPerCountry[consumerCountry].push(row);
    });
  });

  const HEADER =
    "SUA Code,SUA Name,Category,Producer Country,Share,Waste,Organic";

  countries.forEach((country) => {
    const body = rpcParametersPerCountry[country]
      .map((x) => x.map((val) => maybeQuote(val)).join(","))
      .join("\n");

    const data = HEADER + "\n" + body;

    fs.writeFileSync(
      path.resolve(DIRNAME, "./csv-out", `${country}-rpc.csv`),
      data
    );
  });
}

main(process.argv.slice(2));