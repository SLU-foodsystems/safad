# Bootstrap pacman, used to manage dependencies
if (!requireNamespace("pacman", quietly = TRUE)) {
  if (interactive()) {
    install.packages("pacman")
  } else {
    stop(
      "pacman is required but not installed. Please install it.",
      call. = FALSE
    )
  }
}

library(pacman)
p_load(readxl, dplyr, readr, tidyr, tibble, here, fs)

LL_countries <- c(
  "DE",
  "DK",
  "ES",
  "FR",
  "GR",
  "HU",
  "IR",
  "IT",
  "PL",
  "SE"
)


# CO2, CH4 and N2O emission factors (kg per MJ) across energy sources,
# irregardless of country
EF_general <- read_excel(
  "rpc-footprints/1 - Crops/Emission factors.xlsx",
  sheet = "EF general",
  skip = 3
) |>
  filter(Gas %in% c("CO2", "CH4", "N2O")) |>
  select(Parameter, Gas, Value) |>
  pivot_wider(
    values_from = "Value",
    names_from = "Gas",
  ) |>
  rename(`Energy carrier` = Parameter) |>
  mutate(
    `Energy carrier` = case_when(
      `Energy carrier` == "Other fossil" ~ "Other fossil energy sources",
      `Energy carrier` == "Wood chips" ~ "Bark and chips",
      `Energy carrier` == "Pellets" ~ "Pellets and briquettes",
      `Energy carrier` == "Other renew" ~ "Other renewable energy sources",
      TRUE ~ `Energy carrier`
    )
  ) |>
  mutate(`Country code` = "RoW") |>
  filter(`Energy carrier` != "Irrigation")


EF_country_specific <- read_excel(
  "rpc-footprints/1 - Crops/Emission factors.xlsx",
  sheet = "EF country spec",
  skip = 4
) |>
  select(-Description, -Unit) |>
  filter(
    startsWith(Factor, "EF_electricity_") |
      startsWith(Factor, "EF_district_heating_")
  ) |>
  mutate(across(-c(Factor), ~ suppressWarnings(as.double(.)))) |>
  rename("RoW" = "Default") |>
  pivot_longer(
    cols = -c(Factor),
    names_to = "Country code",
    values_to = "Value"
  ) |>
  drop_na(Value) |>
  mutate(
    `Energy carrier` = case_when(
      startsWith(Factor, "EF_elect") ~ "Electricity",
      startsWith(Factor, "EF_distr") ~ "District heating"
    ),
    `Gas` = case_when(
      endsWith(Factor, "CO2") ~ "CO2",
      endsWith(Factor, "CH4") ~ "CH4",
      endsWith(Factor, "N2O") ~ "N2O",
    )
  ) |>
  select(-Factor) |>
  pivot_wider(
    values_from = "Value",
    names_from = "Gas"
  ) |>
  # The process energy factors are only used for the LL countries, and we're
  # thus only interested in these country rows. Exclude any others.
  filter(`Country code` %in% c(LL_countries, "RoW")) |>
  arrange(`Energy carrier`, `Country code`)

out <- bind_rows(
  EF_country_specific,
  EF_general
) |>
  transmute(
    `Energy carrier`,
    `Country code`,
    `Carbon dioxide` = CO2,
    `Methane, fossil` = CH4,
    `Nitrous oxide` = N2O
  )

write_csv(out, "../src/default-input-files/SAFAD IEF Energy.csv")
