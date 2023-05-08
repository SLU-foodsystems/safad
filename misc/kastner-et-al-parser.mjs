import { readCsv } from "./utils.mjs";
const ROW_THRESHOLD = 0.10;
const RESULT_PRECISION = 3;

const DEBUG_ITEM_NAMES = false;

const roundToDp = (value, dp = 2) => Math.round(value * 10 ** dp) / 10 ** dp;

const countries = new Set();

function main(args) {
  const csvpath = args[0];
  const country = args[1];

  const matrix = readCsv(csvpath, ";", true);
  const filtered = matrix
    // Skip all other countries
    .filter((row) => row[6] == country)
    .map((x) => ({
      amount: parseFloat(x[3]),
      producerCountry: x[7],
      itemName: x[8],
    }));

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
  const simplifiedProportions = {};
  Object.keys(allProportions).forEach((itemName) => {
    const result = {};

    // Step 3a: Only transfer value if larger than threshold, else sum to RoW
    Object.entries(allProportions[itemName]).forEach(([country, value]) => {
      if (value > ROW_THRESHOLD) {
        result[country] = value;
        countries.add(country);
      } else {
        result.RoW = (result.RoW || 0) + value;
      }

      // if (value < 0) console.log(itemName, country, value);
    });


    // TODO: Do we want to delete (and adjust for) ROW if it is too low?

    // Step 3b: Round to precision to avoid ca 20 decimal points.
    simplifiedProportions[itemName] = Object.fromEntries(
      Object.entries(result).map(([k, v]) => [
        k,
        roundToDp(v, RESULT_PRECISION),
      ])
    );
  });



  [...countries].sort().forEach((x, i) => console.log(i, x))
  // if (DEBUG_ITEM_NAMES) {
  //   [...allItems].sort().forEach(x => console.log(x))
  // } else {
  //   console.log(JSON.stringify(simplifiedProportions, null, 2));
  // }
}

main(process.argv.slice(2));
