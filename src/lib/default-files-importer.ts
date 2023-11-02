import emissionsFactorsPackagingUrl from "@/default-input-files/emissions-factors-packaging.csv?url";
import emissionsFactorsEnergyUrl from "@/default-input-files/emissions-factors-energy.csv?url";
import emissionsFactorsTransportUrl from "@/default-input-files/emissions-factors-transport.csv?url";
import processesEnergyDemandsUrl from "@/default-input-files/processes-energy-demands.csv?url";
import processesAndPackagingUrl from "@/default-input-files/processes-packaging.csv?url";

import footprintsRpcsUrl from "@/default-input-files/footprints-rpcs.csv?url";

const wasteRetailAndConsumerUrls = import.meta.glob(
  "@/default-input-files/waste-retail-and-consumer/*.csv",
  { as: "url", eager: true }
);

import {
  parseEmissionsFactorsEnergy,
  parseEmissionsFactorsPackaging,
  parseEmissionsFactorsTransport,
  parseFootprintsRpcs,
  parseProcessesEnergyDemands,
  parseProcessesPackaging,
  parseWasteRetailAndConsumer,
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

export async function footprintsRpcs() {
  return fetchAndParseFile(footprintsRpcsUrl, parseFootprintsRpcs);
}

export async function wasteRetailAndConsumer(countryCode: string) {
  const keys = Object.keys(wasteRetailAndConsumerUrls);

  const csvFileUrlKey = keys.find((k) => k.endsWith(`${countryCode}.csv`));
  if (!csvFileUrlKey) {
    const alts = keys.join(", ");
    throw new Error(`Invalid country code. Received ${countryCode}, expected one of ${alts}.`);
  }

  return fetchAndParseFile(
    wasteRetailAndConsumerUrls[csvFileUrlKey],
    parseWasteRetailAndConsumer
  );
}
