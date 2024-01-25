import recipesFileCsv from "../default-input-files/SAFAD IP Recipes.csv?raw";
import { parseCsvFile } from "./utils";

const names: Record<string, string> = {};

parseCsvFile(recipesFileCsv)
  .slice(1) // drop header in csv file
  .forEach(([code, name, componentCode, componentName]) => {
    names[code] = name;
    names[componentCode] = componentName;
  });

export default names;
