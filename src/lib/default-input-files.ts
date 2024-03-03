import * as Parsers from "@/lib/input-files-parsers";
import type ResultsEngine from "@/lib/ResultsEngine";

/**
 * Define all files we're importing, first the ones that are independent of
 * country, and then the ones dependent on country (code).
 */
import emissionsFactorsEnergyUrl from "@/default-input-files/SAFAD IEF Energy.csv?url";
import emissionsFactorsPackagingUrl from "@/default-input-files/SAFAD IEF Packaging.csv?url";
import emissionsFactorsTransportUrl from "@/default-input-files/SAFAD IEF Transport.csv?url";
import processesEnergyDemandsUrl from "@/default-input-files/SAFAD IP Energy Proc.csv?url";
import preparationProcessesUrl from "@/default-input-files/SAFAD IP Preparation Processes.csv?url";
import packagingCodesUrl from "@/default-input-files/SAFAD IP Packaging.csv?url";
import footprintsRpcsUrl from "@/default-input-files/SAFAD ID Footprints RPC.csv?url";
import foodsRecipesUrl from "@/default-input-files/SAFAD IP Recipes.csv?url";
import sfaRecipesUrl from "@/default-input-files/SAFAD IS SFA Recipes.csv?url";

// Per country
const wasteRetailAndConsumerUrls = import.meta.glob(
  "@/default-input-files/SAFAD IP Waste Retail and Cons/*.csv",
  { as: "url", eager: true }
);

const dietsUrls = import.meta.glob("@/default-input-files/SAFAD ID Diet Spec/*.csv", {
  as: "url",
  eager: true,
});

const rpcOriginWasteUrls = import.meta.glob(
  "@/default-input-files/SAFAD IP Origin and Waste of RPC/*.csv",
  {
    as: "url",
    eager: true,
  }
);

/**
 * Helper functions for fetching files
 */

async function fetchFile(url: string) {
  return await fetch(url).then((res) => {
    if (!res.ok) {
      console.error("File not found for url: " + url);
      throw new Error(res.statusText);
    }

    return res.text();
  });
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
  preparationProcesses: () => fetchFile(preparationProcessesUrl),
  packagingCodes: () => fetchFile(packagingCodesUrl),
  footprintsRpcs: () => fetchFile(footprintsRpcsUrl),
  foodsRecipes: () => fetchFile(foodsRecipesUrl),
  wasteRetailAndConsumer: (countryCode: string) =>
    fetchCountrySpecificFile(countryCode, wasteRetailAndConsumerUrls),
  diet: (countryCode: string) =>
    fetchCountrySpecificFile(countryCode, dietsUrls),
  rpcOriginWaste: (countryCode: string) =>
    fetchCountrySpecificFile(countryCode, rpcOriginWasteUrls),
  sfaRecipes: () => fetchFile(sfaRecipesUrl),
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

  async preparationProcesses() {
    return Parsers.parsePreparationProcesses(
      await raw.preparationProcesses()
    );
  },

  async packagingCodes() {
    return Parsers.parsePackagingCodes(
      await raw.packagingCodes()
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
  resultsEngine.setPreparationProcesses(
    await parsed.preparationProcesses()
  );
  resultsEngine.setPackagingCodes(await parsed.packagingCodes());
  resultsEngine.setWasteRetailAndConsumer(
    await parsed.wasteRetailAndConsumer(countryCode)
  );
  resultsEngine.setRpcOriginWaste(await parsed.rpcOriginWaste(countryCode));
}
