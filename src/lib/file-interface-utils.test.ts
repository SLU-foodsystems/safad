import * as Parsers from "./input-files-parsers";
import { parseCsvFile } from "./utils";
import { describe, expect, test, vi } from "vitest";
import { setFile } from "./file-interface-utils";

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

function mockFileInterface<T>(
  parser: (data: string, delim?: string) => T
): InputFile<T> {
  const fileInterface: InputFile<T> = {
    state: "default",
    comment: "",
    defaultName: () => "test-file.csv",

    // Not needed
    getDefault: () => Promise.resolve(""),
    lastModified: () => "",

    // Spy on:
    parser,
    setter: vi.fn(),

    name: "Mock file interface",
    data: "",
  };

  vi.spyOn(fileInterface, "parser");
  vi.spyOn(fileInterface, "setter");

  return fileInterface;
}

const makeCsvString = (data: string[][], delim: string) =>
  data
    .map((row) =>
      row
        .map((cell) => (cell && cell.includes(delim) ? `"${cell}"` : cell))
        .join(delim)
    )
    .join("\n");

/**
 * Test that the file setter recovers when we try to upload a file with
 * semicolons.
 *
 * This is a bit of a ruckus, as we're somewhat testing the implementation
 * details by passing actual parsers, rather than a more generic test.
 * But it's convenient in that it catches more things that could go wrong, i.e.,
 * it's somewhat of an abomination between a unit and an integration tests.
 *
 * Could mock the parser and the data, and test on a more abstract level. That
 * would require the implementation detail of the specific semi-colon error,
 * and also some type juggling
 *
 * Sorry!
 */

async function parseWithSemicolon<T>(
  parser: (csvStr: string, delim?: string) => T,
  csvString: string
) {
  const reencodedWithSemiColon = makeCsvString(
    parseCsvFile(csvString, { delimiter: "," }),
    ";"
  );

  const fileInterface = mockFileInterface<T>(parser);
  const payload = {
    data: reencodedWithSemiColon,
    name: "test-file-x.csv",
  };

  await setFile(payload, fileInterface);

  expect(fileInterface.setter).toHaveBeenCalledOnce();
  // Called twice: one with "," and once with ";". No need to be specific about
  // that though, as it's more of an implementation detail
  expect(fileInterface.parser).toHaveBeenCalled();

  // Set the file-name correctly
  expect(fileInterface.state).toEqual("custom");
  expect(fileInterface.name).toEqual("test-file-x.csv");
}

describe("FileInterfaceUtils.setFile", () => {
  describe("Successfully recovers when csv is encoded with a semi-colon", () => {
    test("parseEmissionsFactorsPackaging", async () => {
      await parseWithSemicolon(
        Parsers.parseEmissionsFactorsPackaging,
        emissionsFactorsPackagingCsv
      );
    });

    test("parseEmissionsFactorsEnergy", async () => {
      await parseWithSemicolon(
        Parsers.parseEmissionsFactorsEnergy,
        emissionsFactorsEnergyCsv
      );
    });

    test("parseEmissionsFactorsTransport", async () => {
      await parseWithSemicolon(
        Parsers.parseEmissionsFactorsTransport,
        emissionsFactorsTransportCsv
      );
    });

    test("parseProcessesEnergyDemands", async () => {
      await parseWithSemicolon(
        Parsers.parseProcessesEnergyDemands,
        processesEnergyDemandsCsv
      );
    });

    test("parsePreparationProcesses", async () => {
      await parseWithSemicolon(
        Parsers.parsePreparationProcesses,
        preparationProcessesCsv
      );
    });
    test("parsePackagingCodes", async () => {
      await parseWithSemicolon(Parsers.parsePackagingCodes, packagingCodesCsv);
    });

    test("parseFootprintsRpcs", async () => {
      await parseWithSemicolon(Parsers.parseFootprintsRpcs, footprintsRpcsCsv);
    });
    test("parseFoodsRecipes", async () => {
      await parseWithSemicolon(Parsers.parseFoodsRecipes, foodsRecipesCsv);
    });
    test("parseWasteRetailAndConsumer", async () => {
      await parseWithSemicolon(
        Parsers.parseWasteRetailAndConsumer,
        wasteRetailAndConsumerCsv
      );
    });
    test("parseDiet", async () => {
      await parseWithSemicolon(Parsers.parseDiet, dietCsv);
    });
    test("parseRpcOriginWaste", async () => {
      await parseWithSemicolon(Parsers.parseRpcOriginWaste, rpcOriginWasteCsv);
    });
    test("parseSfaRecipes", async () => {
      await parseWithSemicolon(Parsers.parseSfaRecipes, sfaRecipesCsv);
    });
  });
});
