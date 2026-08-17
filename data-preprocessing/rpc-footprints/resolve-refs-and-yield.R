# THIS IS THE MOST ADVANCED CODE IN THE R SCRIPTS.
# Note that there are tests in tests/testthat/test-resolve-refs-adjust-yield.R

library(stats)

as_dbl <- function(x) suppressWarnings(as.double(x))

# Predicate: Does the string (chr) parse as a number?
.is_numeric_chr <- function(x) {
  # Vectorized: returns logical vector same length as x
  x <- trimws(x)
  ok <- !is.na(x) &
    x != "" &
    grepl("^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?$", x)
  ok
}

normalise_ref <- function(type_predicate, ref_str, crop_code) {
  if_else(
    {{ type_predicate }} & !grepl("-", {{ ref_str }}),
    paste({{ ref_str }}, {{ crop_code }}, sep = "-"),
    {{ ref_str }}
  )
}

prepare_df_long <- function(df_wide, yields, n_index_cols = 3) {
  required <- c("Crop code", "Default")
  missing <- setdiff(required, names(df_wide))
  if (length(missing) > 0) {
    stop("Missing columns: ", paste(missing, collapse = ", "))
  }

  country_cols <- names(df_wide) |> tail(-n_index_cols - 1)

  # Create a long-form data frame and keep track of the type of data
  df_long <- df_wide |>
    mutate(
      Default = coalesce(as.character(Default), "0"),
      across(all_of(country_cols), as.character),
    ) |>
    pivot_longer(
      cols = all_of(country_cols),
      names_to = "Country code",
      values_to = "raw_value",
    ) |>
    left_join(yields, by = c("Crop code", "Country code")) |>
    filter(!is.na(yield) & yield > 0) |>
    mutate(
      datum_type = case_when(
        .is_numeric_chr(raw_value) ~ "RAW_ABS",
        !is.na(raw_value) ~ "RAW_REF",
        .is_numeric_chr(Default) ~ "DEF_ABS",
        !is.na(Default) ~ "DEF_REF",
        TRUE ~ NA_character_
      ),
      def_datum_type = if_else(.is_numeric_chr(Default), "ABS", "REF"),
      # Ensure our references are "complete" both in the Default and the raw_val
      # column: i.e. {Country/Default}-{Crop code} (not only "SE")
      Default = normalise_ref(def_datum_type == "REF", Default, `Crop code`),
      raw_value = normalise_ref(
        datum_type == "RAW_REF",
        raw_value,
        `Crop code`
      ),
      # Set a common ref_str to reduce conditionals in the code below
      ref_str = case_when(
        datum_type == "RAW_REF" ~ raw_value,
        datum_type == "DEF_REF" ~ Default,
        TRUE ~ NA_character_
      ),
      # Set a common value that reflects the prioritized value across default and raw
      value = case_when(
        datum_type == "RAW_ABS" ~ raw_value,
        datum_type == "DEF_ABS" ~ Default,
        datum_type == "RAW_REF" ~ ref_str,
        datum_type == "DEF_REF" ~ ref_str,
        TRUE ~ NA_character_
      ),
      ref_yield = NA_real_,
    )

  # Note: raw_value and ref_str could be deleted after this step, as they are
  # made redundant by the "value" column. But they are useful for debugging, and
  # are dropped in the code later anyways.

  return(df_long)
}


