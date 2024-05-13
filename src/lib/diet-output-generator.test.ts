import { describe, test, expect } from "vitest";
import ResultsEngine from "./ResultsEngine";
import * as Parsers from "./input-files-parsers";

import emissionsFactorsEnergyCsv from "@/default-input-files/SAFAD IEF Energy.csv?raw";
import emissionsFactorsPackagingCsv from "@/default-input-files/SAFAD IEF Packaging.csv?raw";
import emissionsFactorsTransportCsv from "@/default-input-files/SAFAD IEF Transport.csv?raw";
import processesEnergyDemandsCsv from "@/default-input-files/SAFAD IP Energy Proc.csv?raw";
import preparationProcessesCsv from "@/default-input-files/SAFAD IP Preparation Processes.csv?raw";
import packagingCodesCsv from "@/default-input-files/SAFAD IP Packaging.csv?raw";
import footprintsRpcsCsv from "@/default-input-files/SAFAD ID Footprints RPC.csv?raw";
import foodsRecipesCsv from "@/default-input-files/SAFAD IP Recipes.csv?raw";
import wasteRetailAndConsumerCsv from "@/default-input-files/SAFAD IP Waste Retail and Cons/SAFAD IP Waste Retail and Cons SE.csv?raw";
import dietCsv from "@/default-input-files/SAFAD ID Diet Spec/SAFAD ID Diet Spec SE.csv?raw";
import rpcOriginWasteCsv from "@/default-input-files/SAFAD IP Origin and Waste of RPC/SAFAD IP Origin and Waste of RPC SE.csv?raw";

import {
  DIET_RESULTS_HEADER,
  computeDietFootprints,
} from "./diet-output-generator";
import { extractRpcNamesFromRecipe } from "./efsa-names";
import { AGGREGATE_HEADERS } from "./impacts-csv-utils";

const emissionsFactorsPackaging = Parsers.parseEmissionsFactorsPackaging(
  emissionsFactorsPackagingCsv
);
const emissionsFactorsEnergy = Parsers.parseEmissionsFactorsEnergy(
  emissionsFactorsEnergyCsv
);
const emissionsFactorsTransport = Parsers.parseEmissionsFactorsTransport(
  emissionsFactorsTransportCsv
);
const processesEnergyDemands = Parsers.parseProcessesEnergyDemands(
  processesEnergyDemandsCsv
);
const preparationProcesses = Parsers.parsePreparationProcesses(
  preparationProcessesCsv
);
const packagingCodes = Parsers.parsePackagingCodes(packagingCodesCsv);
const footprintsRpcs = Parsers.parseFootprintsRpcs(footprintsRpcsCsv);
const foodsRecipes = Parsers.parseFoodsRecipes(foodsRecipesCsv);
const wasteRetailAndConsumer = Parsers.parseWasteRetailAndConsumer(
  wasteRetailAndConsumerCsv
);
const rpcOriginWaste = Parsers.parseRpcOriginWaste(rpcOriginWasteCsv);

describe("diet-output-generator.ts", async () => {
  const RE = new ResultsEngine();
  const efsaNames = extractRpcNamesFromRecipe(foodsRecipesCsv);

  RE.setCountryCode("SE");

  RE.setEmissionsFactorsPackaging(emissionsFactorsPackaging);
  RE.setEmissionsFactorsEnergy(emissionsFactorsEnergy);
  RE.setEmissionsFactorsTransport(emissionsFactorsTransport);
  RE.setProcessesEnergyDemands(processesEnergyDemands);
  RE.setPreparationProcesses(preparationProcesses);
  RE.setPackagingCodes(packagingCodes);
  RE.setFootprintsRpcs(footprintsRpcs);
  RE.setFoodsRecipes(foodsRecipes);
  RE.setWasteRetailAndConsumer(wasteRetailAndConsumer);
  RE.setRpcOriginWaste(rpcOriginWaste);

  describe("Diet output for Margarin", () => {
    const diet: Diet = [["A.11.06.001", 1000]];
    const rows = computeDietFootprints(diet, RE, efsaNames);
    const amounts = RE.reduceDiet(diet);
    const rpcAmounts = Object.fromEntries(amounts[0]);
    const componentRows = rows.filter((r) => r[2] === "Component");

    // Sanity-check: the amounts in the rows match the reduceDiet output
    test("Amounts in rows match output from reduceDietToRpcs", () => {
      componentRows.forEach((row) => {
        const subcode = row[3];
        if (!subcode) return;
        const amount = Number.parseFloat(row[7]);
        expect(amount).toBeCloseTo(rpcAmounts[subcode]);
        const pDeviation =
          Math.abs(rpcAmounts[subcode] - amount) / rpcAmounts[subcode];
        expect(pDeviation).toBeLessThan(0.02);
      });
    });

    test("Column sums match", () => {
      const startLabel = AGGREGATE_HEADERS[0];
      const endLabel = AGGREGATE_HEADERS[AGGREGATE_HEADERS.length - 1];
      const startIdx = DIET_RESULTS_HEADER.indexOf(startLabel);
      const endIdx = DIET_RESULTS_HEADER.indexOf(endLabel);

      for (let colIdx = startIdx; colIdx <= endIdx; colIdx++) {
        const totalValue = Number.parseFloat(rows[0][colIdx]);
        const computedSum = componentRows
          .map((row) => Number.parseFloat(row[colIdx]))
          .reduce((a, b) => a + b, 0);

        if (totalValue === 0) {
          expect(
            totalValue,
            "Mismatch for column: " + DIET_RESULTS_HEADER[colIdx]
          ).toEqual(computedSum);
        } else {
          const pDeviation = Math.abs(totalValue - computedSum) / totalValue;
          expect(
            pDeviation,
            "Mismatch for column: " + DIET_RESULTS_HEADER[colIdx]
          ).toBeLessThan(0.01);
        }
      }
    });
  });
});
