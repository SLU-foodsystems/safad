export const N_ENV_FOOTPRINTS = 16;
export const ENV_FOOTPRINTS_ZERO = Array.from({ length: N_ENV_FOOTPRINTS }).map(_ => 0);

export const PLANETARY_BOUNDARY_LIMITS = {
  "CO2e": 0.67,
  "Cropland use": 0.174,
  "N": 0.012,
  "P": 0.001,
  "H2O": 334,
  "Biodiversity": 1.33E-09
}

export const CO2E_CONV_FACTORS: Record<string, number> = {
  CO2: 1,
  BCH4: 27,
  FCH4: 29.8,
  N2O: 273,
  HCFC: 1960,
};