resolve_references_long <- function(df) {
  required <- c(
    "Crop code",
    "Country code",
    "datum_type",
    "ref_str",
    "value",
    "yield",
    "def_datum_type",
    "Default"
  )
  missing <- setdiff(required, names(df))
  if (length(missing) > 0) {
    stop("Missing columns: ", paste(missing, collapse = ", "))
  }

  n <- nrow(df)

  # ---------- Helpers ----------
  parse_ref_str <- function(s) {
    if (is.na(s) || !nzchar(s)) {
      return(NULL)
    }
    parts <- strsplit(s, "-", fixed = TRUE)[[1]]
    if (length(parts) != 2) {
      return(NULL)
    }
    list(ref_head = parts[1], ref_crop = parts[2])
  }

  # ---------- Default lookup by crop ----------
  default_tbl <- df[
    !duplicated(df[["Crop code"]]),
    c("Crop code", "Default", "def_datum_type")
  ]
  default_value_str <- stats::setNames(
    default_tbl$Default,
    default_tbl$`Crop code`
  )
  default_type <- stats::setNames(
    default_tbl$def_datum_type,
    default_tbl$`Crop code`
  )

  # ---------- Row lookup by (crop||country) ----------
  key_row <- paste(df[["Crop code"]], df[["Country code"]], sep = "||")
  if (any(duplicated(key_row))) {
    dup <- unique(key_row[duplicated(key_row)])
    # If we error here, it means we have duplicates in the key_row, i.e., that
    # there are at least two rows with the same Crop+country combo in the df.
    stop(
      "Expected unique (Crop code, Country code) rows. Duplicates found for: ",
      paste(dup, collapse = ", ")
    )
  }
  row_index <- stats::setNames(seq_len(n), key_row)

  # ---------- Cache: row i -> resolved result ----------
  # Each entry: list(value=<dbl>, ref_yield=<dbl|NA>)
  cache <- vector("list", n)
  cached <- rep(FALSE, n)

  resolve_row <- function(i, seen_env) {
    if (cached[i]) {
      return(cache[[i]])
    }

    dt <- df$datum_type[i]

    if (dt == "RAW_ABS" | dt == "DEF_ABS") {
      v <- as_dbl(df$value[i])
      if (is.na(v)) {
        stop(
          "Row ",
          i,
          " marked ",
          dt,
          " but value is not numeric: ",
          df$value[i]
        )
      }
      out <- list(value = v, terminal_type = dt, terminal_row = i)
      cache[[i]] <<- out
      cached[i] <<- TRUE
      return(out)
    }

    rs <- df$ref_str[i]
    if (is.na(rs) || !nzchar(rs)) {
      stop("Row ", i, " is REF but ref_str is empty/NA.")
    }
    out <- resolve_ref(rs, seen_env = seen_env)
    cache[[i]] <<- out
    cached[i] <<- TRUE
    out
  }

  resolve_ref <- function(ref_string, seen_env) {
    if (exists(ref_string, envir = seen_env, inherits = FALSE)) {
      stop("Circular reference detected: ", ref_string)
    }
    assign(ref_string, TRUE, envir = seen_env)

    parsed <- parse_ref_str(ref_string)
    if (is.null(parsed)) {
      stop("Invalid reference format: ", ref_string)
    }

    head <- parsed$ref_head
    crop <- parsed$ref_crop

    # Target is a 'Default', and not a Country-specific value.
    if (identical(head, "Default")) {
      def_val <- default_value_str[[crop]]
      def_t <- default_type[[crop]]
      if (is.null(def_val) || is.null(def_t)) {
        stop("Missing Default for crop=", crop, " via ", ref_string)
      }

      # Default is an ABS
      if (identical(def_t, "ABS")) {
        v <- as_dbl(def_val)
        if (is.na(v)) {
          stop(
            "Default marked ABS but not numeric for crop ",
            crop,
            ": ",
            def_val
          )
        }
        return(list(
          value = v,
          terminal_type = "DEF_ABS",
          terminal_row = NA_integer_
        ))
      }
      if (identical(def_t, "REF")) {
        return(resolve_ref(def_val, seen_env = seen_env))
      }
      stop("Unexpected def_datum_type for crop ", crop, ": ", def_t)
    }

    target_key <- paste(crop, head, sep = "||")
    tryCatch(
      {
        target_i <- row_index[[target_key]]
      },
      error = function(e) {
        stop(
          "Failed accessing target_key=",
          target_key,
          ". Error was: ",
          e$message
        )
      }
    )

    if (is.null(target_i)) {
      stop("Missing target row for ref ", ref_string, " => ", target_key)
    }

    resolve_row(target_i, seen_env = seen_env)
  }

  # ---------- Apply across all rows ----------
  resolved_value <- numeric(n)
  ref_yield <- rep(NA_real_, n)

  for (i in seq_len(n)) {
    seen <- new.env(parent = emptyenv())
    out <- resolve_row(i, seen_env = seen)

    resolved_value[i] <- out$value

    if (identical(out$terminal_type, "RAW_ABS") && !is.na(out$terminal_row)) {
      ref_yield[i] <- df$yield[out$terminal_row]
    } else {
      ref_yield[i] <- NA_real_
    }
  }

  df$value_resolved <- resolved_value
  df$ref_yield <- ref_yield
  df
}

## MAIN FUNCTION
resolve_refs_adjust_yield <- function(
  df_wide,
  yields,
  yield_strategy = "yield-last",
  n_index_cols = 3,
  values_to = "value",
  approximated_to = ""
) {
  if (!(yield_strategy %in% c("yield-first", "yield-last", "no-yield"))) {
    stop("Invalid value for yield_strategy", yield_strategy)
  }

  df_resolved <- df_wide |>
    arrange(`Crop code`) |>
    prepare_df_long(yields, n_index_cols) |>
    resolve_references_long()

  yield_adjusted_values <- if (yield_strategy == "yield-first") {
    df_resolved$value_resolved /
      coalesce(
        df_resolved$ref_yield,
        df_resolved$yield
      )
  } else if (yield_strategy == "yield-last") {
    df_resolved$value_resolved / df_resolved$yield
  } else if (yield_strategy == "no-yield") {
    df_resolved$value_resolved
  } else {
    stop("Unknown yield_strategy: ", yield_strategy)
  }

  result <- df_resolved |>
    transmute(
      `Crop code`,
      `Crop`,
      `Category`,
      `Country code`,
      !!values_to := yield_adjusted_values,
      is_approximated = datum_type != "RAW_ABS"
    )

  if (approximated_to == "") {
    result |> select(-is_approximated)
  } else {
    result |> rename(!!approximated_to := is_approximated)
  }
}
