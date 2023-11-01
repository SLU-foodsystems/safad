import emissionsFactorsPackagingUrl from "@/default-input-files/emissions-factors-packaging.csv?url";
import emissionsFactorsEnergyUrl from "@/default-input-files/emissions-factors-energy.csv?url";
import emissionsFactorsTransportUrl from "@/default-input-files/emissions-factors-transport.csv?url";
import processesEnergyDemandsUrl from "@/default-input-files/processes-energy-demands.csv?url";
import processesAndPackagingUrl from "@/default-input-files/processes-packaging.csv?url";

import {
  parseEmissionsFactorsEnergy,
  parseEmissionsFactorsPackaging,
  parseEmissionsFactorsTransport,
  parseProcessesEnergyDemands,
  parseProcessesPackaging,
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

export async function emissionsFactorsTransport() {
  return fetchAndParseFile(
    emissionsFactorsTransportUrl,
    parseEmissionsFactorsTransport
  );
}

export async function processesEnergyDemands() {
  return fetchAndParseFile(
    processesEnergyDemandsUrl,
    parseProcessesEnergyDemands
  );
}

export async function processesAndPackagingData() {
  return fetchAndParseFile(processesAndPackagingUrl, parseProcessesPackaging);
}
