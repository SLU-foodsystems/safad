if (!require("readxl")) {
  install.packages("readxl")
}
if (!require("readr")) {
  install.packages("readr")
}
if (!require("tidyr")) {
  install.packages("tidyr")
}

{
  library(readxl)
  library(dplyr)
  library(readr)
  library(tidyr)
  library(tibble)
}

setwd("~/dev/safad/data-preprocessing/rpc-footprints/R scripts")


# Set up which crops we differentiate growing in greenhouses and open-field.
# TODO: Could be read from energy emissions file
gh_crops <- tribble(
  ~`Name`     , ~`Crop code` ,
  "tomatoes"  , "01234"      ,
  "cucumbers" , "01232"
) |>
  mutate(
    `gh_code` = paste0(`Crop code`, "_gh"),
    `of_code` = paste0(`Crop code`, "_of")
  )

sua_fao_codes <- read_csv("../Codes/FAO to SUA.csv", show_col_types = FALSE) |>
  select(`SUA Code`, `Item Code`) |>
  filter(!is.na(`Item Code`))

################################################################################
# Helper functions
################################################################################

resolve_references <- function(df, n_index_cols) {
  crop_codes <- df[1] |> pull()
  country_cols <- df |> colnames() |> tail(-n_index_cols)
  # Sanity-check
  if (!("Default" %in% country_cols)) {
    warning(
      "Col name 'Default' not in the 4:N-th columns of df. " +
        "Make sure the data is not malformatted."
    )
    return(NA)
  }

  # Iterate until no more references found
  changed <- TRUE
  iteration <- 0

  # Max N^2 iterations
  while (changed && iteration < length(country_cols)) {
    changed <- FALSE
    iteration <- iteration + 1

    # For each row in each col
    for (col in country_cols) {
      for (row in seq_along(df)) {
        cell_val <- df[[col]][row]

        # Case 1: It's an empty cell, and we leave it as-is.
        if (is.na(cell_val)) {
          next
        }

        # Refs can be country codes (e.g., SE) or country-SUA (e.g., SE-01232)
        ref <- c()
        if (cell_val %in% country_cols) {
          ref <- c(cell_val, row)
        } else if (is.character(cell_val)) {
          parts <- unlist(strsplit(cell_val, "-"))
          if (
            length(parts) == 2 &&
              parts[1] %in% country_cols &&
              parts[2] %in% crop_codes
          ) {
            ref_row <- match(parts[2], crop_codes)
            ref <- c(parts[1], ref_row)
          }
        }

        # Case 2: it looks like a reference, so we try to resolve it.
        if (length(ref) > 0) {
          # Fetch reference value
          ref_val <- df[[ref[1]]][as.numeric(ref[2])]
          if (is.na(ref_val)) {
            crop_code <- df[row, 1]
            stop(
              "The following (crop, country) references an empty cell:\n\t",
              paste(
                c(
                  crop_code,
                  ", ",
                  col,
                  " -> ",
                  cell_val,
                  " = (",
                  ref[1],
                  ", ",
                  ref[2],
                  ") = ",
                  ref_val,
                  ". Iteration = ",
                  iteration
                ),
                collapse = ""
              )
            )
            next
          }

          # Note: If the value in the cell we are referencing is a country
          # (e.g., it is 'SE') we need to append the crop-code, i.e. a reference
          # to the row, as it is implicit. Otherwise, recursive references break
          if (ref_val %in% country_cols) {
            ref_val_row_name <- crop_codes[as.numeric(ref[2])]
            ref_val <- paste(c(ref_val, ref_val_row_name), collapse = "-")
          }

          df[[col]][row] <- ref_val
          changed <- TRUE
          next
        }

        # Case 3: it doesn't look like a reference, so it will either:
        # a) be a number            => all is well, leave it
        # b) be an illegal value    => raise warning
        if (is.na(suppressWarnings(as.numeric(cell_val)))) {
          crop_code <- df[row, 1]
          stop(
            "The following (crop,country) references an invalid country:\n\t",
            paste(c(crop_code, ", ", col, " = ", cell_val), collapse = "")
          )
        }
      }
    }
  }

  # Return, and cast the type to double instead of char.
  index_col_names <- names(df)[1:n_index_cols]
  df |>
    mutate(across(-all_of(index_col_names), ~ suppressWarnings(as.double(.))))
}


# Factor in the yields, pivoting from wide to long format.
adjust_by_yield <- function(df, yield_df, n_index_cols, values_to = "value") {
  country_cols <- names(df) |> tail(-n_index_cols)
  df |>
    # Reshape to long format
    pivot_longer(
      cols = all_of(country_cols),
      names_to = "Country code",
      values_to = "abs_value"
    ) |>
    # Join with yields
    left_join(
      yield_df,
      by = c("Crop code", "Country code")
    ) |>
    # Drop rows where yield data is missing for crop+country combo
    drop_na("yield") |>
    # Multiply by yield (handle missing yields)
    mutate(value = abs_value / yield) |>
    drop_na("value") |>
    # Remove intermediate columns
    select(-abs_value, -yield) |>
    rename(!!values_to := value)
}

# Apply the value of the 'Default' col to all other value-cols in a wide
# data-frame. In our use case, it is for the rest of the countries.
apply_defaults <- function(df, default_index = 0) {
  if (default_index == 0) {
    default_index <- which(names(df) == "Default")
  }
  value_cols <- names(df)[(default_index + 1):ncol(df)]
  df |>
    mutate(across(
      all_of(value_cols),
      ~ coalesce(., Default)
    )) |>
    select(-Default)
}

split_avg_into_gh_crops <- function(df, gh_crops) {
  bind_rows(
    df |>
      filter(!(`Crop code` %in% gh_crops$`Crop code`)),
    df |>
      filter(`Crop code` %in% gh_crops$`Crop code`) |>
      mutate(`Crop code` = paste0(`Crop code`, "_gh")),
    df |>
      filter(`Crop code` %in% gh_crops$`Crop code`) |>
      mutate(`Crop code` = paste0(`Crop code`, "_of")),
  )
}

normalise_country_names <- function(df, col) {
  col <- rlang::ensym(col)

  df |>
    mutate(
      !!col := case_match(
        !!col,
        "Bolivia" ~ "Bolivia (Plurinational State of)",
        "Brunei" ~ "Brunei Darussalam",
        "China" ~ "China, mainland",
        "Congo DRC" ~ "Democratic Republic of the Congo",
        "Cote d'Ivoire" ~ "Côte d'Ivoire",
        "Iran" ~ "Iran (Islamic Republic of)",
        "Laos" ~ "Lao People's Democratic Republic",
        "Micronesia" ~ "Micronesia (Federated States of)",
        "Moldova" ~ "Republic of Moldova",
        "México" ~ "Mexico",
        "Namibia" ~ "Namibia",
        "Netherlands" ~ "Netherlands (Kingdom of the)",
        "North Korea" ~ "Democratic People's Republic of Korea",
        "Palestinian Territory" ~ "Palestine",
        "Republic of the Congo" ~ "Democratic Republic of the Congo",
        "Russia" ~ "Russian Federation",
        # TODO: Uhm what do we do here?
        "Serbia and Montenegro" ~ "Serbia",
        "South Korea" ~ "Republic of Korea",
        # TODO: Same here.
        "Sudan and South Sudan" ~ "Sudan",
        "Swaziland" ~ "Eswatini",
        "Syria" ~ "Syrian Arab Republic",
        "São Tomé and Príncipe" ~ "Sao Tome and Principe",
        "Tanzania" ~ "United Republic of Tanzania",
        "Turkey" ~ "Türkiye",
        "UK" ~ "United Kingdom of Great Britain and Northern Ireland",
        "USA" ~ "United States of America",
        "United Kingdom" ~ "United Kingdom of Great Britain and Northern Ireland",
        "United States" ~ "United States of America",
        "Venezuela" ~ "Venezuela (Bolivarian Republic of)",
        "Vietnam" ~ "Viet Nam",
        .default = !!col
      )
    )
}

################################################################################
# CREATE BASE DATA FRAMES
################################################################################

# ==========================================================
# Import data map
# We filter out any products that are not imported at all,
# so that we get a smaller data-set
# ==========================================================

trade_data <- list.files(
  "../7 - Trade data/",
  pattern = "\\.csv$",
  full.names = TRUE
) |>
  lapply(\(f) {
    read_csv(f, show_col_types = FALSE) |> mutate(.source_file = basename(f))
  }) |>
  bind_rows() |>
  transmute(
    `Crop code` = `SUA Code`,
    `Country code` = `Producer Country Code`,
  ) |>
  unique() |>
  filter(`Country code` != "RoW") |>
  split_avg_into_gh_crops(gh_crops)


# ==========================================================
# Yield
# ==========================================================

country_name_code_map <- read_csv(
  "../Codes/Country codes.csv",
  na = "", # Prevent Namibia (NA) from being interpreted as a missing value
  show_col_types = FALSE
)

FAO_COUNTRIES_TO_DROP <- c("China") # We use 'China, mainland' instead

