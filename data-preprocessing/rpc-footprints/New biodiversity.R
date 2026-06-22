#install.packages("readxl")
library(readxl)
library(dplyr)

yield_data <- NULL
biod_data <-NULL

# Read the biodiversity data from the file
biod_data <- read_csv("../Env ass data/Biodiversity/CF_by_hab_ctry_taxa.csv")

# Filter out the cropland data for that country from the dataset
rep_data <- filter(biod_data, romnam == "Sweden" & habitat == "Cropland_LightIntense" & species_group == "Reptiles")
amp_data <- filter(biod_data, romnam == "Sweden" & habitat == "Cropland_LightIntense" & species_group == "Amphibians")
mam_data <- filter(biod_data, romnam == "Sweden" & habitat == "Cropland_LightIntense" & species_group == "Mammals")
birds_data <- filter(biod_data, romnam == "Sweden" & habitat == "Cropland_LightIntense" & species_group == "Birds")
plant_data <- filter(biod_data, romnam == "Sweden" & habitat == "Cropland_Intense" & species_group == "Plants")

# Calculate the E/MSY per hektar of cropland, 992122 it total number of species (provided in file in mail from Scherer)
Ext_per_ha_cropland <- (rep_data$CF_taxa_habitat_cty + amp_data$CF_taxa_habitat_cty + mam_data$CF_taxa_habitat_cty + birds_data$CF_taxa_habitat_cty + plant_data$CF_taxa_habitat_cty)*10000/(992122/1e6)
# Allocate over 100 years
Ext_per_ha_cropland <- Ext_per_ha_cropland/100

# Filter out the urban data for that country from the dataset (to be used for greenhouses)
rep_data <- filter(biod_data, romnam == "Sweden" & habitat == "Urban_Intense" & species_group == "Reptiles")
amp_data <- filter(biod_data, romnam == "Sweden" & habitat == "Urban_Intense" & species_group == "Amphibians")
mam_data <- filter(biod_data, romnam == "Sweden" & habitat == "Urban_Intense" & species_group == "Mammals")
birds_data <- filter(biod_data, romnam == "Sweden" & habitat == "Urban_Intense" & species_group == "Birds")
plant_data <- filter(biod_data, romnam == "Sweden" & habitat == "Urban_Intense" & species_group == "Plants")

# Calculate the E/MSY per hektar of urban areas, 992122 it total number of species (provided in file in mail from Scherer)
Ext_per_ha_urban <- (rep_data$CF_taxa_habitat_cty + amp_data$CF_taxa_habitat_cty + mam_data$CF_taxa_habitat_cty + birds_data$CF_taxa_habitat_cty + plant_data$CF_taxa_habitat_cty)*10000/(992122/1e6)
# Allocate over 100 years
Ext_per_ha_urban <- Ext_per_ha_urban/100

# Read the indicator data from the file
#crop_data <- read_excel(paste0("../1 - Crops/", input_files$Crops[i]), sheet = "Footprints, results per kg")
yield_data <- read_excel("../1 - Crops/Crops Sweden.xlsx", sheet = "Crops, input data per ha")

# Remove the first four rows
yield_data <- yield_data[-c(1:3), ]

# Select only the columns needed
yield_data <- yield_data[, c(1, 2, 4, 5, 6)]

# Assign new names to the columns
columns_names <- c("Code", "Name", "Grown in country", "Share", "Yield")
colnames(yield_data) <- columns_names
  
# Remove all rows with crops not grown in that country
yield_data <- yield_data[yield_data$'Grown in country' != "No", ]

# Add the calculated biodiversity impacts
yield_data$Biodiversity_impact <- Ext_per_ha_cropland/as.numeric(yield_data$Yield)

# For greenhouses uses the CF for urban areas
yield_data$Biodiversity_impact[yield_data$Code == "01232_gh"] <- Ext_per_ha_urban/as.numeric(yield_data$Yield[yield_data$Code == "01232_gh"])
yield_data$Biodiversity_impact[yield_data$Code == "01234_gh"] <- Ext_per_ha_urban/as.numeric(yield_data$Yield[yield_data$Code == "01234_gh"])

# Calculate the weighted average tomato and cucumber values (average of grown in open fields and greenhouses)
yield_data$Biodiversity_impact[yield_data$Code == "01232"] <- as.numeric(yield_data$Biodiversity_impact[yield_data$Code == "01232_gh"])*as.numeric(yield_data$Share[yield_data$Code == "01232_gh"])/100 + as.numeric(yield_data$Biodiversity_impact[yield_data$Code == "01232_of"])*as.numeric(yield_data$Share[yield_data$Code == "01232_of"])/100
yield_data$Biodiversity_impact[yield_data$Code == "01234"] <- as.numeric(yield_data$Biodiversity_impact[yield_data$Code == "01234_gh"])*as.numeric(yield_data$Share[yield_data$Code == "01234_gh"])/100 + as.numeric(yield_data$Biodiversity_impact[yield_data$Code == "01234_of"])*as.numeric(yield_data$Share[yield_data$Code == "01234_of"])/100

# Extract the feed data
feed_products <- c(
  "0115",
  "0112",
  "0117",
  "0116",
  "0111",
  "01705",
  "01702")

# Select the data
feed_data <- yield_data[yield_data$Code %in% feed_products, ]