#!/usr/bin/env Rscript

# Run from data-preprocessing:
#   Rscript debug-transport-flag-paths.R
#   Rscript debug-transport-flag-paths.R recipes.csv report.csv

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(tibble)
})

args <- commandArgs(trailingOnly = TRUE)
recipes_file <- if (length(args) >= 1) {
  args[[1]]
} else {
  "../src/default-input-files/SAFAD IP Recipes.csv"
}
output_file <- if (length(args) >= 2) args[[2]] else NULL

recipes_data <- read_csv(recipes_file, show_col_types = FALSE) |>
  mutate(
    transport_flag = case_when(
      `Transport on net weight (1/0)` == 1 ~ "N",
      `Transport on net weight (1/0)` == 0 ~ "G",
      TRUE ~ NA_character_
    )
  )

if (anyNA(recipes_data$transport_flag)) {
  stop("Every recipe row must have a transport flag of 0 or 1.")
}

recipes_by_food <- split(recipes_data, recipes_data$`Food code`)
recipes_by_edge <- split(
  recipes_data,
  paste(recipes_data$`Food code`, recipes_data$`Component code`, sep = "\r")
)

has_mixed_net_gross_path <- function(flags) {
  state <- "before_net"

  for (flag in flags) {
    if (state == "before_net" && flag == "N") {
      state <- "after_net"
    } else if (state == "after_net" && flag == "G") {
      state <- "after_gross"
    } else if (state == "after_gross" && flag == "N") {
      return(TRUE)
    }
  }

  FALSE
}

walk_recipe <- function(
  food_code,
  root_code,
  flags = character(),
  path = food_code,
  visited = character()
) {
  if (food_code %in% visited) {
    flag_depth <- length(flags)
    return(tibble(
      root_code,
      leaf_code = food_code,
      flags = paste(flags, collapse = " -> "),
      path,
      depth = flag_depth,
      cycle = TRUE,
      self_reference = FALSE
    ))
  }

  rows <- recipes_by_food[[food_code]]
  if (is.null(rows)) {
    flag_depth <- length(flags)
    return(tibble(
      root_code,
      leaf_code = food_code,
      flags = paste(flags, collapse = " -> "),
      path,
      depth = flag_depth,
      cycle = FALSE,
      self_reference = FALSE
    ))
  }

  bind_rows(lapply(seq_len(nrow(rows)), function(index) {
    row <- rows[index, ]
    component_code <- row$`Component code`[[1]]

    if (component_code == food_code) {
      return(tibble(
        root_code,
        leaf_code = food_code,
        flags = paste(flags, collapse = " -> "),
        path,
        depth = length(flags),
        cycle = FALSE,
        self_reference = TRUE
      ))
    }

    next_flags <- c(flags, row$transport_flag[[1]])
    next_path <- paste(path, component_code, sep = " -> ")

    walk_recipe(
      food_code = component_code,
      root_code = root_code,
      flags = next_flags,
      path = next_path,
      visited = c(visited, food_code)
    )
  }))
}

all_paths <- bind_rows(lapply(names(recipes_by_food), \(food_code) {
  walk_recipe(food_code, food_code)
})) |>
  mutate(
    returns_to_net_after_gross = mapply(
      has_mixed_net_gross_path,
      strsplit(flags, " -> ", fixed = TRUE)
    ),
    mixed_net_gross = grepl("N", flags, fixed = TRUE) &
      grepl("G", flags, fixed = TRUE)
  )

first_net_data <- bind_rows(lapply(seq_len(nrow(all_paths)), function(index) {
  path_codes <- strsplit(all_paths$path[[index]], " -> ", fixed = TRUE)[[1]]
  path_flags <- strsplit(all_paths$flags[[index]], " -> ", fixed = TRUE)[[1]]
  net_indices <- which(path_flags == "N")
  if (length(net_indices) == 0) {
    return(tibble(
      first_net_normal_reverse_yield = NA_real_,
      first_net_preparation_reverse_yield = NA_real_,
      first_net_amount_changes = FALSE
    ))
  }
  net_index <- net_indices[[1]]
  recipe <- recipes_by_edge[[
    paste(path_codes[[net_index]], path_codes[[net_index + 1]], sep = "\r")
  ]]

  normal_yield <- recipe$`Reverse Yield Factor`[[1]] *
    recipe$`Allocation Factor`[[1]]
  preparation_yield <- coalesce(
    recipe$`Preparation reverse yield`[[1]],
    1
  )

  tibble(
    first_net_normal_reverse_yield = normal_yield,
    first_net_preparation_reverse_yield = preparation_yield,
    first_net_amount_changes =
      normal_yield != 1 | preparation_yield != 1
  )
}))

all_paths <- bind_cols(all_paths, first_net_data)

mixed_paths <- all_paths |>
  filter(mixed_net_gross, !cycle) |>
  arrange(root_code, path)

cat("Recipe roots:", n_distinct(all_paths$root_code), "\n")
cat("Traversed paths:", nrow(all_paths), "\n")
cat("Cycle paths:", sum(all_paths$cycle), "\n")
cat("Mixed net/gross paths:", nrow(mixed_paths), "\n")
cat(
  "Paths with net -> gross+ -> net:",
  sum(mixed_paths$returns_to_net_after_gross),
  "\n\n"
)

if (nrow(mixed_paths) > 0) {
  print(mixed_paths, n = Inf, width = Inf)
}

if (!is.null(output_file)) {
  write_csv(mixed_paths, output_file)
  cat("\nWrote:", output_file, "\n")
}
