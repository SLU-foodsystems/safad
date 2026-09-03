# Merge the different data sets (suckler beef, dairy, dairy calves)
library(readxl)
library(dplyr)
library(tidyr)
library(purrr)

# Helper function to drop columns with empty or NA names
drop_empty_name_columns <- function(df) {
  df[, nzchar(names(df)) & !is.na(names(df))]
}

# Helper function to read livestock data with consistent structure
read_livestock_data <- function(
  file_path,
  footprint_sheet,
  ghg_sheet,
  skip_rows = 5
) {
  # Define column templates
  base_cols <- c(
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
  )

  ghg_cols <- c(
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
  )

  # Read footprint data
  footprint <- read_excel(
    file_path,
    sheet = footprint_sheet,
    skip = skip_rows
  ) |>
    setNames(base_cols) |>
    drop_empty_name_columns() |>
    mutate(across(
      c(Code, Name, Category, Country_name, Country_code),
      as.character
    ))

  # Read GHG detailed data
  ghg_all <- read_excel(file_path, sheet = ghg_sheet, skip = skip_rows) |>
    setNames(ghg_cols) |>
    drop_empty_name_columns()

  # Helper to convert to numeric
  as_num <- function(x) as.numeric(x)

  # Energy columns for summing
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

  # Process CO2e
  ghg_co2e <- ghg_all |>
    filter(Gas == "CO2e") |>
    transmute(
      CO2e_rm_fert_prod,
      CO2e_rm_cap_goods,
      CO2e_rm_soils = as_num(CO2e_rm_soils_dir) + as_num(CO2e_rm_soils_indir),
      CO2e_rm_energy = rowSums(
        across(all_of(energy_cols), as_num),
        na.rm = TRUE
      ),
      CO2e_rm_LUC,
      CO2e_rm_ent_ferm,
      CO2e_rm_manure
    )

  # Process CO2
  ghg_co2 <- ghg_all |>
    filter(Gas == "CO2") |>
    rename_with(~ gsub("CO2e_rm_", "CO2_rm_", .x), starts_with("CO2e_rm_")) |>
    transmute(
      CO2_rm_fert_prod,
      CO2_rm_cap_goods,
      CO2_rm_energy = rowSums(
        across(all_of(energy_cols), as_num),
        na.rm = TRUE
      ),
      CO2_rm_LUC
    )

  # Process CH4 fossil
  ghg_ch4_fossil <- ghg_all |>
    filter(Gas == "CH4, fossil") |>
    rename_with(
      ~ gsub("CO2e_rm_", "CH4_fossil_rm_", .x),
      starts_with("CO2e_rm_")
    ) |>
    transmute(
      CH4_fossil_rm_fert_prod,
      CH4_fossil_rm_cap_goods,
      CH4_fossil_rm_energy = rowSums(
        across(all_of(energy_cols), as_num),
        na.rm = TRUE
      )
    )

  # Process CH4 biogenic
  ghg_ch4_bio <- ghg_all |>
    filter(Gas == "CH4, biogenic") |>
    rename_with(
      ~ gsub("CO2e_rm_", "CH4_bio_rm_", .x),
      starts_with("CO2e_rm_")
    ) |>
    transmute(
      CH4_bio_rm_soils_dir,
      CH4_bio_rm_ent_ferm,
      CH4_bio_rm_manure
    )

  # Process N2O
  ghg_n2o <- ghg_all |>
    filter(Gas == "N2O") |>
    rename_with(~ gsub("CO2e_rm_", "N2O_rm_", .x), starts_with("CO2e_rm_")) |>
    transmute(
      N2O_rm_fert_prod,
      N2O_rm_cap_goods,
      N2O_rm_soils = as_num(N2O_rm_soils_dir) + as_num(N2O_rm_soils_indir),
      N2O_rm_energy = rowSums(
        across(all_of(energy_cols), as_num),
        na.rm = TRUE
      ),
      N2O_rm_manure
    )

  # Combine all parts
  bind_cols(footprint, ghg_co2e, ghg_co2, ghg_ch4_fossil, ghg_ch4_bio, ghg_n2o)
}

# Define column order template
beef_col_order <- c(
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
  "Antibiotics",
  "CO2e_rm_fert_prod",
  "CO2e_rm_cap_goods",
  "CO2e_rm_soils",
  "CO2e_rm_energy",
  "CO2e_rm_LUC",
  "CO2e_rm_ent_ferm",
  "CO2e_rm_manure",
  "CO2_rm_fert_prod",
  "CO2_rm_cap_goods",
  "CO2_rm_energy",
  "CO2_rm_LUC",
  "CH4_fossil_rm_fert_prod",
  "CH4_fossil_rm_cap_goods",
  "CH4_fossil_rm_energy",
  "CH4_bio_rm_soils_dir",
  "CH4_bio_rm_ent_ferm",
  "CH4_bio_rm_manure",
  "N2O_rm_fert_prod",
  "N2O_rm_cap_goods",
  "N2O_rm_soils",
  "N2O_rm_energy",
  "N2O_rm_manure"
)

# Main function
merge_beef <- function() {
  # Read all livestock datasets and reorder columns
  suckler_data <- read_livestock_data(
    "./2 - Livestock/Suckler beef.xlsx",
    "Footprints, results per kg",
    "GHG detailed, results per kg"
  ) |>
    select(all_of(beef_col_order))

  dairy24m_data <- read_livestock_data(
    "./2 - Livestock/Dairy calves 24m.xlsx",
    "Footprints, results per kg",
    "GHG detailed, results per kg"
  ) |>
    select(all_of(beef_col_order))

  dairy9m_data <- read_livestock_data(
    "./2 - Livestock/Dairy calves 9m.xlsx",
    "Footprints, results per kg",
    "GHG detailed, results per kg"
  ) |>
    select(all_of(beef_col_order))

  dairycows_data <- read_livestock_data(
    "./2 - Livestock/Dairy.xlsx",
    "Footprints, results per kg meat",
    "GHG det, results per kg meat"
  ) |>
    select(all_of(beef_col_order))

  # Read shares
  shares <- read_excel("./2 - Livestock/Beef shares.xlsx", sheet = "Summary")

  # Calculate weighted average
  beef_average <- seq_len(nrow(shares)) |>
    lapply(function(i) {
      # Extract shares
      shares_vec <- shares[
        i,
        c(
          "Shares_dairy_cows",
          "Shares_suckler",
          "Shares_dairy24m",
          "Shares_dairy9m"
        )
      ] |>
        unlist() |>
        as.numeric()
      names(shares_vec) <- c("dairy_cow", "suckler", "dairy24m", "dairy9m")

      # Get numeric columns (6:43)
      cols_to_weight <- 6:43

      # Extract and weight data from each system
      list(
        dairycows_data[i, cols_to_weight],
        suckler_data[i, cols_to_weight],
        dairy24m_data[i, cols_to_weight],
        dairy9m_data[i, cols_to_weight]
      ) |>
        lapply(function(df) {
          df |>
            mutate(across(everything(), as.numeric)) |>
            mutate(across(everything(), ~ . * shares_vec[[cur_column()]]))
        }) |>
        reduce(`+`)
    }) |>
    bind_rows()

  # Add label columns
  beef_average <- dairycows_data |>
    select(all_of(beef_col_order[1:5])) |>
    bind_cols(beef_average) |>
    mutate(
      Code = "21111.02",
      Name = "Bovine muscle",
      Category = "Red meat"
    )

  return(beef_average)
}
