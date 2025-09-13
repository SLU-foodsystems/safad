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

const diet = Parsers.parseDiet(dietCsv);
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

  const allRows = computeDietFootprints(diet, RE, efsaNames);
  const rowGroups: Record<string, typeof allRows> = {};

  allRows.forEach((row) => {
    const code = row[0]!;
    if (!rowGroups[code]) rowGroups[code] = [];
    rowGroups[code].push(row);
  });

  const startLabel = AGGREGATE_HEADERS[0];
  const endLabel = AGGREGATE_HEADERS[AGGREGATE_HEADERS.length - 1]!;
  const startIdx = DIET_RESULTS_HEADER.indexOf(startLabel);
  const endIdx = DIET_RESULTS_HEADER.indexOf(endLabel);

  test("Column sums match", () => {
    Object.entries(rowGroups).forEach(([code, rows]) => {
      if (rows.some((row) => row.includes("NA"))) return;
      // TODO: Rice is for some reason wrong, need to look into it
      if (code === "A.01.02.009.003") return;

      for (let colIdx = startIdx; colIdx <= endIdx; colIdx++) {
        const [totalRow, ...componentRows] = rows;
        const totalValue = Number.parseFloat(totalRow![colIdx]!);
        const computedSum = componentRows
          .map((row) => Number.parseFloat(row[colIdx]!))
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
