import * as fs from "node:fs/promises";
import * as path from "path";
import { type Stats } from "node:fs";

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

  const filesMTimePairs = (
    await Promise.all(
      // For each of the file names, add the FileStats to it
      matches.map(
        async (fName): Promise<[string, Stats]> => [
          fName,
          await fs.stat(path.resolve(csvBasePath, fName)),
        ]
      )
    )
  )
    // Filter out any directories
    .filter(([_fName, stats]) => stats.isFile())
    // And then keep only fileName and the last-modified time
    .map(([fName, stat]) => [fName, dateToString(stat.mtime)]);

  return Object.fromEntries(filesMTimePairs);
}
