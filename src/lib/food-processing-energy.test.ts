import { describe, expect, test } from "vitest";
import recipesCsv from "@/default-input-files/SAFAD IP Recipes.csv?raw";
import energyCsv from "@/default-input-files/SAFAD IP Energy Proc.csv?raw";
import {
  parseFoodsRecipes,
  parseProcessesEnergyDemands,
} from "./input-files-parsers";
import {
  computeFoodProcessEnergy,
  computeFoodRecipeAmounts,
} from "./food-processing-energy";

const recipes = parseFoodsRecipes(recipesCsv);
const energy = parseProcessesEnergyDemands(energyCsv);
const sum = (food: string) =>
  Object.values(computeFoodProcessEnergy(recipes, energy)[food] || {})
    .flat()
    .reduce((total, value) => total + value, 0);

describe("PDF processing-energy examples", () => {
  test("matches bread, porridge, cheese, pizza-base and pizza totals", () => {
    // White bread
    expect(sum("A.01.04.001.001")).toBeCloseTo(3.615, 2);
    // Oat porrdige: avg of 1.55 (milk) + 1.24 (water)
    expect(sum("A.01.06.007.001")).toBeCloseTo(1.394, 2);
    // Cheddar
    expect(sum("A.08.08.049")).toBeCloseTo(4.711, 2);
    expect(sum("A.08.08.120")).toBeCloseTo(2.983, 2);
    expect(sum("I.19.01.002.009")).toBeCloseTo(4.068, 2);
    expect(sum("I.19.01.002.013")).toBeCloseTo(4.578, 2);
  });

  test("reports gross and net intermediate recipe amounts", () => {
    const amounts = computeFoodRecipeAmounts({
      food: [["ingredient", [], 0.5, 0.8, [], 0, true, false]],
      ingredient: [["raw", [], 0.25, 0.5, [], 0, true, false]],
    });

    expect(amounts.food).toEqual([
      {
        component: "ingredient",
        grossAmount: 500,
        reverseYield: 0.8,
        netAmount: 400,
        level: 0,
      },
      {
        component: "raw",
        grossAmount: 100,
        reverseYield: 0.5,
        netAmount: 50,
        level: 1,
      },
    ]);
  });
});
