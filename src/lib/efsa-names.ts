import recipesFileCsv from "../default-input-files/SAFAD IP Recipes.csv?raw";
import categoryNamesCsv from "@/data/efsa-category-names.csv?raw";
import { parseCsvFile } from "./utils";

export const rpcNames: Record<string, string> = {};
parseCsvFile(recipesFileCsv)
  .slice(1) // drop header in csv file
  .forEach(([code, name, componentCode, componentName]) => {
    rpcNames[code] = name;
    rpcNames[componentCode] = componentName;
  });

export const categoryNames = Object.fromEntries(
  parseCsvFile(categoryNamesCsv)
    .slice(1)
    .map(([code, name]) => [code, name])
);
