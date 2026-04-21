{
  library(tidyverse)
  library(readxl)
  library(tibble)
}

ll_countries <- tribble(
  ~`Country code`, ~`Country name`,
  "DE", "Germany",
  "DK", "Germany",
  "ES", "Spain",
  "FR", "France",
  "GR", "Greece",
  "HU", "Hungary",
  "IE", "Ireland",
  "IT", "Italy",
  "PL", "Poland",
  "SE", "Sweden"
)

# PART 1: Parse the RDS file

item_names <-
  bind_rows(
    readxl::read_excel(
      "./metadata_level1_tracing.xlsx",
      sheet = "Item Codes",
      skip = 2
    ),
    readxl::read_excel(
      "./metadata_level1_tracing.xlsx",
      sheet = "Item Codes",
      skip = 2
    )
  ) |>
  distinct()

country_codes <- readxl::read_excel(
  "./metadata_level1_tracing.xlsx",
  sheet = "Country Codes",
  skip = 2
) |>
  transmute(
    `Country FAO Code` = `Country Code`,
    `Country Code` = `ISO2 Code`,
    `Country Name` = Country
  )

trade_data <- readRDS("./production_consumption_data_level1_2022-2024.rds") |>
  # Average across years
  group_by(Consumer.Country, Producer.Country, Item.Code) |>
  summarise(
    Value = mean(primary.equivalents, na.rm = TRUE),
    .groups = 'drop' # Removes grouping
  ) |>
  # Extend with Item Names and Country Codes
  left_join(item_names, by = c("Item.Code" = "Item Code")) |>
  left_join(country_codes, by = c("Consumer.Country" = "Country FAO Code")) |>
  rename(
    "Consumer Country Name" = "Country Name",
    "Consumer Country Code" = "Country Code"
  ) |>
  left_join(country_codes, by = c("Producer.Country" = "Country FAO Code")) |>
  transmute(
    `Consumer Country Code`,
    `Consumer Country Name`,
    `Producer Country Code` = `Country Code`,
    `Produced Country Name` = `Country Name`,
    `Item Code` = `Item.Code`,
    `Item Name` = Item,
    Value
  ) |>
  filter(`Consumer Country Code` %in% ll_countries$`Country code`)
  

# PART 2: Convert into final output
RESULT_PRECISION <- 3
MIN_SHARE_THRESHOLD <- 0.01

# Waste factors are keyed by country-name (e.g. "Sweden") and rpc-category
# We'll join them later on (Country name == consumer_country)
waste_factors <- read_csv("rpc-waste-factors.csv", show_col_types = FALSE) |>
  setNames(c("Category", "Country name", "Waste"))

fao_to_sua <- read_csv("fao-to-sua.csv", show_col_types = FALSE) 
rpc_to_sua <- read_csv("rpc-to-sua.csv", show_col_types = FALSE) |>
  select(-`SUA Name`)

ALL_COUNTRY_OVERRIDES <- tribble(
  ~`RPC Code`,    ~`RPC Name`,                            ~`Producer Country Name`, ~`Producer Country Code`, ~Share, ~Waste, ~`SUA Code`,
  "A.02.08.002",  "Sugar cane (Saccharum officinarum)",   "Spain",                  "ES",                     1,     0.045,  "01802",
  # TODO: Fix palm. 254
)

OVERRIDE_CODES <- unique(ALL_COUNTRY_OVERRIDES$`RPC Code`)

round_to_precision <- function(x, digits) round(x, digits = digits)

get_food_item_shares_tbl <- function(consumer_country_code) {
  filtered <- trade_data |>
    filter(`Consumer Country Code` == consumer_country_code) |>
    select(`Producer Country Code`, `Item Code`, `Value`) |>
    drop_na(`Item Code`) |>
    filter(Value > 0)
  
  if (nrow(filtered) == 0) {
    stop(sprintf("Data for country %s not found.", consumer_country_code))
  }
  
  filtered |>
    group_by(`Item Code`) |>
    mutate(
      total = sum(Value),
      share = Value / total
    ) |>
    ungroup() |>
    # DROP all below share threshold
    filter(share >= MIN_SHARE_THRESHOLD) |>
    # Re-adjust so percentages add up to 100% 
    group_by(`Item Code`) |>
    mutate(share = round_to_precision(share / sum(share), RESULT_PRECISION)) |>
    ungroup() |>
    select(`Item Code`, `Producer Country Code`, share)
}