fao_yields <- read_csv("./FAOSTAT_yield.csv", show_col_types = FALSE) |>
  # Remove any non-yield rows, in case of invalid download
  filter(Element == "Yield") |>
  # Rename for consistency in code
  transmute(
    `Country name` = Area,
    `Crop code` = `Item Code (CPC)`,
    yield = `Value`
  ) |>
  filter(yield > 0 & !is.na(yield)) |>
  filter(!(`Country name` %in% FAO_COUNTRIES_TO_DROP)) |>
  # Group to get mean across years
  group_by(`Country name`, `Crop code`) |>
  summarise(
    yield = mean(yield, na.rm = TRUE),
    .groups = "drop"
  ) |>
  ungroup() |>
  left_join(country_name_code_map, by = "Country name")

# TEST: See if any countries are missing codes
{
  # Warn if any countries are missing codes
  missing_countries <- fao_yields |>
    filter(is.na(`Country code`)) |>
    # R thinks Namibia="NA" is a NA-value. Sigh.
    filter(`Country name` != "Namibia") |>
    distinct(`Country name`) |>
    pull(`Country name`)

  if (length(missing_countries) > 0) {
    warning(
      "The following country names could not be matched to codes:\n\t",
      paste(missing_countries, collapse = ", ")
    )
  }
}


# Calculate the separate yields for greenhouse and open-field yields
# ----------------------------------------------------------

# Adjust the yields manually for cucumber and tomato for Sweden, which we know
# is better data than eurostat.
# https://statistik.sjv.se/PXWeb/sq/0ccae0a8-a0ab-4a31-8c74-69121603d345
se_gh_yields <- tribble(
  ~`Crop code` , ~`Country code` , ~quantity_t , ~area_m2 ,
  "01234_gh"   , "SE"            ,       16100 ,   450400 , # ton -> kg, m2 -> ha
  "01232_gh"   , "SE"            ,       29800 ,   600200
) |>
  transmute(
    `Crop code`,
    `Country code`,
    `yield` = quantity_t * 1000 / (area_m2 / 1e4)
  )

# Fetched from: https://ec.europa.eu/eurostat/databrowser/view/apro_cpsh1__custom_20725936/default/table
gh_of_yields <- read_csv("EUROSTAT_gh_yields.csv", show_col_types = FALSE) |>
  # Drop the "for consumption/production" rows
  filter(!grepl("for", Crops, ignore.case = TRUE)) |>
  # Filter out irrelevant columns
  select(strucpro, geo, Crops, TIME_PERIOD, OBS_VALUE) |>
  # Translate the eurostat crop names to crop-codes
  mutate(
    Crops = case_when(
      Crops == "Tomatoes" ~ "01234_of",
      Crops == "Tomatoes - under glass or high accessible cover" ~ "01234_gh",
      Crops == "Cucumbers" ~ "01232_of",
      Crops == "Cucumbers - under glass or high accessible cover" ~ "01232_gh",
    )
  ) |>
  # Get the _of and _gh onto the same rows so that we can subtract gh from of,
  # because currently "of" is actually of + gh
  pivot_wider(
    names_from = "Crops",
    values_from = "OBS_VALUE"
  ) |>
  # Replace any NA because for some countries+years+crops we don't have gh data
  mutate(across(-c(strucpro, geo, TIME_PERIOD), ~ coalesce(., 0))) |>
  # subtract!
  mutate(
    `01234_of` = `01234_of` - `01234_gh`,
    `01232_of` = `01232_of` - `01232_gh`
  ) |>
  pivot_longer(
    values_to = "Value",
    names_to = "Crop code",
    cols = -c(1:3)
  ) |>
  pivot_wider(
    values_from = "Value",
    names_from = "strucpro"
  ) |>
  # Prod (1000 t) Area (1000 ha) -> Yield (kg/ha)
  mutate(yield = 1000 * (PR_HU_EU / AR)) |>
  rename(
    `Country code` = geo,
    Year = TIME_PERIOD,
  ) |>
  filter(!is.na(yield) & yield > 0) |>
  group_by(`Country code`, `Crop code`) |>
  summarize(
    yield = mean(yield),
    .groups = "drop"
  ) |>
  rows_patch(
    se_gh_yields,
    by = c("Crop code", "Country code")
  )


# TEST: List all countries for which we have trade data, but not yields
{
  MUSHROOMS_CODE = "01270"

  missing_trade <- fao_yields |>
    anti_join(trade_data, by = c("Crop code", "Country code")) |>
    filter(`Crop code` != MUSHROOMS_CODE)

  missing_yields <- trade_data |>
    anti_join(fao_yields, by = c("Crop code", "Country code")) |>
    filter(`Crop code` != MUSHROOMS_CODE)

  if (nrow(missing_yields) > 0) {
    warning(paste0(
      "See `missing_yields` for a list of crop-and-country ",
      "combinations for which we have trade data but no fao_yield."
    ))
  }
}

yields <- fao_yields |>
  select(-`Country name`) |>
  mutate(
    `Crop code` = if_else(
      `Crop code` %in% gh_crops$`Crop code`,
      paste0(`Crop code`, "_of"),
      `Crop code`
    )
  ) |>
  rows_upsert(gh_of_yields, by = c("Crop code", "Country code")) |>
  right_join(trade_data, by = c("Crop code", "Country code"))

# ==========================================================
# Land use
# ==========================================================

# Land use is the inverse of the yield, but in m2 instead of ha
df_land_use = yields |>
  mutate(Land = if_else(yield > 0, 10000 / yield, 0)) |>
  select(-yield)


# ==========================================================
# N and P fertiliser
# ==========================================================

df_N <- read_excel(
  "../1 - Crops/N fertiliser.xlsx",
  sheet = "Data",
  skip = 4
) |>
  resolve_references(n_index_cols = 3) |>
  apply_defaults() |>
  adjust_by_yield(yields, n_index_cols = 3, values_to = "N_fert")

df_P <- read_excel(
  "../1 - Crops/P fertiliser.xlsx",
  sheet = "Data",
  skip = 4
) |>
  resolve_references(n_index_cols = 3) |>
  apply_defaults() |>
  adjust_by_yield(yields, n_index_cols = 3, values_to = "P_fert")

df_N_contents <- read_excel(
  "../1 - Crops/N fertiliser.xlsx",
  sheet = "N content",
  skip = 4
) |>
  drop_na(`N content`)

# ==========================================================
# Pesticides
# ==========================================================

df_pest <- read_excel(
  "../1 - Crops/Pesticides.xlsx",
  sheet = "Data",
  skip = 4
) |>
  resolve_references(n_index_cols = 3) |>
  # Populate with default values
  apply_defaults() |>
  adjust_by_yield(yields, n_index_cols = 3, values_to = "pesticides_use")


# ==========================================================
# Blue Water

# Note for future:
# The data we are using has separate data from capillary rise, i.e., that crops
# with surface-level roots extracting blue water. This could be included, but
# we decided against it for now. We need to return and investigate more later.
# ==========================================================

# Blue water footprint from irrigation (m3 per kg food product per year)
df_water <- read_csv(
  "../Env ass data/Water/national_wf_175_crops_annual_1990_2019.csv",
  skip = 3,
  show_col_types = FALSE
) |>
  # Select the columns we are interested in
  select(crop_code, country_name, year, wfb_i_m3_t) |>
  # Only get the 5 most recent years
  filter(year >= 2015 & year <= 2019) |> # 2015-2019
  group_by(crop_code, country_name) |>
  summarise(
    wfb_i_m3_t = mean(wfb_i_m3_t, na.rm = TRUE),
    .groups = 'drop' # Removes grouping
  ) |>
  # We have the country names but not the country codes
  left_join(country_name_code_map, by = c("country_name" = "Country name")) |>
  # Use inner_join instead of left_join as we have several SUA codes for some Item codes
  inner_join(
    sua_fao_codes,
    by = c("crop_code" = "Item Code"),
    relationship = "many-to-many"
  ) |>
  transmute(
    `Country code`,
    `Crop code` = `SUA Code`,
    # Note: Convert from m3 per tonne to m3 per kg
    Water = wfb_i_m3_t / 1000
  ) |>
  split_avg_into_gh_crops(gh_crops)


# ==========================================================
# GHGs
# ==========================================================

# Helper for reading excel-files
read_crop_excel <- function(fname, sheet, skip = 4) {
  readxl::read_excel(
    paste(c("../1 - Crops/", fname), collapse = ""),
    sheet = sheet,
    skip = skip
  )
}


# Emissions factors
# ----------------------------------------------------------

df_emission_factors_general <- read_crop_excel(
  "Emission factors.xlsx",
  sheet = "EF general",
  skip = 3
)

# CO2, CH4 and N2O emission factors (kg per MJ) across energy sources,
# irregardless of country
df_emission_factors_energy <- df_emission_factors_general |>
  filter(Gas %in% c("CO2", "CH4", "N2O")) |>
  select(Parameter, Gas, Value) |>
  pivot_wider(
    values_from = "Value",
    names_from = "Gas",
  ) |>
  rename(`Energy source` = Parameter)


