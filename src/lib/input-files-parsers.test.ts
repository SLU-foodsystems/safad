import { describe, expect, test } from "vitest";
import * as Parsers from "./input-files-parsers";
import { parseCsvFile } from "./utils";

import emissionsFactorsEnergyCsv from "@/default-input-files/SAFAD IEF Energy.csv?raw";
import emissionsFactorsPackagingCsv from "@/default-input-files/SAFAD IEF Packaging.csv?raw";
import emissionsFactorsTransportCsv from "@/default-input-files/SAFAD IEF Transport.csv?raw";
import processesEnergyDemandsCsv from "@/default-input-files/SAFAD IP Energy Proc.csv?raw";
import preparationProcessesCsv from "@/default-input-files/SAFAD IP Preparation Processes.csv?raw";
import packagingCodesCsv from "@/default-input-files/SAFAD IP Packaging.csv?raw";
import footprintsRpcsCsv from "@/default-input-files/SAFAD ID Footprints RPC.csv?raw";
import foodsRecipesCsv from "@/default-input-files/SAFAD IP Recipes.csv?raw";
import sfaRecipesCsv from "@/default-input-files/SAFAD IP SFA Recipes.csv?raw";
import wasteRetailAndConsumerCsv from "@/default-input-files/SAFAD IP Waste Retail and Cons/SAFAD IP Waste Retail and Cons SE.csv?raw";
import dietCsv from "@/default-input-files/SAFAD ID Diet Spec/SAFAD ID Diet Spec SE.csv?raw";
import rpcOriginWasteCsv from "@/default-input-files/SAFAD IP Origin and Waste of RPC/SAFAD IP Origin and Waste of RPC SE.csv?raw";

function expectThrowsForSemicolon(
  parser: (csvStr: string, delim?: string) => any,
  csvString: string
) {
  const reencodedWithSC = parseCsvFile(csvString, { delimiter: "," })
    .map((row) =>
      row
        .map((cell) => (cell && cell.includes(";") ? `"${cell}"` : cell))
        .join(";")
    )
    .join("\n");

  return expect(() => parser(reencodedWithSC, ",")).toThrow(
    expect.objectContaining({
      type: Parsers.CsvValidationErrorType.SemiColon,
    })
  );
}

describe("default-input-files.ts", () => {
  test("parseEmissionsFactorsPackaging", () =>
    Parsers.parseEmissionsFactorsPackaging(emissionsFactorsPackagingCsv));
  test("parseEmissionsFactorsEnergy", () =>
    Parsers.parseEmissionsFactorsEnergy(emissionsFactorsEnergyCsv));
  test("parseEmissionsFactorsTransport", () =>
    Parsers.parseEmissionsFactorsTransport(emissionsFactorsTransportCsv));
  test("parseProcessesEnergyDemands", () =>
    Parsers.parseProcessesEnergyDemands(processesEnergyDemandsCsv));
  test("parsePreparationProcesses", () =>
    Parsers.parsePreparationProcesses(preparationProcessesCsv));
  test("parsePackagingCodes", () =>
    Parsers.parsePackagingCodes(packagingCodesCsv));
  test("parseFootprintsRpcs", () =>
    Parsers.parseFootprintsRpcs(footprintsRpcsCsv));
  test("parseFoodsRecipes", () => Parsers.parseFoodsRecipes(foodsRecipesCsv));
  test("parseWasteRetailAndConsumer", () =>
    Parsers.parseWasteRetailAndConsumer(wasteRetailAndConsumerCsv));
  test("parseDiet", () => Parsers.parseDiet(dietCsv));
  test("parseRpcOriginWaste", () =>
    Parsers.parseRpcOriginWaste(rpcOriginWasteCsv));
  test("parseSfaRecipes", () => Parsers.parseSfaRecipes(sfaRecipesCsv));

  describe("Successfully recovers when csv is encoded with a semi-colon", () => {
    test("parseEmissionsFactorsPackaging", () =>
      expectThrowsForSemicolon(
        Parsers.parseEmissionsFactorsPackaging,
        emissionsFactorsPackagingCsv
      ));

    test("parseEmissionsFactorsEnergy", () =>
      expectThrowsForSemicolon(
        Parsers.parseEmissionsFactorsEnergy,
        emissionsFactorsEnergyCsv
      ));

    test("parseEmissionsFactorsTransport", () =>
      expectThrowsForSemicolon(
        Parsers.parseEmissionsFactorsTransport,
        emissionsFactorsTransportCsv
      ));

    test("parseProcessesEnergyDemands", () =>
      expectThrowsForSemicolon(
        Parsers.parseProcessesEnergyDemands,
        processesEnergyDemandsCsv
      ));

    test("parsePreparationProcesses", () =>
      expectThrowsForSemicolon(
        Parsers.parsePreparationProcesses,
        preparationProcessesCsv
      ));

    test("parsePackagingCodes", () =>
      expectThrowsForSemicolon(Parsers.parsePackagingCodes, packagingCodesCsv));

    test("parseFootprintsRpcs", () =>
      expectThrowsForSemicolon(Parsers.parseFootprintsRpcs, footprintsRpcsCsv));
    test("parseFoodsRecipes", () =>
      expectThrowsForSemicolon(Parsers.parseFoodsRecipes, foodsRecipesCsv));
    test("parseWasteRetailAndConsumer", () =>
      expectThrowsForSemicolon(
        Parsers.parseWasteRetailAndConsumer,
        wasteRetailAndConsumerCsv
      ));
    test("parseDiet", () =>
      expectThrowsForSemicolon(Parsers.parseDiet, dietCsv));
    test("parseRpcOriginWaste", () =>
      expectThrowsForSemicolon(Parsers.parseRpcOriginWaste, rpcOriginWasteCsv));
    test("parseSfaRecipes", () =>
      expectThrowsForSemicolon(Parsers.parseSfaRecipes, sfaRecipesCsv));
  });
});
