{
  library(readxl)
  library(dplyr)
  library(readr)
  library(tidyr)
  library(tibble)
}

keys <- c("SUA code", "Country code") 


clean_data <- function(df) {
  df |>
    select(-`Long code`, -`FoodEx2 code`, -`FoodEx2 name`, -Category, -`Country name`) |>
    distinct(across(all_of(keys)), .keep_all = TRUE) |>
    # Add Yield
    mutate(Yield = 1e4 / Land) |>
    relocate(Yield, .before = Land) |>
    arrange(`SUA code`, `Country code`)
}

prod_data <- read_csv("../../../src/default-input-files/SAFAD ID Footprints RPC.csv", show_col_types = FALSE) |>
  clean_data()

dev_data <- read_csv("../SAFAD files/Input files/SAFAD ID Footprints RPC.csv", show_col_types = FALSE) |>
  clean_data()

# TEST 1: Were codes added and/or removed?
{
  rows_added <- dev_data |>
    anti_join(prod_data, by = c("SUA code", "Country code"))
  
  rows_removed <- prod_data |>
    anti_join(dev_data, by = c("SUA code", "Country code"))
}

# Filter out so we have the same items
dev_data <- dev_data |>
  semi_join(prod_data, by = c("SUA code", "Country code"))

prod_data <- prod_data |>
  semi_join(dev_data, by = c("SUA code", "Country code")) |>
  select(-`SUA name`)


pct_diff <- dev_data |>
  left_join(prod_data, by = keys, suffix = c("_dev", "_prod")) |>
  mutate(
    across(
      where(is.numeric) & ends_with("_dev"),
        ~ {
        dev <- .x
        prod <- get(sub("_dev$", "_prod", cur_column()))
        (dev - prod) / prod
      },
      .names = "{sub('_dev$', '', .col)}_pct_diff"
    )
  ) |>
  select(-ends_with("_dev"), -ends_with("_prod"))

abs_diff <- dev_data |>
  left_join(prod_data, by = keys, suffix = c("_dev", "_prod")) |>
  mutate(
    across(
      where(is.numeric) & ends_with("_dev"),
        ~ {
        dev <- .x
        prod <- get(sub("_dev$", "_prod", cur_column())) 
        (dev - prod)
      },
      .names = "{sub('_dev$', '', .col)}_abs_diff"
    )
  ) |>
  select(all_of(keys), ends_with("_abs_diff"))

pct_diff <- pct_diff |>
  left_join(abs_diff, by = keys)

write_excel_csv(pct_diff, "./pct_diff.csv")

# Helpers for comparing
get_cols <- function(df, substr) {
  df |>
    select(all_of(keys), matches(substr))
}

compare_data <- function(substr) {
  dev_data |>
    get_cols(substr) |>
    left_join(
      prod_data |> get_cols(substr),
      by = keys,
      suffix = c("_dev", "_prod")
    ) |>
    left_join(
      pct_diff |> get_cols("_pct_diff") |> get_cols(substr)
    )
}
