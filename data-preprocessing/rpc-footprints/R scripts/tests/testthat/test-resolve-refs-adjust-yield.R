testthat::test_that("yield_last: RAW_REF resolves to absolute then divides by target yield", {
  # C1: SE has absolute 20; NO references SE-C1
  df_wide <- tibble::tibble(
    `Crop code` = "C1",
    Crop = "Wheat",
    Category = "A",
    Default = "10",
    SE = 20,
    NO = "SE" # will be normalised to "SE-C1"
  )

  yields <- tibble::tibble(
    `Crop code` = c("C1", "C1", "C1"),
    `Country code` = c("SE", "NO", "Default"),
    yield = c(4, 5, 2)
  )

  out <- resolve_refs_adjust_yield(
    df_wide = df_wide,
    yields = yields,
    values_to = "N_fert",
    n_index_cols = 3,
    yield_strategy = "yield-last"
  )

  se <- out |>
    dplyr::filter(`Country code` == "SE") |>
    dplyr::pull(N_fert)

  no <- out |>
    dplyr::filter(`Country code` == "NO") |>
    dplyr::pull(N_fert)

  # yield_last semantics:
  # SE => 20 / 4 = 5
  # NO => ref to SE absolute 20; divide by NO yield 5 => 4
  testthat::expect_equal(se, 5)
  testthat::expect_equal(no, 4)
})

testthat::test_that("yield_first: RAW_REF copies post-yield value (uses ref_yield at terminal RAW_ABS)", {
  df_wide <- tibble::tibble(
    `Crop code` = "C1",
    Crop = "Wheat",
    Category = "A",
    Default = "10",
    SE = 20,
    NO = "SE" # normalised to "SE-C1"
  )

  yields <- tibble::tibble(
    `Crop code` = c("C1", "C1", "C1"),
    `Country code` = c("SE", "NO", "Default"),
    yield = c(4, 5, 2)
  )

  out <- resolve_refs_adjust_yield(
    df_wide = df_wide,
    yields = yields,
    values_to = "N_fert",
    n_index_cols = 3,
    yield_strategy = "yield-first"
  )

  se <- out |>
    dplyr::filter(`Country code` == "SE") |>
    dplyr::pull(N_fert)

  no <- out |>
    dplyr::filter(`Country code` == "NO") |>
    dplyr::pull(N_fert)

  # yield_first semantics:
  # SE => 20/4 = 5
  # NO references SE; should copy post-yield value (20/4 = 5), NOT 20/5
  testthat::expect_equal(se, 5)
  testthat::expect_equal(no, 5)
})

testthat::test_that("Default fallback: DEF_ABS used when raw_value is NA", {
  df_wide <- tibble::tibble(
    `Crop code` = "C1",
    Crop = "Wheat",
    Category = "A",
    Default = "10",
    SE = NA, # triggers Default
    NO = NA # triggers Default
  )

  yields <- tibble::tibble(
    `Crop code` = c("C1", "C1", "C1"),
    `Country code` = c("SE", "NO", "Default"),
    yield = c(4, 5, 2)
  )

  out_last <- resolve_refs_adjust_yield(
    df_wide,
    yields = yields,
    values_to = "v",
    n_index_cols = 3,
    yield_strategy = "yield-last"
  )
  out_first <- resolve_refs_adjust_yield(
    df_wide,
    yields = yields,
    values_to = "v",
    n_index_cols = 3,
    yield_strategy = "yield-first"
  )

  # Default=10 is DEF_ABS terminal => ref_yield should remain NA, so yield_first doesn't change result.
  se_last <- out_last |> dplyr::filter(`Country code` == "SE") |> dplyr::pull(v)
  se_first <- out_first |>
    dplyr::filter(`Country code` == "SE") |>
    dplyr::pull(v)

  no_last <- out_last |> dplyr::filter(`Country code` == "NO") |> dplyr::pull(v)
  no_first <- out_first |>
    dplyr::filter(`Country code` == "NO") |>
    dplyr::pull(v)

  testthat::expect_equal(se_last, 10 / 4)
  testthat::expect_equal(no_last, 10 / 5)
  testthat::expect_equal(se_first, se_last)
  testthat::expect_equal(no_first, no_last)
})

