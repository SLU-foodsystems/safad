import recipesFileCsv from "../default-input-files/SAFAD IP Recipes.csv?raw";
import categoryNamesCsv from "@/data/efsa-category-names.csv?raw";
import { parseCsvFile } from "./utils";

const _extractRpcNamesFromRecipe = (recipesFileCsv: string) => {
  const names: Record<string, string> = {};
  parseCsvFile(recipesFileCsv)
    .slice(1) // drop header in csv file
    .forEach(([code, name, ingredientCode, ingredientName]) => {
      names[code] = name;
      names[ingredientCode] = ingredientName;
    });
  return names;
};

export const defaultRpcNames = Object.freeze(
  _extractRpcNamesFromRecipe(recipesFileCsv)
);

export const extractRpcNamesFromRecipe = (recipesFileCsv: string) => ({
  ...defaultRpcNames,
  ..._extractRpcNamesFromRecipe(recipesFileCsv),
});

export const categoryNames = Object.fromEntries(
  parseCsvFile(categoryNamesCsv)
    .slice(1)
    .map(([code, name]) => [code, name])
);