df_emission_factors_country <- read_crop_excel(
  "Emission factors.xlsx",
  sheet = "EF country spec"
) |>
  select(-Description, -Unit) |>
  filter(Factor != "Climate") |> # Remove row not used in data calculation
  resolve_references(1) |>
  # Cast all columns to double
  mutate(across(-c("Factor"), as.double)) |>
  apply_defaults() |>
  pivot_longer(
    cols = -c(Factor),
    names_to = "Country code",
    values_to = "Value"
  )

# Land Use Change
# ----------------------------------------------------------

LUC_duplicate_gh_rows <- function(df, org_str, new_str) {
  new_rows <- df |>
    filter(grepl(org_str, Commodity)) |>
    mutate(Commodity = sub(org_str, new_str, Commodity))
  df |> bind_rows(new_rows)
}

df_LUC <- suppressWarnings(
  read_xlsx("../Env ass data/LUC/Deforest_per_kg.xlsx")
) |>
  # Some, but not all, have Average values. Drop them, re-compute mean.
  filter(Year != "Average") |>
  transmute(
    Country,
    Commodity,
    CO2_LUC = `Emissions per kg (kg CO2)`
  ) |>
  # Some values have an "inf"-value. Replace with 0
  mutate(CO2_LUC = if_else(is.infinite(CO2_LUC), 0, CO2_LUC)) |>
  group_by(Country, Commodity) |>
  summarise(
    CO2_LUC = coalesce(mean(CO2_LUC, na.rm = TRUE), 0),
    .groups = "drop"
  ) |>
  # Fix names to match FAO naming
  normalise_country_names(Country) |>
  left_join(country_name_code_map, by = c("Country" = "Country name")) |>
  mutate(
    Commodity = case_match(
      Commodity,
      "Barley" ~ "Barley, average",
      "Cauliflowers and broccoli" ~ "Cauliflowers and broccoli, average",
      "Chillies and peppers, green (Capsicum spp. and Pimenta spp.)" ~ "Chillies and peppers, green (Capsicum spp. and Pimenta spp.), raw",
      "Coconuts, in shell" ~ "Coconut, in shell",
      "Cucumbers and gherkins" ~ "Cucumbers and gherkins, greenhouse",
      "Rape or colza seed" ~ "Rape or colza seed, average",
      "Tomatoes" ~ "Tomatoes, greenhouse",
      "Wheat" ~ "Wheat, average",
      .default = c(Commodity)
    )
  ) |>
  LUC_duplicate_gh_rows(org_str = ", greenhouse", new_str = ", openfield") |>
  left_join(
    # Use df_N for a list of all the unique codes
    unique(select(df_N, Crop, `Crop code`)),
    by = c("Commodity" = "Crop")
  ) |>
  drop_na(`Crop code`) |>
  select(`Country code`, `Crop code`, CO2_LUC)

