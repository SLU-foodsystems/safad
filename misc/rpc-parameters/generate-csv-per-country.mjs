#!/usr/bin/env node
//@ts-check

/**
 * Script for creating a sheets with RPC parameters for different countries.
 *
 * Innstead of taking the list of files as arguments, as most other scripts in
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
    .filter(
      (x) => x.producerCountry !== "NA" && x.itemName !== "NA" && x.amount > 0
    );

  if (filtered.length === 0) {
    throw new Error("Country " + country + " not found.");
  }

  const allItems = new Set();

  /**
   * STEP 1: Compute the total of each item.
   */
  const totalAmounts = {};
  filtered.forEach(({ amount, itemName }) => {
    totalAmounts[itemName] = (totalAmounts[itemName] || 0) + amount;
    allItems.add(itemName);
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

    // Step 3a: Only transfer value if larger than threshold, else sum to RoW
    Object.entries(allProportions[itemName]).forEach(([country, value]) => {
      if (value > ROW_THRESHOLD) {
        result[country] = value;
        _countries.add(country);
      } else {
        result.RoW = (result.RoW || 0) + value;
      }
    });

    // TODO: Do we want to delete (and adjust for) ROW if it is too low?

    // Step 3b: Round to precision to avoid ca 20 decimal points.
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

function printItemCountries(maps) {
  const itemCountrySets = {};
  maps.forEach((map) => {
    Object.entries(map).forEach(([item, countries]) => {
      if (!(item in itemCountrySets)) {
        itemCountrySets[item] = new Set();
      }

      Object.keys(countries)
        .filter((c) => c !== "RoW")
        .forEach((c) => itemCountrySets[item].add(c));
    });
  });

  let lists = Object.entries(itemCountrySets).map(([k, v]) => [
    k,
    [...v].sort(),
  ]);

  lists = lists.sort(([a], [b]) => (b < a ? 1 : b > a ? -1 : 0));

  lists.forEach(([item, countries]) =>
    countries.forEach((c, i) => {
      if (i === 0) {
        console.log(item, "\t", c, "\t", countries.length);
      } else {
        console.log(item, "\t", c, "\t");
      }
    })
  );

  console.log(JSON.stringify(maps, null, 2));
}

/**
 * Create a rename-map of Record<from: string, to: string> from the
 * sua-to-kastner-matchings.csv file.
 *
 * @param {string[][]} rows
 * @returns {Object.<string, string>}
 */
function createRenameMap(rows) {
  return Object.fromEntries(
    rows
      .filter((x) => x[0] !== "") // Remove any empty rows.
      .map(([itemName, isPerfectMatch, suaName]) => {
        return [itemName, isPerfectMatch === "Yes" ? itemName : suaName];
      })
  );
}

/**
 * Main function
 *
 * @param {string[]} args
 */
function main(args) {
  const [...countries] = args;

  // Template of RPC parameters, as csv file, with columns:
  // - sua code, sua name, category
  /** @type {string[][]} */
  const rpcTemplate = readCsv(
    path.resolve(DIRNAME, "./rpc-parameters-template.csv"),
    ";"
  ).slice(1);

  // Input file: csv of column with category (as defined in rpc) and waste
  // Create an object with { [category: string]: number }
  /** @type {Object.<string, number>} */
  const wasteFactorsMap = Object.fromEntries(
    readCsv(path.resolve(DIRNAME, "./rpc-waste-factors.csv"), ";", true)
      .slice(1)
      .map(([k, v]) => [k, parseFloat(v)])
  );

  // A list of Sua Name, "match status", itemName, where
  // - matchStatus is "Yes" (Sua name is exact same as itemName) or "No", in
  //   which case the best-matching name is provided in the 3rd col
  const suaItemNamesMatchings = readCsv(
    path.resolve(DIRNAME, "./sua-to-kastner-matchings.csv"),
    ";",
    true
  ).slice(1);
  // We create a map that can be used to translate between the item names used
  // in the trade matrix below and the SUA names.
  const suaItemNamesMap = createRenameMap(suaItemNamesMatchings);

  // NOTE that the trade matrix uses ; as delimiter
  const matrix = readCsv(
    path.resolve(DIRNAME, "./trade-matrix.csv"),
    ";",
    true
  );

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
   * We iterate over the "rpc template", where each row is a food item (sua-code
   * and name) to construct the final results.
   */
  rpcTemplate.forEach((row, i) => {
    const [suaCode, suaName, category] = row;

    const itemName = suaItemNamesMap[suaName];
    if (!itemName) {
      console.warn(
        `WARN (${i}): No matching for sua item "${suaName}" (${suaCode}) found.`
      );
      return;
    }

    // For each country, we extract the share and waste for this specific food
    countries.forEach((consumerCountry) => {
      const shares = sharesPerCountryAndItem[consumerCountry][itemName] || {
        RoW: 1,
      };
      if (!shares) {
        console.warn(`WARN (${i}): No share found for item "${itemName}".`);
        return;
      }

      const waste = wasteFactorsMap[category];
      if (!waste) {
        console.warn(
          `WARN (${i}): No waste found for category "${category}" (item "${itemName}").`
        );
        return;
      }

      // And we store in the final results as a list, to be made into a csv.
      Object.entries(shares).forEach(([prodCountry, share]) => {
        rpcParametersPerCountry[consumerCountry].push([
          suaCode,
          suaName,
          category,
          prodCountry,
          share,
          0,
          waste,
        ]);
      });
    });
  });

  const HEADER =
    "SUA Code,SUA Name,Category,Producer Country,Share,Organic,Waste";

  countries.forEach((country) => {
    const body = rpcParametersPerCountry[country]
      .map((x) => x.map((val) => maybeQuote(val)).join(","))
      .join("\n");

    const data = HEADER + "\n" + body;

    fs.writeFileSync(path.resolve("./csv-out", `${country}-rpc.csv`), data);
  });

  // printItemCountries(Object.values(results));
  // printCategories(Object.values(results));
}

main(process.argv.slice(2));
