const zeroes = (length: number) => Array.from({ length }).map((_) => 0);

export const N_ENV_IMPACTS = 36;
export const ENV_IMPACTS_ZERO = zeroes(N_ENV_IMPACTS);

export const N_PROCESS_GHGS = 3;
export const PROCESS_EMISSIONS_ZERO = zeroes(N_PROCESS_GHGS);

export const N_PACKAGING_GHGS = 4;

export const N_TRANSPORT_GHGS = 3;
export const TRANSPORT_EMISSIONS_ZERO = zeroes(N_TRANSPORT_GHGS);

// The planetary boundaries used as limits.
export const PLANETARY_BOUNDARY_LIMITS = {
  co2e: (0.625 * 1000) / 365, // from tonnes per year to kg per day
  land: (0.1625 * 10000) / 365, // from ha per year to m2 per day
  n: 11.25 / 365, // kg per year -> kg per day
  p: 1.0 / 365, // kg per year -> kg per day
  h2o: 312.5 / 365, // m3, per year -> per day
  biodiversity: 4.404e-10 / 365, // extinctions per million species years -> per day
};

// Conversion factors from other GHGs to CO2.
export const CO2E_CONV_FACTORS: Record<string, number> = {
  CO2: 1,
  BCH4: 27,
  FCH4: 29.8,
  N2O: 273,
  HCFC: 1960,
};

export const LL_COUNTRY_CODES: Record<string, string> = {
  France: "FR",
  Germany: "DE",
  Greece: "GR",
  Hungary: "HU",
  Ireland: "IE",
  Italy: "IT",
  Poland: "PL",
  Spain: "ES",
  Sweden: "SE",
};

export const SAFAD_FILE_NAMES = {
  Input: {
    FootprintsRpc: () => "SAFAD ID Footprints RPC.csv",
    Diet: (country: string) => `SAFAD ID Diet Spec ${country}.csv`,
    FoodsRecipes: () => "SAFAD IP Recipes.csv",
    RpcOriginWaste: (country: string) =>
      `SAFAD IP Origin and Waste of RPC ${country}.csv`,
    ProcessesEnergyDemands: () => "SAFAD IP Energy Proc.csv",
    PreparationProcesses: () => "SAFAD IP Preparation Processes.csv",
    PackagingCodes: () => "SAFAD IP Packaging.csv",
    WasteRetailAndConsumer: (country: string) =>
      `SAFAD IP Waste Retail and Cons ${country}.csv`,

    EmissionsFactorsEnergy: () => "SAFAD IEF Energy.csv",
    EmissionsFactorsPackaging: () => "SAFAD IEF Packaging.csv",
    EmissionsFactorsTransport: () => "SAFAD IEF Transport.csv",
    SfaRecipes: () => "SAFAD IP SFA Recipes.csv",
  },
  Output: {
    FootprintsPerFood: "SAFAD OR Footprints per Food.csv",
    FootprintsPerDiet: "SAFAD OR Footprints per Diet.csv",
    BreakdownPerFood: "SAFAD OS Breakdown per Food.csv",
    FootprintsPerSfaFood: "SAFAD OR Footprints per SFA Food.csv",
  },
};
