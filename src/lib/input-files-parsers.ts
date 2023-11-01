import { parseCsvFile } from "@/lib/utils";

export function parseEmissionsFactorsPackaging(csvString: string) {
  const array = parseCsvFile(csvString)
    // Remove any empty rows
    .filter((row) => row.some((cell) => cell.length > 0))
    .slice(1, 10);

  // TODO: Check if missing rows
  // TODO: Check if invalid packaging types

  return Object.fromEntries(
    array.map(([pType, ...efs]) => [
      pType,
      efs.map((x) => Number.parseFloat(x)),
    ])
  );
}
