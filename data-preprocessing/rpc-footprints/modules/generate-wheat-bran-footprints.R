library(dplyr)
library(readxl)
library(readr)
library(tidyr)

generate_wheat_bran_footprints <- function(
  input_dir = "../../src/default-input-files",
  feed_footprints_file = "./2 - Livestock/Feed Footprints.csv",
  emission_factors_file = "./1 - Crops/Emission factors.xlsx"
) {
  read_input <- \(file) {
    read_csv(
      file.path(input_dir, file),
      show_col_types = FALSE
    )
  }

  wheat_bran <- "A.01.03.001.008"
  grain_milling <- "F28.A0C03"
  feed_countries <- c(
    "AR", "BR", "DK", "FR", "DE", "GR", "HU", "IE", "IT",
    "NL", "NZ", "PL", "ES", "SE", "GB"
  )
  living_lab_countries <- c(
    "DE", "DK", "ES", "FR", "GR", "HU", "IE", "IT", "PL", "SE"
  )

  feed_footprints <- read_csv(feed_footprints_file, show_col_types = FALSE)
  stopifnot(
    setequal(
      feed_footprints |> distinct(Country_code) |> pull(),
      feed_countries
    )
  )

  recipes <- read_input("SAFAD IP Recipes.csv")
  process_energy <- read_input("SAFAD IP Energy Proc.csv")
  electricity <- read_excel(
    emission_factors_file,
    sheet = "EF country spec",
    skip = 4
  ) |>
    select(-Description, -Unit) |>
    filter(startsWith(Factor, "EF_electricity_")) |>
    mutate(across(-Factor, \(value) suppressWarnings(as.double(value)))) |>
    rename(RoW = Default) |>
    pivot_longer(
      cols = -Factor,
      names_to = "Country_code",
      values_to = "Value"
    ) |>
    drop_na(Value) |>
    mutate(
      Gas = case_when(
        endsWith(Factor, "CO2") ~ "CO2",
        endsWith(Factor, "CH4") ~ "CH4",
        endsWith(Factor, "N2O") ~ "N2O"
      )
    ) |>
    select(-Factor) |>
    pivot_wider(
      names_from = Gas,
      values_from = Value
    ) |>
    transmute(
      Country_code,
      CO2,
      CH4,
      N2O
    )

  grain_milling_energy <- process_energy |>
    filter(`Facet Code` == grain_milling) |>
    pull(Electricity) |>
    first()

  bran_energy <- recipes |>
    filter(`Food code` == wheat_bran) |>
    slice_head(n = 1) |>
    summarise(
      energy = grain_milling_energy *
        `Reverse Yield Factor` *
        `Allocation Factor`
    ) |>
    pull(energy)

  row_factors <- electricity |>
    filter(Country_code == "RoW") |>
    slice_head(n = 1)
  stopifnot(nrow(row_factors) == 1)

  tibble(Country_code = feed_countries) |>
    left_join(
      electricity |> filter(Country_code != "RoW"),
      by = "Country_code"
    ) |>
    mutate(
      across(
        c(CO2, CH4, N2O),
        \(factor) if_else(
          Country_code %in% living_lab_countries,
          coalesce(factor, row_factors[[cur_column()]][[1]]),
          0 # 0 emissions for now as a place-holder.
        )
      ),
      `Processing (kg CO2e)` = bran_energy * (CO2 + 29.8 * CH4 + 273 * N2O),
      `Processing (kg CO2)` = bran_energy * CO2,
      `Processing (kg CH4, fossil)` = bran_energy * CH4,
      `Processing (kg N2O)` = bran_energy * N2O
    ) |>
    transmute(
      Code = wheat_bran,
      `Country code` = Country_code,
      `Processing (kg CO2e)`,
      `Processing (kg CO2)`,
      `Processing (kg CH4, fossil)`,
      `Processing (kg N2O)`
    )
}
