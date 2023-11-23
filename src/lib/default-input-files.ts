import * as Parsers from "./input-files-parsers";
import type ResultsEngine from "./ResultsEngine";

/**
 * Define all files we're importing, first the ones that are independent of
 * country, and then the ones dependent on country (code).
 */
import emissionsFactorsPackagingUrl from "@/default-input-files/emissions-factors-packaging.csv?url";
import emissionsFactorsEnergyUrl from "@/default-input-files/emissions-factors-energy.csv?url";
import emissionsFactorsTransportUrl from "@/default-input-files/emissions-factors-transport.csv?url";
import processesEnergyDemandsUrl from "@/default-input-files/processes-energy-demands.csv?url";
import preparationProcessesAndPackagingUrl from "@/default-input-files/preparation-processes-and-packaging.csv?url";
import footprintsRpcsUrl from "@/default-input-files/footprints-rpcs.csv?url";
import foodsRecipesUrl from "@/default-input-files/foods-recipes.csv?url";

// Per country
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

/**
 * Helper functions for fetching files
 */

async function fetchFile(url: string) {
  const csvString = await fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(res.statusText);
    }

    return res.text();
  });

  return csvString;
}

async function fetchCountrySpecificFile(
  countryCode: string,
  urlsMap: Record<string, string>
) {
  const keys = Object.keys(urlsMap);

  const csvFileUrlKey = keys.find((k) => k.endsWith(`${countryCode}.csv`));
  if (!csvFileUrlKey) {
    const alts = keys.join(", ");
    throw new Error(
      `Invalid country code. Received ${countryCode}, expected one of ${alts}.`
    );
  }

  return fetchFile(urlsMap[csvFileUrlKey]);
}

export const raw = {
  emissionsFactorsPackaging: () => fetchFile(emissionsFactorsPackagingUrl),
  emissionsFactorsEnergy: () => fetchFile(emissionsFactorsEnergyUrl),
  emissionsFactorsTransport: () => fetchFile(emissionsFactorsTransportUrl),
  processesEnergyDemands: () => fetchFile(processesEnergyDemandsUrl),
  preparationProcessesAndPackaging: () =>
    fetchFile(preparationProcessesAndPackagingUrl),
  footprintsRpcs: () => fetchFile(footprintsRpcsUrl),
  foodsRecipes: () => fetchFile(foodsRecipesUrl),
  wasteRetailAndConsumer: (countryCode: string) =>
    fetchCountrySpecificFile(countryCode, wasteRetailAndConsumerUrls),
  diet: (countryCode: string) =>
    fetchCountrySpecificFile(countryCode, dietsUrls),
  rpcOriginWaste: (countryCode: string) =>
    fetchCountrySpecificFile(countryCode, rpcOriginWasteUrls),
};

export const parsed = {
  async emissionsFactorsPackaging() {
    return Parsers.parseEmissionsFactorsPackaging(
      await raw.emissionsFactorsPackaging()
    );
  },

  async emissionsFactorsEnergy() {
    return Parsers.parseEmissionsFactorsEnergy(
      await raw.emissionsFactorsEnergy()
    );
  },

  async emissionsFactorsTransport() {
    return Parsers.parseEmissionsFactorsTransport(
      await raw.emissionsFactorsTransport()
    );
  },

  async processesEnergyDemands() {
    return Parsers.parseProcessesEnergyDemands(
      await raw.processesEnergyDemands()
    );
  },

  async preparationProcessesAndPackaging() {
    return Parsers.parseProcessesPackaging(
      await raw.preparationProcessesAndPackaging()
    );
  },

  async footprintsRpcs() {
    return Parsers.parseFootprintsRpcs(await raw.footprintsRpcs());
  },

  async foodsRecipes() {
    return Parsers.parseFoodsRecipes(await raw.foodsRecipes());
  },

  async wasteRetailAndConsumer(countryCode: string) {
    return Parsers.parseWasteRetailAndConsumer(
      await raw.wasteRetailAndConsumer(countryCode)
    );
  },

  async diet(countryCode: string) {
    return Parsers.parseDiet(await raw.diet(countryCode));
  },

  async rpcOriginWaste(countryCode: string) {
    return Parsers.parseRpcOriginWaste(await raw.rpcOriginWaste(countryCode));
  },
};

export async function configureResultsEngine(
  resultsEngine: ResultsEngine,
  countryCode: string
) {
  resultsEngine.setCountryCode(countryCode);

  resultsEngine.setFoodsRecipes(await parsed.foodsRecipes());
  resultsEngine.setFootprintsRpcs(await parsed.footprintsRpcs());

  resultsEngine.setEmissionsFactorsPackaging(
    await parsed.emissionsFactorsPackaging()
  );
  resultsEngine.setEmissionsFactorsEnergy(
    await parsed.emissionsFactorsEnergy()
  );
  resultsEngine.setEmissionsFactorsTransport(
    await parsed.emissionsFactorsTransport()
  );

  resultsEngine.setProcessesEnergyDemands(
    await parsed.processesEnergyDemands()
  );
  resultsEngine.setPrepProcessesAndPackaging(
    await parsed.preparationProcessesAndPackaging()
  );
  resultsEngine.setWasteRetailAndConsumer(
    await parsed.wasteRetailAndConsumer(countryCode)
  );
  resultsEngine.setRpcOriginWaste(await parsed.rpcOriginWaste(countryCode));
}
