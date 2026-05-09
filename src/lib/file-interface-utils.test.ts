import * as Parsers from "./input-files-parsers";
import { describe, expect, test, vi } from "vitest";
import { setFile } from "./file-interface-utils";

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

async function parseWithSemicolon<T>(
  parser: (csvStr: string, delim?: string) => T,
  semiColonCsvString: string
) {
  const fileInterface = mockFileInterface<T>(parser);
  const payload = {
    data: semiColonCsvString,
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
  /**
   * Ensure that the file-setter recovers when we try to upload a file with
   * semicolons.
   */
  test("Successfully recovers when parser throws semicolon error", async () => {
    function mockParser(csvString: string, delimiter = ",") {
      const data = csvString.split("\n").map((row) => row.split(delimiter));

      // Dummy, simplified catch of semicolon-delimited csv
      if (data.every((row) => row.some((cell) => cell.includes(";")))) {
        throw new Parsers.CsvValidationError(
          Parsers.CsvValidationErrorType.SemiColon
        );
      }

      return data;
    }

    await parseWithSemicolon(mockParser, "foo;bar;baz\ndata1;data2;data3");
  });
});