# TEST to make sure we do not miss any codes with the renaming-shenanigans above
{
  LUC_crop_codes <- df_LUC |> select(`Crop code`) |> unique()
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


# Capital goods
# ----------------------------------------------------------

ef_cap_goods <- df_emission_factors_general |>
  filter(Parameter == "Capital goods") |>
  pivot_wider(
    values_from = "Value",
    names_from = "Gas"
  )

# Blue water (irrigation) emissions
# ----------------------------------------------------------

ef_water <- df_emission_factors_energy |>
  filter(`Energy source` == "Irrigation") |>
  slice(1)

df_water_emissions <- df_water |>
  mutate(
    CO2_irr = Water * ef_water$CO2,
    CH4_irr = Water * ef_water$CH4,
    N2O_irr = Water * ef_water$N2O
  ) |>
  select(-Water) |>
  mutate(across(
    all_of(c("CO2_irr", "CH4_irr", "N2O_irr")),
    ~ if_else(grepl("_gh", `Crop code`), 0, .)
  ))

# Biogenic CH4 of rice production
# ----------------------------------------------------------
# FAOSTAT has data for the annual production quantity (in tonnes rice) and
# another # data set for the total CH4 emissions from rice (k tonnes CH4). We
# thus calculate the kg CH4 / kg rice as TOTAL_EMISSIONS / TOTAL_QUANTITY

df_rice_production_t <- read_csv(
  "../Env ass data/Rice/FAOSTAT_data_en_3-17-2026 RICE PRODUCTION.csv",
  show_col_types = FALSE
) |>
  transmute(
    `Country code` = `Area Code (ISO2)`,
    Year,
    qty_t = Value
  ) |>
  drop_na(qty_t)

df_ch4_rice <- read_csv(
  "../Env ass data/Rice/FAOSTAT_data_en_3-17-2026 RICE EMISSIONS CH4.csv",
  show_col_types = FALSE
) |>
  filter(Item == "Rice") |>
  transmute(
    `Country code` = `Area Code (ISO2)`,
    `Crop code` = `Item Code (CPC)`,
    Year,
    CH4_total_kt = Value
  ) |>
  left_join(df_rice_production_t, by = c("Country code", "Year")) |>
  group_by(`Country code`, `Crop code`) |>
  summarise(
    CH4_rice_kg = mean(1000 * CH4_total_kt / qty_t),
    .groups = "drop"
  )


# Post-harvest emissions from energy use
# ----------------------------------------------------------

# Create a long-form data-frame with Energy source == Electricity,
# data from the factors starting with EF_Electricity, for all the countries.
# We need this to combine it with the data set below.
df_emission_factors_electricity <- df_emission_factors_country |>
  filter(startsWith(Factor, "EF_electr")) |>
  pivot_wider(names_from = "Factor", values_from = "Value") |>
  mutate(`Energy source` = "Electricity")

# Emissions factor per category and country.
# (category, Country code) -> (CO2_postharvest, CH4_postharvest, N2O_postharvest)
df_post_harvest_emissions <- read_crop_excel(
  "Emission factors.xlsx",
  sheet = "Post harvest",
  skip = 3
) |>
  # Format data-set to long
  select(c("Category", "Heating oil", "Electricity", "Wood chips")) |>
  pivot_longer(
    values_to = "Energy use (MJ)",
    names_to = "Energy source",
    cols = c("Heating oil", "Electricity", "Wood chips")
  ) |>
  # Replace any NA with 0
  mutate(`Energy use (MJ)` = coalesce(`Energy use (MJ)`, 0)) |>
  # Add in the countries - only the columns, no data yet
  cross_join(select(df_emission_factors_electricity, "Country code")) |>
  # Join with the standard, country-independent energy emissions factors
  left_join(df_emission_factors_energy, by = "Energy source") |>
  # And the electricity, which differs per country
  left_join(
    df_emission_factors_electricity,
    by = c("Country code", "Energy source")
  ) |>
  # Compute GHG emissions by multiplying the EFs with the energy use; using different
  # columns for the Electricity (EF_...) and the other ones.
  mutate(
    CO2 = if_else(
      `Energy source` == "Electricity",
      EF_electricity_CO2 * `Energy use (MJ)`,
      CO2 * `Energy use (MJ)`
    ),
    CH4 = if_else(
      `Energy source` == "Electricity",
      EF_electricity_CH4 * `Energy use (MJ)`,
      CH4 * `Energy use (MJ)`
    ),
    N2O = if_else(
      `Energy source` == "Electricity",
      EF_electricity_N2O * `Energy use (MJ)`,
      N2O * `Energy use (MJ)`
    ),
  ) |>
  # Group so that we can aggregate the values for each category-country pair
  group_by(Category, `Country code`) |>
  summarise(
    CO2_postharvest = sum(CO2, na.rm = TRUE),
    CH4_postharvest = sum(CH4, na.rm = TRUE),
    N2O_postharvest = sum(N2O, na.rm = TRUE),
    .groups = "drop" # Drop any remaining columns
  )


# Crop residues
# ----------------------------------------------------------

df_crop_resid_N_params <- read_crop_excel(
  "Crop residues.xlsx",
  sheet = "N parameters"
)

# First, transfer the crop residuals (per country) from defaults and references
# to absolute values.
df_crop_resid_frac_rm <- read_crop_excel(
  "Crop residues.xlsx",
  sheet = "Frac_removed"
) |>
  resolve_references(3) |>
  apply_defaults() |>
  pivot_longer(
    values_to = "frac_remove",
    names_to = "Country code",
    cols = -c("Crop code", "Crop", "Category")
  )

# Then, join with the constant, country-independent factors and compute the
# N content for residues per kg of crop.
# We compute `N_residues`, which is the annual amount of N in crop residues
# (above and below ground) in kg N / yr (per kg crop)
df_N_resid <- df_crop_resid_frac_rm |>
  left_join(
    df_crop_resid_N_params,
    by = c("Crop code", "Crop", "Category")
  ) |>
  mutate(
    N_resid = DRY * (R_AG * N_AG * (1 - frac_remove) + (1 + R_AG) * RS * N_BG)
  ) |>
  select(c("Crop code", "Crop", "Category", "Country code", "N_resid")) |>
  mutate(N_resid = if_else(grepl("_gh", `Crop code`), 0, N_resid))


# Field ops / diesel use: kg diesel per kg crop
# ----------------------------------------------------------

ef_diesel <- df_emission_factors_energy |>
  filter(`Energy source` == "Diesel fuel") |>
  slice(1)

# MJ energy per kg diesel
HEATING_VALUE_DIESEL <- 35.2

df_field_ops <- read_crop_excel("Field operations.xlsx", sheet = "Data") |>
  resolve_references(n_index_cols = 3) |>
  apply_defaults() |>
  # Convert from kg diesel per ha -> kg diesel per kg Crop
  adjust_by_yield(yields, n_index_cols = 3, values_to = "diesel_kg") |>
  # Ensure diesel use is set 0 for all gh crops
  mutate(diesel_kg = if_else(endsWith(`Crop code`, "_gh"), 0, diesel_kg)) |>
  # Convert from kg diesel per kg crop to kg GHG per kg Crop
  # Note that we convert kg diesel to MJ diesel, to multiply with EF (kg / MJ)
  transmute(
    `Crop code`,
    Crop,
    Category,
    `Country code`,
    CO2_field_ops = diesel_kg * HEATING_VALUE_DIESEL * ef_diesel$CO2,
    CH4_field_ops = diesel_kg * HEATING_VALUE_DIESEL * ef_diesel$CH4,
    N2O_field_ops = diesel_kg * HEATING_VALUE_DIESEL * ef_diesel$N2O
  )


# Greenhouse vs Open-field adaptations
# ----------------------------------------------------------

df_emission_factors_gh <- df_emission_factors_country |>
  filter(!startsWith(Factor, "EF_"))

# (For later use): Extract the fractions (0-1) of _gh for each crop + country
gh_fractions <- df_emission_factors_gh |>
  filter(startsWith(Factor, "Frac_")) |>
  transmute(
    `Crop code` = sub(".*_", "", Factor),
    `Country code`,
    frac_gh = Value / 100
  )


# Step 1: Extract the total energy use of greenhouse cultivation (MJ per ha)
df_gh_energy_use_per_ha <- df_emission_factors_gh |>
  filter(startsWith(Factor, "Energy_")) |>
  transmute(
    `Crop code` = gsub("Energy_", "", Factor),
    `Country code`,
    energy_mj_per_ha = coalesce(Value, 0),
  )


# Step 2: Get the energy allocation factors.
# For some countries (mostly NL), energy is re-used and funneled into
# the district heating, and is therefore not to be counted as energy use.
# For these cases, we only attribute x% of the energy use to the crops.
df_gh_allocation_factors <- df_emission_factors_gh |>
  filter(grepl("Allocation_", Factor)) |>
  transmute(
    `Country code`,
    allocation_gh = Value
  )

# Step 3: Calculate the emissions per hectare of each crop and country

## Step 3a: Prepare emission factors for district heating and electricity, which
##          are per-country whereas the others are universal
df_emission_factors_gh_per_country <- df_emission_factors_country |>
  filter(
    startsWith(Factor, "EF_district_heating_") |
      startsWith(Factor, "EF_electricity_")
  ) |>
  separate(
    Factor,
    into = c("Energy source", "Gas"),
    sep = "_(?=[^_]+$)",
    remove = TRUE
  ) |>
  mutate(
    `Energy source` = case_match(
      `Energy source`,
      "EF_electricity" ~ "Electricity",
      "EF_district_heating" ~ "District heating"
    )
  ) |>
  pivot_wider(names_from = "Gas", values_from = "Value")

## Step 3b: Start by structuring the data as share of each energy source for
#           each gh-crop.
# TODO: Figure out why this does not match the verification files
df_gh_emissions_per_ha <- df_emission_factors_gh |>
  # Filter out: only the energy source fractions
  filter(
    !startsWith(Factor, "Frac_") &
      !startsWith(Factor, "Energy_") &
      !startsWith(Factor, "Allocation_")
  ) |>
  mutate(Value = coalesce(Value, 0)) |>
  # Factor out the energy source and the crop code from the energy Factor name
  separate(
    Factor,
    into = c("Energy source", "Crop code"),
    sep = "_(?=[^_]+$)",
    remove = TRUE
  ) |>
  # Clean up the energy source name (remove _), and consistent naming for
  # wood chips
  mutate(`Energy source` = gsub("_", " ", `Energy source`)) |>
  rename(energy_share = Value) |>
  # Add in the allocation factors. For some countries (at the time of writing,
  # only the Netherlands) only part of the energy/emissions is to be allocated
  # to growing crops, as the heat is re-used for housing (and thus accounted)
  # for in that sector.
  left_join(df_gh_allocation_factors, by = "Country code") |>
  # Add in the emissions factors for different energy sources (kg GHG per MJ)
  left_join(df_emission_factors_energy, by = "Energy source") |>
  # ... and the ones that are specific per country.
  # We add suffixes since we need to pick the specific were available, and the
  # general one otherwise.
  left_join(
    df_emission_factors_gh_per_country,
    by = c("Energy source", "Country code"),
    suffix = c("", "_country")
  ) |>
  mutate(
    CO2 = coalesce(CO2_country, CO2),
    CH4 = coalesce(CH4_country, CH4),
    N2O = coalesce(N2O_country, N2O)
  ) |>
  # We can now multiply the energy share (0-1) and the emissions # (kg GHG per
  # MJ energy)
  transmute(
    `Crop code`,
    `Country code`,
    `Energy source`,
    CO2_per_MJ = energy_share * CO2 * allocation_gh,
    CH4_per_MJ = energy_share * CH4 * allocation_gh,
    N2O_per_MJ = energy_share * N2O * allocation_gh
  ) |>
  # Sum across energy sources
  group_by(`Crop code`, `Country code`) |>
  summarise(
    CO2_per_MJ = sum(CO2_per_MJ, na.rm = TRUE),
    CH4_per_MJ = sum(CH4_per_MJ, na.rm = TRUE),
    N2O_per_MJ = sum(N2O_per_MJ, na.rm = TRUE),
    .groups = "drop"
  ) |>
  # Translate the GHG / mj to GHG / ha
  left_join(df_gh_energy_use_per_ha, by = c("Crop code", "Country code")) |>
  transmute(
    `Crop code` = paste0(`Crop code`, "_gh"),
    `Country code`,
    CO2_per_ha = CO2_per_MJ * energy_mj_per_ha,
    CH4_per_ha = CH4_per_MJ * energy_mj_per_ha,
    N2O_per_ha = N2O_per_MJ * energy_mj_per_ha
  )

# Step 4: Adjust by yield to get kg hg per kg crop
df_gh_emissions <- df_gh_emissions_per_ha |>
  left_join(yields, by = c("Crop code", "Country code")) |>
  filter(!is.na(yield) & yield > 0) |>
  transmute(
    `Crop code`,
    `Country code`,
    CO2_gh = CO2_per_ha / yield,
    CH4_gh = CH4_per_ha / yield,
    N2O_gh = N2O_per_ha / yield
  )


# Per-country emission Factors
# ----------------------------------------------------------

# The emissions factors for the N fertiliser is on a different format than the
# other sheets, where we need to calculate the weighted sum across different
# fertilies-categories based on their share of usage.
df_N_fert_emission_factors <- read_crop_excel(
  "Emission factors.xlsx",
  sheet = "EF_N_fert",
  skip = 0
) |>
  normalise_country_names(Country) |>
  left_join(country_name_code_map, by = c("Country" = "Country name")) |>
  # Drop remaining na-country codes that we do not use. (e.g. "Others Oceania")
  filter(!is.na(`Country code`)) |>
  # Drop all rows that lack data.
  filter(!is.na(EF_Nfert_CO2) & !is.na(EF_Nfert_N2O)) |>
  # Combine the different sources of N-fert. emission factors as a weighted sum
  group_by(`Country code`) |>
  # Create an adjusted weight that accounts for the rwos that we have removed
  mutate(
    w = `Share of fertiliser product` /
      sum(`Share of fertiliser product`, na.rm = TRUE)
  ) |>
  summarise(
    EF_Nfert_CO2 = sum(EF_Nfert_CO2 * w, na.rm = TRUE),
    EF_Nfert_N2O = sum(EF_Nfert_N2O * w, na.rm = TRUE),
    .groups = "drop"
  )

df_NH3_emission_factors <- read_crop_excel(
  "Emission factors.xlsx",
  sheet = "EF_N_fert",
  skip = 0
) |>
  normalise_country_names(Country) |>
  left_join(country_name_code_map, by = c("Country" = "Country name")) |>
  # Drop remaining na-country codes that we do not use. (e.g. "Others Oceania")
  filter(!is.na(`Country code`)) |>
  # Combine the different sources of N-fert. emission factors as a weighted sum
  summarise(
    EF_NH3 = sum(`Share of fertiliser product` * EF_NH3, na.rm = TRUE),
    .by = `Country code`
  )

df_N2O_emission_factors <- df_emission_factors_country |>
  filter(startsWith(Factor, "EF_")) |>
  # Transpose it, so that we have one row for each country with the EFs in cols
  pivot_wider(
    names_from = "Factor",
    values_from = "Value"
  ) |>
  select(
    c(
      "Country code",
      "EF_N2O_soils_min_fert",
      "EF_N2O_soils_crop_res",
      "EF_N2O_soils_indirect",
    )
  )

df_N_emissions <- df_N |>
  left_join(df_N2O_emission_factors, by = "Country code") |>
  left_join(df_N_fert_emission_factors, by = "Country code") |>
  # N2O from crop residues: join df and multiply by emissions factor
  left_join(
    df_N_resid,
    by = c("Crop code", "Crop", "Category", "Country code")
  ) |>
  mutate(
    # N2O from mineral fertiliser use
    # NOTE: 44/28 converts molecular weights between N and N2O
    N2O_soils_min_fert = N_fert * EF_N2O_soils_min_fert * (44 / 28),
    # N2O from crop residuals
    N2O_soils_crop_res = N_resid * EF_N2O_soils_crop_res * (44 / 28),
  ) |>
  transmute(
    `Crop code`,
    `Crop`,
    `Category`,
    `Country code`,
    # N2O from mineral fertiliser use
    N2O_soils_min_fert,
    # N2O from crop residuals
    N2O_soils_crop_res,
    # Indirect soil N2O emissions are a fraction of the direct emissions
    N2O_soils_indirect = EF_N2O_soils_indirect *
      (N2O_soils_min_fert + N2O_soils_crop_res),
    # Add the direct emissions from the manufacturing of the fertiliser
    CO2_Nfert = coalesce(EF_Nfert_CO2 * N_fert, 0),
    N2O_Nfert = coalesce(EF_Nfert_N2O * N_fert, 0)
  )


# Join it all together
# ----------------------------------------------------------

CO2E_CO2 <- 1
CO2E_CH4_b <- 27 # biogenic
CO2E_CH4_f <- 29.8 # fossil
CO2E_N2O <- 273

# We start with the emissions from N per kg of food
df_GHGs <- df_N_emissions |>
  # Add capital goods emissions
  mutate(
    CO2_cap_goods = ef_cap_goods$CO2,
    CH4_cap_goods = ef_cap_goods$CH4,
    N2O_cap_goods = ef_cap_goods$N2O
  ) |>
  # Add the water irrigation energy use
  left_join(df_water_emissions, by = c("Crop code", "Country code")) |>
  # Add emissions of biogenous ch4 specific to rice
  left_join(df_ch4_rice, by = c("Crop code", "Country code")) |>
  mutate(CH4_rice_kg = coalesce(CH4_rice_kg, 0)) |>
  # Add the post harvest operations
  # Set all postharvest values to 0 for greenhouse crops, as this is already
  # included in the normal gh emissions
  left_join(df_post_harvest_emissions, by = c("Category", "Country code")) |>
  mutate(across(
    all_of(c("CO2_postharvest", "CH4_postharvest", "N2O_postharvest")),
    ~ if_else(grepl("_gh", `Crop code`), 0, .)
  )) |>
  # Add the emissions from field operations
  left_join(
    df_field_ops,
    by = c("Crop code", "Crop", "Category", "Country code")
  ) |>
  left_join(df_LUC, by = c("Country code", "Crop code")) |>
  # Add the emissions from field operations
  left_join(df_gh_emissions, by = c("Crop code", "Country code")) |>
  mutate(across(where(is.numeric), ~ coalesce(., 0))) |>
  mutate(
    # "Mineral fertiliser production (CO2)",
    # "Capital goods (CO2)",
    # "Energy primary production (CO2)",
    # "Land use change (CO2)",
    CO2_rm_fert_prod = CO2_Nfert,
    CO2_rm_cap_goods = CO2_cap_goods,
    CO2_rm_energy = CO2_postharvest + CO2_irr + CO2_field_ops + CO2_gh,
    CO2_rm_LUC = coalesce(CO2_LUC, 0),

    # "Mineral fertiliser production (CH4, fossil)",
    # "Capital goods (CH4, fossil)",
    # "Energy primary production (CH4, fossil)",
    # "Soil emissions (CH4, biogenic)",
    # "Enteric fermentation (CH4, biogenic)",
    # "Manure management (CH4, biogenic)",
    # NOTE: CH4 from N fertiliser not included in data, and judged to be negligable
    CH4_fossil_rm_fert_prod = 0,
    CH4_fossil_rm_cap_goods = CH4_cap_goods,
    CH4_fossil_rm_energy = CH4_postharvest + CH4_irr + CH4_field_ops + CH4_gh,
    CH4_bio_rm_soils_dir = CH4_rice_kg,
    CH4_bio_rm_ent_ferm = 0, # Only applicable for animal products
    CH4_bio_rm_manure = 0, # Only applicable for animal products

    # "Mineral fertiliser production (N2O)",
    # "Capital goods (N2O)",
    # "Soil emissions (N2O)",
    # "Energy primary production (N2O)",
    # "Manure management (N2O)"
    N2O_rm_fert_prod = N2O_Nfert,
    N2O_rm_cap_goods = N2O_cap_goods,
    N2O_rm_soils = N2O_soils_min_fert + N2O_soils_crop_res + N2O_soils_indirect,
    # NOTE: The difference due to irrigation is large in some cases.
    N2O_rm_energy = N2O_postharvest + N2O_irr + N2O_field_ops + N2O_gh,
    N2O_rm_manure = 0,
  ) |>
  mutate(
    # "Mineral fertiliser production (CO2e)",
    CO2e_rm_fert_prod = CO2_rm_fert_prod +
      CH4_fossil_rm_fert_prod * CO2E_CH4_f +
      N2O_rm_fert_prod * CO2E_N2O,
    # "Capital goods (CO2e)",
    CO2e_rm_cap_goods = CO2_rm_cap_goods +
      CH4_fossil_rm_cap_goods * CO2E_CH4_f +
      N2O_rm_cap_goods * CO2E_N2O,
    # "Soil emissions (CO2e)",
    CO2e_rm_soils = CO2E_CH4_b *
      CH4_bio_rm_soils_dir +
      N2O_rm_soils * CO2E_N2O,
    # "Energy primary production (CO2e)",
    CO2e_rm_energy = CO2_rm_energy +
      CH4_fossil_rm_energy * CO2E_CH4_f +
      N2O_rm_energy * CO2E_N2O,
    # "Land use change (CO2e)",
    CO2e_rm_LUC = CO2_rm_LUC,
    # "Enteric fermentation (CO2e)",
    CO2e_rm_ent_ferm = CO2E_CH4_b * CH4_bio_rm_ent_ferm,
    # "Manure management (CO2e)",
    CO2e_rm_manure = CO2E_CH4_b * CH4_bio_rm_manure + CO2E_N2O * N2O_rm_manure
  ) |>
  mutate(
    Carbon_Dioxide = CO2_rm_fert_prod +
      CO2_rm_cap_goods +
      CO2_rm_energy +
      CO2_rm_LUC,
    Methane_fossil = CH4_fossil_rm_fert_prod +
      CH4_fossil_rm_cap_goods +
      CH4_fossil_rm_energy,
    Methane_bio = CH4_bio_rm_soils_dir +
      CH4_bio_rm_ent_ferm +
      CH4_bio_rm_manure,
    Nitrous_Oxide = N2O_rm_fert_prod +
      N2O_rm_cap_goods +
      N2O_rm_soils +
      N2O_rm_energy +
      N2O_rm_manure,
  ) |>
  mutate(
    Carbon_Footprint = CO2E_CO2 *
      Carbon_Dioxide +
      CO2E_CH4_f * Methane_fossil +
      CO2E_CH4_b * Methane_bio +
      CO2E_N2O * Nitrous_Oxide,
  ) |>
  # Select and order the GHGs, dropping the now-redundant (~20) columns
  select(
    `Crop code`,
    Crop,
    Category,
    `Country code`,

    Carbon_Footprint,
    Carbon_Dioxide,
    Methane_fossil,
    Methane_bio,
    Nitrous_Oxide,

    CO2e_rm_fert_prod,
    CO2e_rm_cap_goods,
    CO2e_rm_soils,
    CO2e_rm_energy,
    CO2e_rm_LUC,
    CO2e_rm_ent_ferm,
    CO2e_rm_manure,
    CO2_rm_fert_prod,
    CO2_rm_cap_goods,
    CO2_rm_energy,
    CO2_rm_LUC,
    CH4_fossil_rm_fert_prod,
    CH4_fossil_rm_cap_goods,
    CH4_fossil_rm_energy,
    CH4_bio_rm_soils_dir,
    CH4_bio_rm_ent_ferm,
    CH4_bio_rm_manure,
    N2O_rm_fert_prod,
    N2O_rm_cap_goods,
    N2O_rm_soils,
    N2O_rm_energy,
    N2O_rm_manure
  )

# ==========================================================
#  Biodiversity
# ==========================================================

biodiv_factors <- read_excel(
  "../Env ass data/Biodiversity/Biodiversity factors Scherer et al modified as used in SAFAD.xlsx"
) |>
  filter(
    habitat == "Cropland_Intense" |
      habitat == "Cropland_LightIntense" |
      habitat == "Urban_Intense"
  ) |>
  mutate(abs_CF_cty = as.double(abs_CF_cty)) |>
  normalise_country_names(Country) |>
  left_join(country_name_code_map, by = c("Country" = "Country name"))

# TEST: Ensure we have biodiversity data for all countries where we have yields
{
  biodiv_countries_missing <- yields |>
    anti_join(biodiv_factors, by = "Country code") |>
    select(`Country code`) |>
    unique()

  if (nrow(biodiv_countries_missing) > 0) {
    warning(
      paste0("Biodiversity data missing for one or more countries, see "),
      "`biodiv_countries_missing` data-frame."
    )
  }
}

# Expand the biodiversity data from the general, per-country data of:
#   Country code, extinction rate
# to include yield, and as such, we get the different impacts per kg of food.
expand_biodiv <- function(biodiv_df, yields_df) {
  # Compute the sum abs_CF for every country, i.e., across species. Note that
  # we can add the e.g. Cropland_Intense and _LightIntense as they concern
  # different species
  biodiv_df <- biodiv_df |>
    group_by(`Country code`) |>
    summarise(
      abs_CF_cty = sum(abs_CF_cty, na.rm = TRUE),
      .groups = "drop"
    )

  # To convert from PSL (potential species lost) to E/MSY
  # (extinctions per million-species-years), we divide by...
  # - one million of the total number of recognised species (352323),
  # - 10 000 to convert between ha and m2
  # - 100 to allocate the extinction over a time-horizon of 100 years (later)
  # See manuscript for more details.
  CF_TO_EMSY_FACTOR = (352323 / 1e6) / 1e4

  yields_df |>
    left_join(biodiv_df, by = "Country code") |>
    transmute(
      `Crop code`,
      `Country code`,
      Biodiversity = (abs_CF_cty / CF_TO_EMSY_FACTOR) / yield
    )
}

biodiv_cropland <- biodiv_factors |>
  filter(habitat != "Urban_Intense") |>
  expand_biodiv(yields) |>
  filter(!grepl("_gh", `Crop code`))

biodiv_greenhouse <- biodiv_factors |>
  filter(habitat == "Urban_Intense") |>
  expand_biodiv(yields) |>
  filter(grepl("_gh", `Crop code`))

biodiv_joined <- bind_rows(biodiv_cropland, biodiv_greenhouse)


################################################################################
# Joining it all together, starting from the GHGs
################################################################################

# Extend the N with net N input (fertiliser + N fixation), as well as ammonia use
df_N_extended <- df_N |>
  # Combine with data frame with N content (fixation)
  left_join(df_N_contents, by = c("Crop code", "Crop", "Category")) |>
  # And ammonia emission factors
  left_join(df_NH3_emission_factors, by = "Country code") |>
  transmute(
    `Crop code`,
    Crop,
    Category,
    `Country code`,
    Ammonia = N_fert * coalesce(EF_NH3, 0),
    # Rename to ensure we separate the fertiliser use and the net input
    N_input = N_fert + coalesce(`N content`, 0),
  )

df_crops <- df_GHGs |>
  left_join(country_name_code_map, by = "Country code") |>
  left_join(df_land_use, by = c("Crop code", "Country code")) |>
  # Ammonia AND Nitrogen input. Subtract N_contents
  left_join(
    df_N_extended,
    by = c("Crop code", "Crop", "Category", "Country code")
  ) |>
  # Phospohorus fertiliser
  left_join(df_P, by = c("Crop code", "Crop", "Category", "Country code")) |>
  left_join(df_pest, by = c("Crop code", "Crop", "Category", "Country code")) |>
  left_join(df_water, by = c("Crop code", "Country code")) |>
  # Biodiversity
  left_join(biodiv_joined, by = c("Crop code", "Country code")) |>
  mutate(Antibiotics = 0, `Animal welfare` = 0)


# Take out the rows for the gh/of crops, and combine them into averages
df_crops_averages <- df_crops |>
  # Select only the crops with the suffixes _of or _gh
  filter(grepl("(_of|_gh)$", `Crop code`)) |>
  # Add a "base_code", i.e. the code without the suffix.
  mutate(base_code = sub("_.*$", "", `Crop code`)) |>
  # Add the gh_frac, which says how many % of crops are grown in gh
  left_join(gh_fractions, by = c("base_code" = "Crop code", "Country code")) |>
  # Get a fraction we can multiply with for the of columns
  mutate(frac_gh = if_else(grepl("_of$", `Crop code`), 1 - frac_gh, frac_gh)) |>
  mutate(across(
    -c(
      `Crop code`,
      Crop,
      Category,
      `Country code`,
      `Country name`,
      frac_gh,
      base_code
    ),
    ~ frac_gh * .x
  )) |>
  select(-frac_gh, -`Crop code`) |>
  rename(`Crop code` = base_code) |>
  # Replace names for unity
  mutate(Crop = sub(", (greenhouse|openfield)$", "", Crop)) |>
  summarise(
    Crop = first(Crop), # In case greenhouse/openfield were not properly removed
    across(
      where(is.numeric),
      ~ sum(.x, na.rm = TRUE)
    ),
    .by = c(`Crop code`, Category, `Country code`, `Country name`)
  )

# Start working towards the merged data
merged_data <- df_crops |>
  filter(!grepl("(_of|_gh)$", `Crop code`)) |>
  bind_rows(df_crops_averages) |>
  # Remove suffix from some crop names
  mutate(Crop = gsub(", average$", "", Crop)) |>
  # Set the order
  transmute(
    Code = `Crop code`,
    Name = Crop,
    Category,
    Country_name = `Country name`,
    Country_code = `Country code`,

    # Different names in the livestock versions. Oh well.
    Carbon_Footprint,
    Carbon_Dioxide,
    Methane_fossil,
    Methane_bio,
    Nitrous_Oxide,

    HFC = 0,
    Land,
    N_input,
    P_input = P_fert,
    Water,
    Pesticides = pesticides_use,
    Biodiversity,
    Ammonia,
    Labour = 0,
    Animal_Welfare = `Animal welfare`,
    Antibiotics,

    CO2e_rm_fert_prod,
    CO2e_rm_cap_goods,
    CO2e_rm_soils,
    CO2e_rm_energy,
    CO2e_rm_LUC,
    CO2e_rm_ent_ferm,
    CO2e_rm_manure,

    CO2_rm_fert_prod,
    CO2_rm_cap_goods,
    CO2_rm_energy,
    CO2_rm_LUC,

    CH4_fossil_rm_fert_prod,
    CH4_fossil_rm_cap_goods,
    CH4_fossil_rm_energy,
    CH4_bio_rm_soils_dir,
    CH4_bio_rm_ent_ferm,
    CH4_bio_rm_manure,

    N2O_rm_fert_prod,
    N2O_rm_cap_goods,
    N2O_rm_soils,
    N2O_rm_energy,
    N2O_rm_manure,
  )

# Append mushrooms
df_mushrooms <- read_crop_excel("Mushrooms.xlsx", sheet = "Crop Data", skip = 0)
merged_data <- bind_rows(merged_data, df_mushrooms)


################################################################################
################################ LIVESTOCK #####################################
################################################################################

livestock_files <- c(
  "Chicken.xlsx",
  "Pig.xlsx",
  "Dairy.xlsx",
  "Egg.xlsx",
  "Lamb.xlsx",
  "Rabbit.xlsx"
)

# Some excel-files have values that are outside of the intended ranges.
# Use this fn to drop them for a consistent number of columns at all times.
remove_unnamed_cols <- function(df) {
  df |>
    select(all_of(names(df)[!is.na(names(df)) & names(df) != ""]))
}

# Read all the livestock files
for (j in 1:length(livestock_files)) {
  print(paste0(j, " ", livestock_files[j]))
  # Read the indicator data from the file
  livestock_data <- read_excel(
    paste0("../2 - Livestock/", livestock_files[j]),
    sheet = "Footprints, results per kg",
    skip = 5
  ) |>
    # Assign new names to the columns
    setNames(c(
      "Code",
      "Name",
      "Category",
      "Country_name",
      "Country_code",
      "Carbon_Footprint",
      "Carbon_Dioxide",
      "Methane_fossil",
      "Methane_bio",
      "Nitrous_Oxide",
      "HFC",
      "Land",
      "N_input",
      "P_input",
      "Water",
      "Pesticides",
      "Biodiversity",
      "Ammonia",
      "Labour",
      "Animal_Welfare",
      "Antibiotics"
    )) |>
    remove_unnamed_cols() |>
    mutate(
      Code = as.character(Code),
      Name = as.character(Name),
      Category = as.character(Category),
      Country_name = as.character(Country_name),
      Country_code = as.character(Country_code)
    )

  # Read all the disaggregated climate impact data
  livestock_data_CF_dis_all <- read_excel(
    paste0("../2 - Livestock/", livestock_files[j]),
    sheet = "GHG detailed, results per kg",
    skip = 5
  ) |>
    # Assign new names to the columns
    setNames(c(
      "Code",
      "Name",
      "Category",
      "Country_name",
      "Country_code",
      "Gas",
      "Sum",
      "Fert_prod",
      "Cap_goods",
      "Soils_dir",
      "Soils_indir",
      "Energy_diesel",
      "Energy_gh",
      "Energy_irr",
      "Energy_ph",
      "LUC",
      "Energy_feed_proc",
      "Energy_feed_t",
      "Ent_ferm",
      "Manure_tot",
      "Manure_dir",
      "Manure_indir",
      "Energy_stables",
      "Energy_slaughter"
    )) |>
    remove_unnamed_cols()

  # Helper function
  num <- function(x) as.numeric(x)

  # Select the different rows with either CO2-equivalents, CO2, CH4 fossil, CH4 biogenic and N2O
  livestock_data_CF_dis <- livestock_data_CF_dis_all |>
    filter(Gas == "CO2e") |>
    mutate(
      CO2e_rm_soils = num(Soils_dir) + num(Soils_indir),
      CO2e_rm_energy = num(Energy_diesel) +
        num(Energy_irr) +
        num(Energy_ph) +
        num(Energy_feed_proc) +
        num(Energy_feed_t) +
        num(Energy_stables) +
        num(Energy_slaughter)
    ) |>
    # Select only the columns that are needed and rename columns to reflect gases.
    transmute(
      CO2e_rm_fert_prod = Fert_prod,
      CO2e_rm_cap_goods = Cap_goods,
      CO2e_rm_soils = CO2e_rm_soils,
      CO2e_rm_energy = CO2e_rm_energy,
      CO2e_rm_LUC = LUC,
      CO2e_rm_ent_ferm = Ent_ferm,
      CO2e_rm_manure = Manure_tot
    )

  # CO2
  livestock_data_CF_dis1 <- livestock_data_CF_dis_all |>
    filter(Gas == "CO2") |>
    mutate(
      CO2_rm_energy = num(Energy_diesel) +
        num(Energy_irr) +
        num(Energy_ph) +
        num(Energy_feed_proc) +
        num(Energy_feed_t) +
        num(Energy_stables) +
        num(Energy_slaughter)
    ) |>
    transmute(
      CO2_rm_fert_prod = Fert_prod,
      CO2_rm_cap_goods = Cap_goods,
      CO2_rm_energy = CO2_rm_energy,
      CO2_rm_LUC = LUC
    )

  # CH4 fossil
  livestock_data_CF_dis2 <- livestock_data_CF_dis_all |>
    filter(Gas == "CH4, fossil") |>
    mutate(
      CH4_fossil_rm_energy = num(Energy_diesel) +
        num(Energy_irr) +
        num(Energy_ph) +
        num(Energy_feed_proc) +
        num(Energy_feed_t) +
        num(Energy_stables) +
        num(Energy_slaughter)
    ) |>
    transmute(
      CH4_fossil_rm_fert_prod = Fert_prod,
      CH4_fossil_rm_cap_goods = Cap_goods,
      CH4_fossil_rm_energy = CH4_fossil_rm_energy
    )

  # CH4 biogenic (your original code did not compute a combined metric here; keep as-is but rename)
  livestock_data_CF_dis3 <- livestock_data_CF_dis_all |>
    filter(Gas == "CH4, biogenic") |>
    transmute(
      CH4_bio_rm_soils_dir = Soils_dir,
      CH4_bio_rm_ent_ferm = Ent_ferm,
      CH4_bio_rm_manure = Manure_tot
    )

  # N2O
  livestock_data_CF_dis4 <- livestock_data_CF_dis_all |>
    filter(Gas == "N2O") |>
    mutate(
      N2O_rm_soils = num(Soils_dir) + num(Soils_indir),
      N2O_rm_energy = num(Energy_diesel) +
        num(Energy_irr) +
        num(Energy_ph) +
        num(Energy_feed_proc) +
        num(Energy_feed_t) +
        num(Energy_stables) +
        num(Energy_slaughter)
    ) |>
    transmute(
      N2O_rm_fert_prod = Fert_prod,
      N2O_rm_cap_goods = Cap_goods,
      N2O_rm_soils = N2O_rm_soils,
      N2O_rm_energy = N2O_rm_energy,
      N2O_rm_manure = Manure_tot
    )

  # Add the disaggregated carbon footprint to the other indicators
  livestock_data <- livestock_data |>
    bind_cols(
      livestock_data_CF_dis,
      livestock_data_CF_dis1,
      livestock_data_CF_dis2,
      livestock_data_CF_dis3,
      livestock_data_CF_dis4
    )

  # Store everything in one dataset
  merged_data <- bind_rows(merged_data, livestock_data)
}

# Add the beef data that is compiled in a function
source("Merge_beef.R")
beef_data <- merge_beef()
merged_data <- bind_rows(merged_data, beef_data)

################################################################################
################# SET SOME COMMODITIES TO ZERO FOR NOW #########################
################################################################################

products_zero <- list("Game meat", "Honey")
products_zero_codes <- list("21170.02", "02910")
for (k in seq_along(products_zero)) {
  zero_data <- c(
    products_zero_codes[[k]],
    products_zero[[k]],
    "Wild foods",
    "Rest of World",
    "RoW",
    rep("0", ncol(merged_data) - 5) # adjust if first 5 fields are the non-zeros
  )
  zero_row <- as_tibble_row(setNames(as.list(zero_data), names(merged_data))) |>
    mutate(
      across(1:5, as.character),
      across(6:length(names(merged_data)), as.double)
    )

  # Store also that in the common dataset
  merged_data <- bind_rows(merged_data, zero_row)
}

################################################################################
############################ NOVEL FOODS #######################################
################################################################################

path_novel <- "../4 - Novel foods/Novel foods.xlsx"

id_cols <- c("Code", "Name", "Category", "Country_name", "Country_code")
num <- function(x) as.numeric(x)

energy_cols <- c(
  "Energy_diesel",
  "Energy_gh",
  "Energy_irr",
  "Energy_ph",
  "Energy_feed_proc",
  "Energy_feed_t",
  "Energy_stables",
  "Energy_slaughter"
)

# ---- main novel foods table ----
novel_food <- read_excel(
  path_novel,
  sheet = "Footprints, results per kg",
  skip = 4
) |>
  setNames(c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Carbon_Footprint",
    "Carbon_Dioxide",
    "Methane_fossil",
    "Methane_bio",
    "Nitrous_Oxide",
    "HFC",
    "Land",
    "N_input",
    "P_input",
    "Water",
    "Pesticides",
    "Biodiversity",
    "Ammonia",
    "Labour",
    "Animal_Welfare",
    "Antibiotics"
  )) |>
  remove_unnamed_cols() |>
  mutate(across(all_of(id_cols), as.character))

