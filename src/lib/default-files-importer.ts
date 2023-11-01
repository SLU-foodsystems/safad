import emissionsFactorsPackagingUrl from "@/default-input-files/emissions-factors-packaging.csv?url";
import emissionsFactorsEnergyUrl from "@/default-input-files/emissions-factors-energy.csv?url";
import {
  parseEmissionsFactorsEnergy,
  parseEmissionsFactorsPackaging,
} from "./input-files-parsers";

export async function fetchAndParseFile<T>(
  url: string,
  parser: (fileContent: string) => T
) {
  const csvString = await fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(res.statusText);
    }

    return res.text();
  });

  return parser(csvString);
}

export async function emissionsFactorsPackaging() {
  return fetchAndParseFile(
    emissionsFactorsPackagingUrl,
    parseEmissionsFactorsPackaging
  );
}

export async function emissionsFactorsEnergy() {
  return fetchAndParseFile(
    emissionsFactorsEnergyUrl,
    parseEmissionsFactorsEnergy
  );
}