testthat::test_that("DEF_REF chain is followed to bottom (Default -> SE-C2 -> RAW_ABS)", {
  # C1 Default references SE-C2; raw is NA so we use Default path
  # C2 SE is absolute 40
  df_wide <- tibble::tibble(
    `Crop code` = c("C1", "C2"),
    Crop = c("Wheat", "Wheat"),
    Category = c("A", "A"),
    Default = c("SE-C2", "999"), # C1 Default is ref; C2 Default ABS doesn't matter here
    SE = c(NA, 40),
    NO = c(NA, NA)
  )

  yields <- tibble::tibble(
    `Crop code` = c("C1", "C2", "C2", "C1", "C2", "C1", "C2"),
    `Country code` = c("Default", "Default", "SE", "SE", "NO", "NO", "SE"),
    yield = c(2, 2, 8, 3, 10, 11, 8)
  ) |>
    dplyr::distinct(`Crop code`, `Country code`, .keep_all = TRUE)

  # yield_last:
  # C1 SE raw NA -> use Default -> SE-C2 -> absolute 40, terminal is RAW_ABS at (C2,SE) yield=8
  # yield_last divides by target yield (C1,SE) which is 3 => 40/3
  out_last <- resolve_refs_adjust_yield(df_wide, yields, "yield-last", 3, "v")

  c1_se_last <- out_last |>
    dplyr::filter(`Crop code` == "C1", `Country code` == "SE") |>
    dplyr::pull(v)

  testthat::expect_equal(c1_se_last, 40 / 3)

  # yield_first:
  # now we overwrite yield with ref_yield for RAW_ABS terminal (8), so 40/8
  out_first <- resolve_refs_adjust_yield(df_wide, yields, "yield-first", 3, "v")

  c1_se_first <- out_first |>
    dplyr::filter(`Crop code` == "C1", `Country code` == "SE") |>
    dplyr::pull(v)

  testthat::expect_equal(c1_se_first, 40 / 8)
})

testthat::test_that("Missing yield rows are dropped in prepare_df_long", {
  df_wide <- tibble::tibble(
    `Crop code` = "C1",
    Crop = "Wheat",
    Category = "A",
    Default = "10",
    SE = 20,
    NO = 30
  )

  yields <- tibble::tibble(
    `Crop code` = c("C1", "C1"),
    `Country code` = c("SE", "Default"),
    yield = c(4, 2)
  )

  out <- resolve_refs_adjust_yield(df_wide, yields, "yield-last", 3, "v")

  # NO yield is missing => NO row should be absent
  testthat::expect_false(any(out$`Country code` == "NO"))
})

testthat::test_that("More complex data frame, hand-coded", {
  # C1 Default references SE-C2; raw is NA so we use Default path
  # C2 SE is absolute 40
  df_wide <- tribble(
    ~`Crop code`, ~Crop ,     ~Category, ~Default,      ~SE, ~DK,
    "tomato",    "tomato",    "A",       "16",           NA,  NA,
    "cucumber",  "cucumber",  "A",       "SE",           6,   NA,
    "pumpkin",   "pumpkin",   "A",       "SE-cucumber",  NA,  NA,
    "wheat",     "wheat",     "A",       "4",            12,  "SE",
    "kernza",    "kernza",    "A",       "Default-wheat",NA,  "3",
    "wildwheat", "wildwheat", "A",       "SE-wheat",     NA,  NA
  )
  
  yields <- tibble::tibble(
    `Crop code` = c("tomato", "tomato", "cucumber", "cucumber", "pumpkin", "pumpkin", "wheat", "wheat", "kernza", "kernza", "wildwheat", "wildwheat"),
    `Country code` = rep(c("SE", "DK"), times = 6),
    yield = c(2, 4, 2, 4, 10, 20, 10, 20, 4, 2, 100, 100),
  ) |>
    dplyr::distinct(`Crop code`, `Country code`, .keep_all = TRUE)
  
  # yield_last:
  # C1 SE raw NA -> use Default -> SE-C2 -> absolute 40, terminal is RAW_ABS at (C2,SE) yield=8
  # yield_last divides by target yield (C1,SE) which is 3 => 40/3
  out_last <- resolve_refs_adjust_yield(df_wide, yields, "yield-first", 3, "v")
  
  expected <- tribble(
    ~`Crop code`, ~Crop ,     ~Category, ~`Country code`, ~v,
    "tomato",    "tomato",    "A",       "SE",            8,
    "tomato",    "tomato",    "A",       "DK",            4,
    "cucumber",  "cucumber",  "A",       "SE",            3,
    "cucumber",  "cucumber",  "A",       "DK",            3,
    "pumpkin",   "pumpkin",   "A",       "SE",            3,
    "pumpkin",   "pumpkin",   "A",       "DK",            3,
    "wheat",     "wheat",     "A",       "SE",            1.2,
    "wheat",     "wheat",     "A",       "DK",            1.2,
    "kernza",    "kernza",    "A",       "SE",            1,  
    "kernza",    "kernza",    "A",       "DK",            1.5,
    "wildwheat", "wildwheat", "A",       "SE",            1.2,
    "wildwheat", "wildwheat", "A",       "DK",            1.2,
  ) |> arrange(`Crop code`)
  
  # Check that all rows are present first
  diff_rows <- out_last |> anti_join(expected, by = c("Crop code", "Crop", "Category", "Country code"))
  testthat::expect_equal(nrow(diff_rows), 0)
  
  # Then more exact comparison
  testthat::expect_equal(expected, out_last)
})
