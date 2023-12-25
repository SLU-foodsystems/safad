const zeroes = (length: number) => Array.from({ length }).map((_) => 0);

export const ROW_THRESHOLD = 0.1;

export const N_ENV_IMPACTS = 35;
export const ENV_IMPACTS_ZERO = zeroes(N_ENV_IMPACTS);

export const N_PROCESS_GHGS = 3;
export const PROCESS_EMISSIONS_ZERO = zeroes(N_PROCESS_GHGS);

export const N_PACKAGING_GHGS = 3;

export const N_TRANSPORT_GHGS = 4;
export const TRANSPORT_EMISSIONS_ZERO = zeroes(N_TRANSPORT_GHGS);

// The planetary boundaries used as limits.
export const PLANETARY_BOUNDARY_LIMITS = {
  co2e: (0.67 * 1000) / 365, // from tonnes per year to g per day
  land: (0.174 * 10000) / 365, // from ha per year to m2 per day
  n: 12 / 365, // kg per year -> kg per day
  p: 1.1 / 365, // kg per year -> kg per day
  h2o: 334 / 365, // m3, per year -> per day
  biodiversity: 4.7e-10 / 365, // unitless? -> per day
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