# ---- disaggregated GHG table (all gases) ----
novel_food_CF_dis_all <- read_excel(
  path_novel,
  sheet = "GHG detailed, results per kg",
  skip = 4
) |>
  setNames(c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "CO2e_rm_fert_prod",
    "CO2e_rm_cap_goods",
    "CO2e_rm_soils_dir",
    "CO2e_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "CO2e_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CO2e_rm_ent_ferm",
    "CO2e_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )) |>
  remove_unnamed_cols()

# ---- split-by-gas, rename, compute derived metrics, and keep only needed cols ----

# CO2e (already has correct rm_* names in the file)
novel_food_CF_dis <- novel_food_CF_dis_all |>
  filter(Gas == "CO2e") |>
  mutate(
    CO2e_rm_soils = num(CO2e_rm_soils_dir) + num(CO2e_rm_soils_indir),
    CO2e_rm_energy = num(Energy_diesel) +
      num(Energy_gh) +
      num(Energy_irr) +
      num(Energy_ph) +
      num(Energy_feed_proc) +
      num(Energy_feed_t) +
      num(Energy_stables) +
      num(Energy_slaughter)
  ) |>
  transmute(
    CO2e_rm_fert_prod,
    CO2e_rm_cap_goods,
    CO2e_rm_soils,
    CO2e_rm_energy,
    CO2e_rm_LUC,
    CO2e_rm_ent_ferm,
    CO2e_rm_manure
  )

# CO2: rename CO2e_* columns to CO2_* for the same structure, then compute energy
novel_food_CF_dis1 <- novel_food_CF_dis_all |>
  filter(Gas == "CO2") |>
  rename_with(~ sub("^CO2e_rm_", "CO2_rm_", .x), starts_with("CO2e_rm_")) |>
  mutate(
    CO2_rm_energy = rowSums(across(all_of(energy_cols), num), na.rm = TRUE)
  ) |>
  transmute(
    CO2_rm_fert_prod,
    CO2_rm_cap_goods,
    CO2_rm_energy,
    CO2_rm_LUC
  )

# CH4 fossil
novel_food_CF_dis2 <- novel_food_CF_dis_all |>
  filter(Gas == "CH4, fossil") |>
  rename_with(
    ~ sub("^CO2e_rm_", "CH4_fossil_rm_", .x),
    starts_with("CO2e_rm_")
  ) |>
  mutate(
    CH4_fossil_rm_energy = rowSums(
      across(all_of(energy_cols), num),
      na.rm = TRUE
    )
  ) |>
  transmute(
    CH4_fossil_rm_fert_prod,
    CH4_fossil_rm_cap_goods,
    CH4_fossil_rm_energy
  )

# CH4 biogenic (no derived soils/energy in your original code; keep the direct soils_dir + ent_ferm + manure)
novel_food_CF_dis3 <- novel_food_CF_dis_all |>
  filter(Gas == "CH4, biogenic") |>
  rename_with(~ sub("^CO2e_rm_", "CH4_bio_rm_", .x), starts_with("CO2e_rm_")) |>
  transmute(
    CH4_bio_rm_soils_dir = CH4_bio_rm_soils_dir,
    CH4_bio_rm_ent_ferm = CH4_bio_rm_ent_ferm,
    CH4_bio_rm_manure = CH4_bio_rm_manure
  )

# N2O
novel_food_CF_dis4 <- novel_food_CF_dis_all |>
  filter(Gas == "N2O") |>
  rename_with(~ sub("^CO2e_rm_", "N2O_rm_", .x), starts_with("CO2e_rm_")) |>
  mutate(
    N2O_rm_soils = num(N2O_rm_soils_dir) + num(N2O_rm_soils_indir),
    N2O_rm_energy = rowSums(across(all_of(energy_cols), num), na.rm = TRUE)
  ) |>
  transmute(
    N2O_rm_fert_prod,
    N2O_rm_cap_goods,
    N2O_rm_soils,
    N2O_rm_energy,
    N2O_rm_manure
  )

# ---- combine + append ----
novel_food <- novel_food |>
  bind_cols(
    novel_food_CF_dis,
    novel_food_CF_dis1,
    novel_food_CF_dis2,
    novel_food_CF_dis3,
    novel_food_CF_dis4
  )

merged_data <- merged_data |>
  bind_rows(novel_food)

################################################################################
############################ APPROXIMATIONS ####################################
################################################################################

# Add "small" products that should be approximated with other products
# First read the list of small products
small_products_list <- read_excel("RPC Approximations.xlsx") |>
  transmute(
    Approx_with,
    From_country,
    new_Code = SUA_Code,
    new_Name = SUA_Item,
    new_Country_name = Country,
    new_Country_code = Country_code
  )

new_rows <- merged_data |>
  # keep only rows that are relevant for small_products_list (must match)
  inner_join(
    small_products_list,
    by = c("Name" = "Approx_with", "Country_name" = "From_country")
  ) |>
  # replicate your "remove empty rows"
  filter(!is.na(Code)) |>
  # overwrite identifiers to create the new product rows
  mutate(
    Code = new_Code,
    Name = new_Name,
    Country_name = new_Country_name,
    Country_code = new_Country_code
  ) |>
  # drop join helper columns from small_products_list
  select(-starts_with("new_")) |>
  # keep only genuinely new rows (avoid re-adding)
  anti_join(merged_data, by = c("Code", "Country_code"))

# append
merged_data <- bind_rows(merged_data, new_rows)

################################################################################
############################ ONE ROW FOR EACH FOODEX2 CODE #####################
################################################################################

# Start by reading the file with all the codes
RPC_SUA_codes <- read_excel("../Codes/RPC to SUA.xlsx", sheet = "All") |>
  select(
    "Code",
    "FoodEx2 Code",
    "Long Code",
    "FoodEx2 Name"
  )

# Merge the two datasets so that there is one row per FoodEx2 code
merged_codes <- inner_join(
  RPC_SUA_codes,
  merged_data,
  by = "Code",
  relationship = "many-to-many"
) |>
  # Rearrange the columns, remove HFC and Labour (not used), and rename
  transmute(
    `Long code` = `Long Code`,
    `FoodEx2 code` = `FoodEx2 Code`,
    `FoodEx2 name` = `FoodEx2 Name`,
    `SUA code` = Code,
    `SUA name` = Name,
    `Country name` = `Country_name`,
    `Country code` = `Country_code`,
    `Carbon footprint, primary production` = `Carbon_Footprint`,
    `Carbon dioxide, primary production` = `Carbon_Dioxide`,
    `Methane, fossil, primary production` = `Methane_fossil`,
    `Methane, biogenic, primary production` = `Methane_bio`,
    `Nitrous oxide, primary production` = `Nitrous_Oxide`,
    Land, # m2 * year / kg product
    `N input` = `N_input`,
    `P input` = `P_input`,
    Water,
    Pesticides,
    Biodiversity,
    Ammonia,
    `Animal welfare` = `Animal_Welfare`,
    Antibiotics,
    `Mineral fertiliser production (CO2e)` = CO2e_rm_fert_prod,
    `Capital goods (CO2e)` = CO2e_rm_cap_goods,
    `Soil emissions (CO2e)` = CO2e_rm_soils,
    `Energy primary production (CO2e)` = CO2e_rm_energy,
    `Land use change (CO2e)` = CO2e_rm_LUC,
    `Enteric fermentation (CO2e)` = CO2e_rm_ent_ferm,
    `Manure management (CO2e)` = CO2e_rm_manure,
    `Mineral fertiliser production (CO2)` = CO2_rm_fert_prod,
    `Capital goods (CO2)` = CO2_rm_cap_goods,
    `Energy primary production (CO2)` = CO2_rm_energy,
    `Land use change (CO2)` = CO2_rm_LUC,
    `Mineral fertiliser production (CH4, fossil)` = CH4_fossil_rm_fert_prod,
    `Capital goods (CH4, fossil)` = CH4_fossil_rm_cap_goods,
    `Energy primary production (CH4, fossil)` = CH4_fossil_rm_energy,
    `Soil emissions (CH4, biogenic)` = CH4_bio_rm_soils_dir,
    `Enteric fermentation (CH4, biogenic)` = CH4_bio_rm_ent_ferm,
    `Manure management (CH4, biogenic)` = CH4_bio_rm_manure,
    `Mineral fertiliser production (N2O)` = N2O_rm_fert_prod,
    `Capital goods (N2O)` = N2O_rm_cap_goods,
    `Soil emissions (N2O)` = N2O_rm_soils,
    `Energy primary production (N2O)` = N2O_rm_energy,
    `Manure management (N2O)` = N2O_rm_manure
  )

################################################################################
############################ ADD MISC AND BLUE FOODS ###########################
################################################################################

# Add the misc ingredients that are already on the correct format
misc_ing <- read_excel(
  "../5 - Misc ingredients/Misc ingredients.xlsx",
  sheet = "Used in recipes"
)

# Add the blue food that are already in the correct format
blue_food <- read_excel(
  "../3 - Blue foods/Blue food.xlsx",
  sheet = "Footprints, results per kg"
)

merged_codes <- bind_rows(merged_codes, misc_ing, blue_food)

################################################################################
############################ ADJUST BIODIVERSITY ###############################
################################################################################

# Divide the biodiversity indicator according to the time perspective
merged_codes <- merged_codes |>
  mutate(Biodiversity = as.numeric(Biodiversity) / 100)

################################################################################
############################ WRITE THE FINAL FILE  #############################
################################################################################

# Remove empty rows that appear for some reason and write a file
merged_codes <- merged_codes |>
  filter(!is.na(`Long code`))
# Create dir '../SAFAD FILES/Input files"
dir.create(file.path("..", "SAFAD files"), showWarnings = FALSE)
dir.create(file.path("../SAFAD files", "Input files"), showWarnings = FALSE)
# The _excel version includes a UT8 BOM
write_excel_csv(
  merged_codes,
  file = "../SAFAD files/Input files/SAFAD ID Footprints RPC.csv",
  na = ""
)

################################################################################
############################ SELECT THE FEED DATA  #############################
################################################################################

# Select the feed products
feed_products <- c(
  "0115",
  "0112",
  "0117",
  "0116",
  "0111",
  "01705",
  "01702"
)

# Select the countries for which we need feed data
feed_countries <- c(
  "Denmark",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Netherlands",
  "New Zealand",
  "Poland",
  "Spain",
  "Sweden",
  "UK"
)

feed_data <- merged_data |>
  # Select the data
  filter(Code %in% feed_products & Country_name %in% feed_countries) |>
  # Add a column for sorting (integer index), as per the order in feed_products
  mutate(Order = match(Code, feed_products))

# Write to file
write.csv(
  feed_data,
  file = "../2 - Livestock/Feed Footprints.csv",
  row.names = FALSE,
  na = ""
)

source("./compare_output.R")
