import emissionsFactorsPackagingUrl from "@/default-input-files/emissions-factors-packaging.csv?url";
import emissionsFactorsEnergyUrl from "@/default-input-files/emissions-factors-energy.csv?url";
import emissionsFactorsTransportUrl from "@/default-input-files/emissions-factors-transport.csv?url";
import processesEnergyDemandsUrl from "@/default-input-files/processes-energy-demands.csv?url";
import preparationProcessesAndPackagingUrl from "@/default-input-files/preparation-processes-and-packaging.csv?url";

import footprintsRpcsUrl from "@/default-input-files/footprints-rpcs.csv?url";
import foodsRecipesUrl from "@/default-input-files/foods-recipes.csv?url";

const wasteRetailAndConsumerUrls = import.meta.glob(
  "@/default-input-files/waste-retail-and-consumer/*.csv",
  { as: "url", eager: true }
);

const dietsUrls = import.meta.glob("@/default-input-files/diets/*.csv", {
  as: "url",
  eager: true,
});

const rpcOriginWasteUrls = import.meta.glob(
  "@/default-input-files/rpc-origin-waste/*.csv",
  {
    as: "url",
    eager: true,
  }
);

import {
  parseDiet,
  parseEmissionsFactorsEnergy,
  parseEmissionsFactorsPackaging,
  parseEmissionsFactorsTransport,
  parseFootprintsRpcs,
  parseProcessesEnergyDemands,
  parseProcessesPackaging,
  parseRecipeFile,
  parseRpcOriginWaste,
  parseWasteRetailAndConsumer,
} from "./input-files-parsers";
import type ResultsEngine from "./ResultsEngine";

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

export async function fetchAndParseCountrySpecificFile<T>(
  countryCode: string,
  urlsMap: Record<string, string>,
  parser: (fileContent: string) => T
) {
  const keys = Object.keys(urlsMap);

  const csvFileUrlKey = keys.find((k) => k.endsWith(`${countryCode}.csv`));
  if (!csvFileUrlKey) {
    const alts = keys.join(", ");
    throw new Error(
      `Invalid country code. Received ${countryCode}, expected one of ${alts}.`
    );
  }

  return fetchAndParseFile(urlsMap[csvFileUrlKey], parser);
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

export async function preparationProcessesAndPackaging() {
  return fetchAndParseFile(
    preparationProcessesAndPackagingUrl,
    parseProcessesPackaging
  );
}

export async function footprintsRpcs() {
  return fetchAndParseFile(footprintsRpcsUrl, parseFootprintsRpcs);
}

export async function wasteRetailAndConsumer(countryCode: string) {
  return fetchAndParseCountrySpecificFile(
    countryCode,
    wasteRetailAndConsumerUrls,
    parseWasteRetailAndConsumer
  );
}

export async function diet(countryCode: string) {
  return fetchAndParseCountrySpecificFile(countryCode, dietsUrls, parseDiet);
}

export async function rpcOriginWaste(countryCode: string) {
  return fetchAndParseCountrySpecificFile(
    countryCode,
    rpcOriginWasteUrls,
    parseRpcOriginWaste
  );
}

export async function foodsRecipes() {
  return await fetchAndParseFile(foodsRecipesUrl, parseRecipeFile);
}

export async function configureResultsEngine(
  resultsEngine: ResultsEngine,
  countryCode: string
) {

  resultsEngine.setCountryCode(countryCode);

  resultsEngine.setFoodsRecipes(await foodsRecipes());
  resultsEngine.setFootprintsRpcs(await footprintsRpcs());

  resultsEngine.setEmissionsFactorsPackaging(await emissionsFactorsPackaging());
  resultsEngine.setEmissionsFactorsEnergy(await emissionsFactorsEnergy());
  resultsEngine.setEmissionsFactorsTransport(await emissionsFactorsTransport());

  resultsEngine.setProcessesEnergyDemands(await processesEnergyDemands());
  resultsEngine.setPrepProcessesAndPackaging(
    await preparationProcessesAndPackaging()
  );
  resultsEngine.setWasteRetailAndConsumer(
    await wasteRetailAndConsumer(countryCode)
  );
  resultsEngine.setRpcOriginWaste(await rpcOriginWaste(countryCode));
}
