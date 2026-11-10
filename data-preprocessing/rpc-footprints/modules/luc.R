calculate_luc <- function(country_name_code_map, gh_crops, df_N) {
  # Land Use Change
  # We use the DeDuCE LCI dataset (Singh & Persson, 2026) for commodity-driven
  # deforestation, discounted over 20 years. We combine it with other data sets
  # to filter for deforestation actively driven by agriculture.
  # ----------------------------------------------------------

  iso2_iso3_mapping <- read_csv(
  "../codes/country-codes-iso2-iso3.csv",
  show_col_types = FALSE,
  na = "" # Needed, otherwise Nigeria ("NA") is treated as NA...
) |>
  rename("Country code" = "Alpha-2 code", "Country code (ISO3)" = "Alpha-3 code")

# Total land-use of agricultural land by country 2001-2024 (FAOSTAT)
faostat_agr_land_use <- read_csv(
  "./Env ass data/LUC/faostat-agricultural-land-use.csv",
  show_col_types = FALSE
) |>
  # Select relevant columns, and convert from kha -> ha
  transmute(`Area Code (ISO3)`, Year, agr_lu_ha = Value * 1000)

# Total land-use of forest land by country 2021 (FAOSTAT)
faostat_forest_land_use <- read_csv(
  "./Env ass data/LUC/faostat-forest-land-use.csv",
  show_col_types = FALSE
) |>
  transmute(`Area Code (ISO3)`, Year, forest_lu_kha = Value) |>
  left_join(iso2_iso3_mapping, by = c("Area Code (ISO3)" = "Country code (ISO3)"))

# Deforestation attributed to agriculture (grasslands+croplands) in UNFCCC
# National Inventory Reporting. Used as a secondary source for where the
# Sims et al. dataset (via OWID) is uncertain.
# Only available for ANNEX-1 countries; the rest are treated as a 'yes' as a
# precautionary measure.
AGRI_DEFORESTATION_THRESHOLD <- 0.01 # kha per year
df_agri_deforestation <- read_csv(
  "./Env ass data/LUC/unfccc-deforestation-data.csv",
  show_col_types = FALSE
) |>
  rename("Country name" = "Party") |>
  # Sum the two types of deforestation (to cropland and to grassland)
  summarise(kha = sum(kha), .by = "Country name") |>
  left_join(country_name_code_map, by = "Country name") |>
  left_join(faostat_forest_land_use, by = "Country code") |>
  transmute(
    `Country code`,
    negligble_agri_deforestation = (kha / forest_lu_kha) < AGRI_DEFORESTATION_THRESHOLD
  )

# Strategy for handling data points in DeDuCE with lower IQI-scores based on
# to what extent agriculture drives deforestation.
# Dataset: Annual commodity-driven deforestation 2001-2024 (area, OWID based on
# Sims et al. 2025) combined with FAOSTAT above.
df_LUC_strategy <- read_csv(
  "./Env ass data/LUC/commodity-driven-deforestation.csv",
  show_col_types = FALSE
) |>
  transmute(`Area Code (ISO3)` = Code, Year, `Permanent agriculture`) |>
  # Clean data: remove OWID aggregates
  filter(!grepl("^OWID_", `Area Code (ISO3)`)) |>
  # Add in total agr. land use
  left_join(faostat_agr_land_use, by = c("Area Code (ISO3)", "Year")) |>
  # Note: no NA values in Permanent Agriculture present, very few in
  # FAOSTAT land-use data (small countries)
  mutate(share = `Permanent agriculture` / agr_lu_ha) |>
  # Mean share over all years.
  summarise(share = mean(`share`), .by = c("Area Code (ISO3)")) |>
  # Add in alpha-2 country codes
  left_join(iso2_iso3_mapping, by = c("Area Code (ISO3)" = "Country code (ISO3)")) |>
  transmute(
    `Country code`,
    strategy = case_when(
      is.na(share) ~ "deduce-na", # -> Keep DeDuCE's value, defor. data missing
      share > 0.0005 ~ "deduce-large", # -> Keep DeDuCE's value
      share >= 0.0002 ~ "unfccc", # -> use unfccc to see if negligable value
      .default = "zero" # < 0.02% -> Set LUC from deforestation to 0
    )
  )

# DeDuCE quality score
IQI_THRESHOLD = 0.4
deduce_iqi <- read_excel("./Env ass data/LUC/DeDuCE_data_v2.2.0_IQI.xlsx") |>
  transmute(ISO, Item = Commodity, Year, IQI = `Integrated Quality Index`)

# Put everything together
  df_LUC <- read_csv(
  "./Env ass data/LUC/DeDuCE_LCIs_20_disc.csv",
  show_col_types = FALSE
) |>
  left_join(deduce_iqi, by = c("ISO", "Item", "Year")) |>
  mutate(high_iqi = !is.na(IQI) & IQI > IQI_THRESHOLD) |>
  # Verified: no NA country codes introduced
  left_join(iso2_iso3_mapping, by = c("ISO" = "Country code (ISO3)")) |>
  transmute(
    `Country code`,
    `Crop code` = CPC_item_code,
    Year,
    high_iqi,
    # We select the net emissions footprints, but there is also Gross,
    # and clamp any negative values to 0.
    CO2_LUC = pmax(`Net emissions footprint (tCO2/t)`, 0),
  ) |>
  # Data set contains Inf values. Drop these.
  filter(!is.infinite(CO2_LUC)) |>
  # Take the mean over all the years in the data (2020-2024) per crop and ctry
  summarise(
    CO2_LUC = mean(CO2_LUC),
    high_iqi = sum(high_iqi) > 1, # At least two years with high IQI
    .by = c("Country code", "Crop code")
  ) |>
  left_join(df_LUC_strategy, by = "Country code") |>
  left_join(df_agri_deforestation, by = "Country code") |>
  mutate(
    negligble_agri_deforestation = if_else(
      is.na(negligble_agri_deforestation), FALSE, negligble_agri_deforestation
    ),
    CO2_LUC = case_when(
      # High IQI, keep DeDuCE data as it's based on satellite data
      high_iqi ~ CO2_LUC,
      # Share of agriculture-driven deforestation high (or data missing)
      strategy == "deduce-na" | strategy == "deduce-large" ~ CO2_LUC,
      # Check UNFCCC - deduce if agricultural deforestation not negligible.
      strategy == "unfccc" ~ if_else(negligble_agri_deforestation, 0, CO2_LUC),
      # Deforestation by agriculture is negligible, treat as zero
      strategy == "zero" ~ 0,
      .default = 0 # Countries with fully missing data (only Cabo Verde)
    )
  ) |>
  select(`Country code`, `Crop code`, CO2_LUC) |>
  split_avg_into_gh_crops(gh_crops)

  # TEST to make sure we do not miss any codes with the renaming-shenanigans above
  {
    LUC_crop_codes <- df_LUC |>
      select(`Crop code`) |>
      unique()
    codes_missing_from_LUC <- df_N |>
      select(`Crop code`, Crop) |>
      unique() |>
      filter(!(`Crop code` %in% LUC_crop_codes$`Crop code`))

    if (nrow(codes_missing_from_LUC) > 0) {
      print(codes_missing_from_LUC)
      stop(paste0(
        "Not all Crop codes have data in df_LUC. Make sure that names ",
        "match from df_LUC to our use, or are renamed (see above)."
      ))
    }
    rm(LUC_crop_codes, codes_missing_from_LUC)
  }

  df_LUC
}
