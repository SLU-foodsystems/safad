export const N_ENV_FOOTPRINTS = 16;
export const ENV_FOOTPRINTS_ZERO = Array.from({ length: N_ENV_FOOTPRINTS }).map(_ => 0);

export const PLANETARY_BOUNDARY_LIMITS = {
  "co2e": 0.67,
  "land": 0.174,
  "n": 0.012,
  "p": 0.001,
  "h2o": 334,
  "biodiversity": 1.33E-09
}

export const CO2E_CONV_FACTORS: Record<string, number> = {
  CO2: 1,
  BCH4: 27,
  FCH4: 29.8,
  N2O: 273,
  HCFC: 1960,
};
