// Converts the full list of FoodEx recipes from csv to json.
// Input:
//
// Food code,Food name,Component code,Component name,Facet(s) code,Percentage,Probability
//
// Output:
//
// { [code]: { [component]: ratio as number }}
//
// Modifications include:
// - Remove any self-references.
// - Remove any empty objects

import { readCsv, roundToPrecision } from "./utils.mjs";

const concatenateSets = (...sets) =>
  new Set(sets.flatMap((set) => Array.from(set)));

const checkForLoops = (recipes, id) => {
  if (!(id in recipes)) {
    return new Set([id]);
  }

  const keys = Object.keys(recipes[id]);

  if (keys.includes(id)) {
    throw new Error("Key found in immediate child " + id);
  }

  const recursedKeys = concatenateSets(
    keys.map((key) => checkForLoops(recipes, key))
  );
  if (recursedKeys.has(id)) {
    throw new Error("Key found in deeper recursion");
  }
  return new Set(recursedKeys);
};



function deleteEmptyValues(obj) {
  const idsToDelete = [];
  Object.entries(obj).forEach(([id, values]) => {
    const nChildren = Object.keys(values).length;
    if (nChildren === 0) idsToDelete.push(id);
  });

  // Delete singles!
  idsToDelete.forEach(id => {
    delete obj[id];
  });
}

function removeSelfReferences(obj) {
  Object.entries(obj).forEach(([id, values]) => {
    if (id in values) delete values[id];
  });
}



function main(args) {
  const csv = readCsv(args[0], ",", true).slice(1); // drop header

  const recipes = {};

  // TODO: Ignoring facet here.
  csv.forEach(([code, component, _facet, perc, prob]) => {
    // TODO: may be a better / data-structure to store entries, rather than
    // the complete object (i.e. { code: [component, ratio][] })
    const value = roundToPrecision(parseFloat(perc) * parseFloat(prob), 3);

    if (value === 0) return;

    const entry = { [component]: value };

    if (code in recipes) {
      Object.assign(recipes[code], entry);
    } else {
      recipes[code] = entry;
    }
  });

  // Check for invalid sums!
  Object.keys(recipes).forEach((id) => {
    const sum = Object.values(recipes[id]).reduce((a, b) => a + b, 0);

    // if (roundToPrecision(sum, 2) !== 1) console.log(id, sum);
  });

  removeSelfReferences(recipes);
  deleteEmptyValues(recipes);

  // Log aliases
  // console.log(Object.entries(recipes).filter(([id]) => Object.values(recipes[id]).length === 1))

  // TODO: Ensure that there are no loops?
  // console.log(JSON.stringify(recipes, null, 2));
}

main(process.argv.slice(2));