for (i in seq_len(nrow(ll_countries))) {
  consumer_country_code <- ll_countries$`Country code`[[i]]
  consumer_country_name <- ll_countries$`Country name`[[i]]
  
  shares_tbl <- get_food_item_shares_tbl(consumer_country_code)
  
  # ---- build SUA template + validate missing FAO item code (non-BF) ----
  sua_template <- fao_to_sua |>
    mutate(
      is_blue_food = str_starts(`SUA Code`, "BF-"),
      fao_item_missing = is.na(`Item Code`) | is.na(`Item Code`)
    )
  
  missing_fao <- sua_template |>
    filter(fao_item_missing, !is_blue_food) |>
    distinct(`SUA Code`, `SUA Name`)
  
  if (nrow(missing_fao) > 0) {
    # mimic your JS: print errors but continue
    missing_fao |>
      mutate(msg = sprintf(
        'ERR: No matching FAO itemCode for SUA item "%s" (%s) found.',
        `SUA Name`, `SUA Code`
      )) |>
      pull(msg) |>
      walk(warning)
  }
  
  sua_template <- sua_template |>
    filter(!(fao_item_missing & !is_blue_food))
  
  # ---- join SUA -> RPC (expands one SUA to many RPC codes) ----
  # Keep exactly one row per RPC Code like your _rpcCodesCache:
  # If rpc-to-sua has duplicates for RPC Code, keep first.
  rpc_map_unique <- rpc_to_sua |>
    distinct(`RPC Code`, .keep_all = TRUE)
  
  base <- sua_template |>
    left_join(rpc_map_unique, by = "SUA Code") |>
    select(-is_blue_food, -fao_item_missing)
  
  # Warn on missing RPC codes
  missing_rpc <- base |>
    filter(is.na(`RPC Code`)) |>
    distinct(`SUA Code`, `SUA Name`, `Item Name`, `Item Code`)
  
  if (nrow(missing_rpc) > 0) {
    missing_rpc |>
      mutate(msg = sprintf(
        'ERR: RPC codes missing for SUA item: %s (%s). Item is %s (%s).',
        `SUA Name`, `SUA Code`, `Item Name`, `Item Code`
      )) |>
      pull(msg) |>
      walk(warning)
  }
  
  # Drop any items with missing long codes
  base <- base |>
    filter(!is.na(`RPC Code`))
  
  # ---- waste factors ----
  # If category missing, fall back to "Other" 
  waste_filtered <- waste_factors |> filter(`Country name` == consumer_country) |> select(-`Country name`)
  waste_fallback <- (waste_filtered |> filter(Category == "Other"))$Waste
  base <- base |>
    left_join(waste_filtered, by = "Category" ) |>
    mutate(Waste = if_else(is.na(Waste), waste_fallback, Waste))
  
  
  # ---- shares: join on FAO item code ----
  out <- base |>
    left_join(shares_tbl, by = "Item Code", relationship="many-to-many") |>
    # Some items will not have had shares. Assign them to RoW with share = 1
    mutate(
      `Producer Country Code` = coalesce(`Producer Country Code`, "RoW"),
       share = coalesce(share, 1),
    ) |>
    # Add in the producer country names
    left_join(country_codes, by = c("Producer Country Code" = "Country Code")) |>
    transmute(
      `RPC Code`,
      `RPC Name` = `FoodEx2 Name`,
      # If producer country name missing (e.g. RoW), keep code as name fallback
      `Producer Country Name` = coalesce(`Country Name`, `Producer Country Code`),
      `Producer Country Code`,
      Share = share,
      Waste,
      `SUA Code`
    ) |>
    # Skip override codes (added later)
    filter(!(`RPC Code` %in% OVERRIDE_CODES)) |>
    bind_rows(ALL_COUNTRY_OVERRIDES) |>
    arrange(`RPC Code`)
  
  write_excel_csv(
    out,
    sprintf(
      "../../src/default-input-files/SAFAD IP Origin and Waste of RPC/SAFAD IP Origin and Waste of RPC %s.csv",
      consumer_country_code
    )
  )
}

