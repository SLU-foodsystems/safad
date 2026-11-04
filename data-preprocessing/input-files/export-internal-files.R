{
  library(readxl)
  library(dplyr)
  library(readr)
  library(here)
}

setwd(here())

# SAFAD IP Energy Processes
# - Take the Summary-sheet and export as-is.
df_energy_proc <- read_excel(
  "./SAFAD INTERNAL IP Energy processing.xlsx",
  sheet = "Summary",
  skip = 3
)
df_energy_proc |>
  write_excel_csv("../../src/default-input-files/SAFAD IP Energy Proc.csv")

# SAFAD IP Recipes
# - Take the Recipes-sheet and export as-is.
df_recipes <- read_excel(
  "./SAFAD INTERNAL IP Recipes.xlsx",
  sheet = "Recipes",
  skip = 0
)
df_recipes |>
  write_excel_csv("../../src/default-input-files/SAFAD IP Recipes.csv")
