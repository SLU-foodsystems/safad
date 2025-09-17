import categoryNamesCsv from "@/data/efsa-category-names.csv?raw";
import { parseCsvFile } from "./utils";
import * as DefaultInputFiles from "./default-input-files";

export const _extractRpcNamesFromRecipe = (recipesFileCsv: string) => {
  const names: Record<string, string> = {};
  parseCsvFile(recipesFileCsv)
    .slice(1) // drop header in csv file
    .forEach(([code, name, ingredientCode, ingredientName]) => {
      if (code && typeof code === "string" && typeof name === "string") {
        names[code] = name;
      }
      if (
        ingredientCode &&
        typeof ingredientCode === "string" &&
        typeof ingredientName === "string"
      ) {
        names[ingredientCode] = ingredientName;
      }
    });
  return names;
};

let _defaultRpcNames: Record<string, string>;
export const defaultRpcNames = async () => {
  if (_defaultRpcNames) return _defaultRpcNames;

  const names = Object.freeze(
    _extractRpcNamesFromRecipe(await DefaultInputFiles.raw.foodsRecipes())
  );

  _defaultRpcNames = names;

  return names;
};

export const extractRpcNamesFromRecipe = (
  recipesFileCsv: string,
  withDefault = true
) => ({
  ...(withDefault ? _defaultRpcNames || {} : {}),
  ..._extractRpcNamesFromRecipe(recipesFileCsv),
});

export const categoryNames = Object.fromEntries(
  parseCsvFile(categoryNamesCsv)
    .slice(1)
    .map(([code, name]) => [code, name])
);
