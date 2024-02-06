import * as fs from "node:fs/promises";
import * as path from "path";
import { exec } from "node:child_process";
import { type Stats } from "node:fs";
import { promisify } from "node:util";

/**
 * Pad a number with zeroes
 */
const pad = (number: number, minLen = 2): string => {
  const str = number.toString();
  const missingDigits = minLen - str.length;
  if (missingDigits > 0) {
    return "0".repeat(missingDigits) + str;
  }
  return str;
};

/**
 * Converts a Date object to a YYYY-MM-DD string
 */
const dateToString = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default async function statCsvFiles(csvBasePath: string) {
  if (!csvBasePath) {
    throw new Error(
      "Missing argument. Expected the path to the folder in which the input files reside."
    );
  }

  const isDirectory = (await fs.stat(csvBasePath)).isDirectory();
  if (!isDirectory) {
    throw new Error(
      "No directory found at path. Expected path to point to a directory."
    );
  }

  const matches = await fs.readdir(csvBasePath, { recursive: true });

  const csvMatches =
    // For each of the file names, add the FileStats to it
    matches.filter(
      (fName) =>
        path.extname(path.resolve(csvBasePath, fName)).toLowerCase() === ".csv"
    );

  const filesDatePairs = await Promise.all(
    // Use git to find out last-changed date
    csvMatches.map(async (fName): Promise<[string, string]> => {
      try {
        // Format %ai gives output like: "2024-02-04 12:19:10 +0100"

        const { stdout, stderr } = await promisify(exec)(
          `git log -n 1 --pretty=format:%ai "${csvBasePath}/${fName}"`
        );

        if (stderr) throw new Error("stderr: " + stderr);

        const dateObj = new Date(stdout.trim());
        return [fName, dateToString(dateObj)];
      } catch (err) {
        console.error(err);
        // Fall-back to build-date
        return [fName, dateToString(new Date())];
      }
    })
  );

  return Object.fromEntries(filesDatePairs);
}
