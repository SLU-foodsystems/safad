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

export function parseEmissionsFactorsEnergy(csvString: string) {
  const csv = parseCsvFile(csvString).slice(1); // Drop Header

  const emissionsFactors: Record<string, number[] | Record<string, number[]>> =
    { Electricity: {} };

  csv
    .map((row) => row.map((x) => x.trim()))
    .forEach(([carrier, _country, countryCode, ...ghgsStrs]) => {
      const ghgs = ghgsStrs.map((x) => (x ? parseFloat(x) : 0));
      if (carrier === "Electricity") {
        (emissionsFactors[carrier] as Record<string, number[]>)[countryCode] =
          ghgs;
      } else {
        emissionsFactors[carrier] = ghgs;
      }
    });

  return emissionsFactors;
}
