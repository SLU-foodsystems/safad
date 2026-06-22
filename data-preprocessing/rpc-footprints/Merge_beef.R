# install.packages("readxl")
# library(readxl)

merge_beef <- function() {
  suckler_data <- NULL
  dairycow_data <- NULL
  dairy24m_data <- NULL
  dairy9m_data <- NULL
  beef_average <- NULL

  ############################################################################################################
  ####################################### SUCKLER HERD #######################################################
  ############################################################################################################

  # Read the suckler herd data
  suckler_data <- read_excel(
    "../2 - Livestock/Suckler beef.xlsx",
    sheet = "Footprints, results per kg"
  )

  # Assign new names to the columns
  columns_names <- c(
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
  colnames(suckler_data) <- columns_names

  # Remove the first four rows
  suckler_data <- suckler_data[-c(1:4), ]

  # Read all the disaggregated climate impact data
  suckler_data_CF_dis_all <- read_excel(
    "../2 - Livestock/Suckler beef.xlsx",
    sheet = "GHG detailed, results per kg"
  )

  # Assign new names to the columns
  columns_names_CF_dis <- c(
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
  colnames(suckler_data_CF_dis_all) <- columns_names_CF_dis

  # Remove the first rows
  suckler_data_CF_dis_all <- suckler_data_CF_dis_all[-c(1:4), ]

  # Select the different rows with either CO2-equivalents, CO2, CH4 fossil, CH4 biogenic and N2O
  suckler_data_CF_dis <- suckler_data_CF_dis_all[
    suckler_data_CF_dis_all$Gas == "CO2e",
  ]
  suckler_data_CF_dis1 <- suckler_data_CF_dis_all[
    suckler_data_CF_dis_all$Gas == "CO2",
  ]
  suckler_data_CF_dis2 <- suckler_data_CF_dis_all[
    suckler_data_CF_dis_all$Gas == "CH4, fossil",
  ]
  suckler_data_CF_dis3 <- suckler_data_CF_dis_all[
    suckler_data_CF_dis_all$Gas == "CH4, biogenic",
  ]
  suckler_data_CF_dis4 <- suckler_data_CF_dis_all[
    suckler_data_CF_dis_all$Gas == "N2O",
  ]

  # Now rename also the rest of the datasets
  columns_names_CF_dis1 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "CO2_rm_fert_prod",
    "CO2_rm_cap_goods",
    "CO2_rm_soils_dir",
    "CO2_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "CO2_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CO2_rm_ent_ferm",
    "CO2_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(suckler_data_CF_dis1) <- columns_names_CF_dis1
  columns_names_CF_dis2 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "CH4_fossil_rm_fert_prod",
    "CH4_fossil_rm_cap_goods",
    "CH4_fossil_rm_soils_dir",
    "CH4_fossil_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "CH4_fossil_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CH4_fossil_rm_ent_ferm",
    "CH4_fossil_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(suckler_data_CF_dis2) <- columns_names_CF_dis2
  columns_names_CF_dis3 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "CH4_bio_rm_fert_prod",
    "CH4_bio_rm_cap_goods",
    "CH4_bio_rm_soils_dir",
    "CH4_bio_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "CO2e_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CH4_bio_rm_ent_ferm",
    "CH4_bio_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(suckler_data_CF_dis3) <- columns_names_CF_dis3
  columns_names_CF_dis4 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "N2O_rm_fert_prod",
    "N2O_rm_cap_goods",
    "N2O_rm_soils_dir",
    "N2O_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "N2O_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CO2e_rm_ent_ferm",
    "N2O_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(suckler_data_CF_dis4) <- columns_names_CF_dis4

  # Fill NA-values with 0
  suckler_data_CF_dis$Energy_gh[is.na(suckler_data_CF_dis$Energy_gh)] <- 0
  suckler_data_CF_dis1$Energy_gh[is.na(suckler_data_CF_dis1$Energy_gh)] <- 0
  suckler_data_CF_dis2$Energy_gh[is.na(suckler_data_CF_dis2$Energy_gh)] <- 0
  suckler_data_CF_dis3$Energy_gh[is.na(suckler_data_CF_dis3$Energy_gh)] <- 0
  suckler_data_CF_dis4$Energy_gh[is.na(suckler_data_CF_dis4$Energy_gh)] <- 0

  # Merge soil and energy emissions
  suckler_data_CF_dis$CO2e_rm_soils <- as.numeric(
    suckler_data_CF_dis$CO2e_rm_soils_dir
  ) +
    as.numeric(suckler_data_CF_dis$CO2e_rm_soils_indir)
  suckler_data_CF_dis$CO2e_rm_energy <- as.numeric(
    suckler_data_CF_dis$Energy_diesel
  ) +
    as.numeric(suckler_data_CF_dis$Energy_gh) +
    as.numeric(suckler_data_CF_dis$Energy_irr) +
    as.numeric(suckler_data_CF_dis$Energy_ph) +
    as.numeric(suckler_data_CF_dis$Energy_feed_proc) +
    as.numeric(suckler_data_CF_dis$Energy_feed_t) +
    as.numeric(suckler_data_CF_dis$Energy_stables) +
    as.numeric(suckler_data_CF_dis$Energy_slaughter)
  suckler_data_CF_dis1$CO2_rm_energy <- as.numeric(
    suckler_data_CF_dis1$Energy_diesel
  ) +
    as.numeric(suckler_data_CF_dis1$Energy_gh) +
    as.numeric(suckler_data_CF_dis1$Energy_irr) +
    as.numeric(suckler_data_CF_dis1$Energy_ph) +
    as.numeric(suckler_data_CF_dis1$Energy_feed_proc) +
    as.numeric(suckler_data_CF_dis1$Energy_feed_t) +
    as.numeric(suckler_data_CF_dis1$Energy_stables) +
    as.numeric(suckler_data_CF_dis1$Energy_slaughter)
  suckler_data_CF_dis2$CH4_fossil_rm_energy <- as.numeric(
    suckler_data_CF_dis2$Energy_diesel
  ) +
    as.numeric(suckler_data_CF_dis2$Energy_gh) +
    as.numeric(suckler_data_CF_dis2$Energy_irr) +
    as.numeric(suckler_data_CF_dis2$Energy_ph) +
    as.numeric(suckler_data_CF_dis2$Energy_feed_proc) +
    as.numeric(suckler_data_CF_dis2$Energy_feed_t) +
    as.numeric(suckler_data_CF_dis2$Energy_stables) +
    as.numeric(suckler_data_CF_dis2$Energy_slaughter)
  suckler_data_CF_dis4$N2O_rm_soils <- as.numeric(
    suckler_data_CF_dis4$N2O_rm_soils_dir
  ) +
    as.numeric(suckler_data_CF_dis4$N2O_rm_soils_indir)
  suckler_data_CF_dis4$N2O_rm_energy <- as.numeric(
    suckler_data_CF_dis4$Energy_diesel
  ) +
    as.numeric(suckler_data_CF_dis4$Energy_gh) +
    as.numeric(suckler_data_CF_dis4$Energy_irr) +
    as.numeric(suckler_data_CF_dis4$Energy_ph) +
    as.numeric(suckler_data_CF_dis4$Energy_feed_proc) +
    as.numeric(suckler_data_CF_dis4$Energy_feed_t) +
    as.numeric(suckler_data_CF_dis4$Energy_stables) +
    as.numeric(suckler_data_CF_dis4$Energy_slaughter)

  # Select only the columns that are needed.
  suckler_data_CF_dis <- suckler_data_CF_dis[, c(
    "CO2e_rm_fert_prod",
    "CO2e_rm_cap_goods",
    "CO2e_rm_soils",
    "CO2e_rm_energy",
    "CO2e_rm_LUC",
    "CO2e_rm_ent_ferm",
    "CO2e_rm_manure"
  )]
  suckler_data_CF_dis1 <- suckler_data_CF_dis1[, c(
    "CO2_rm_fert_prod",
    "CO2_rm_cap_goods",
    "CO2_rm_energy",
    "CO2_rm_LUC"
  )]
  suckler_data_CF_dis2 <- suckler_data_CF_dis2[, c(
    "CH4_fossil_rm_fert_prod",
    "CH4_fossil_rm_cap_goods",
    "CH4_fossil_rm_energy"
  )]
  suckler_data_CF_dis3 <- suckler_data_CF_dis3[, c(
    "CH4_bio_rm_soils_dir",
    "CH4_bio_rm_ent_ferm",
    "CH4_bio_rm_manure"
  )]
  suckler_data_CF_dis4 <- suckler_data_CF_dis4[, c(
    "N2O_rm_fert_prod",
    "N2O_rm_cap_goods",
    "N2O_rm_soils",
    "N2O_rm_energy",
    "N2O_rm_manure"
  )]

  # Add the disaggregated carbon footprint to the other indicators
  suckler_data <- cbind(
    suckler_data,
    suckler_data_CF_dis,
    suckler_data_CF_dis1,
    suckler_data_CF_dis2,
    suckler_data_CF_dis3,
    suckler_data_CF_dis4
  )

  # Rearrange the columns
  suckler_data <- suckler_data[, c(
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
  )]

  ############################################################################################################
  ####################################### DAIRY CALVES 24 MONTHS #############################################
  ############################################################################################################

  # Read the data for the calves slaughtered at 24 months
  dairy24m_data <- read_excel(
    "../2 - Livestock/Dairy calves 24m.xlsx",
    sheet = "Footprints, results per kg"
  )

  # Assign new names to the columns
  columns_names <- c(
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
  colnames(dairy24m_data) <- columns_names

  # Remove the first four rows
  dairy24m_data <- dairy24m_data[-c(1:4), ]

  # Read all the disaggregated climate impact data
  dairy24m_data_CF_dis_all <- read_excel(
    "../2 - Livestock/Dairy calves 24m.xlsx",
    sheet = "GHG detailed, results per kg"
  )

  # Assign new names to the columns
  columns_names_CF_dis <- c(
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
  colnames(dairy24m_data_CF_dis_all) <- columns_names_CF_dis

  # Remove the first rows
  dairy24m_data_CF_dis_all <- dairy24m_data_CF_dis_all[-c(1:4), ]

  # Select the different rows with either CO2-equivalents, CO2, CH4 fossil, CH4 biogenic and N2O
  dairy24m_data_CF_dis <- dairy24m_data_CF_dis_all[
    dairy24m_data_CF_dis_all$Gas == "CO2e",
  ]
  dairy24m_data_CF_dis1 <- dairy24m_data_CF_dis_all[
    dairy24m_data_CF_dis_all$Gas == "CO2",
  ]
  dairy24m_data_CF_dis2 <- dairy24m_data_CF_dis_all[
    dairy24m_data_CF_dis_all$Gas == "CH4, fossil",
  ]
  dairy24m_data_CF_dis3 <- dairy24m_data_CF_dis_all[
    dairy24m_data_CF_dis_all$Gas == "CH4, biogenic",
  ]
  dairy24m_data_CF_dis4 <- dairy24m_data_CF_dis_all[
    dairy24m_data_CF_dis_all$Gas == "N2O",
  ]

  # Now rename also the rest of the datasets
  columns_names_CF_dis1 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "CO2_rm_fert_prod",
    "CO2_rm_cap_goods",
    "CO2_rm_soils_dir",
    "CO2_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "CO2_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CO2_rm_ent_ferm",
    "CO2_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(dairy24m_data_CF_dis1) <- columns_names_CF_dis1
  columns_names_CF_dis2 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "CH4_fossil_rm_fert_prod",
    "CH4_fossil_rm_cap_goods",
    "CH4_fossil_rm_soils_dir",
    "CH4_fossil_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "CH4_fossil_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CH4_fossil_rm_ent_ferm",
    "CH4_fossil_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(dairy24m_data_CF_dis2) <- columns_names_CF_dis2
  columns_names_CF_dis3 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "CH4_bio_rm_fert_prod",
    "CH4_bio_rm_cap_goods",
    "CH4_bio_rm_soils_dir",
    "CH4_bio_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "CO2e_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CH4_bio_rm_ent_ferm",
    "CH4_bio_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(dairy24m_data_CF_dis3) <- columns_names_CF_dis3
  columns_names_CF_dis4 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "N2O_rm_fert_prod",
    "N2O_rm_cap_goods",
    "N2O_rm_soils_dir",
    "N2O_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "N2O_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CO2e_rm_ent_ferm",
    "N2O_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(dairy24m_data_CF_dis4) <- columns_names_CF_dis4

  # Fill NA-values with 0 (here only energy use in greenhouses)
  dairy24m_data_CF_dis$Energy_gh[is.na(dairy24m_data_CF_dis$Energy_gh)] <- 0
  dairy24m_data_CF_dis1$Energy_gh[is.na(dairy24m_data_CF_dis1$Energy_gh)] <- 0
  dairy24m_data_CF_dis2$Energy_gh[is.na(dairy24m_data_CF_dis2$Energy_gh)] <- 0
  dairy24m_data_CF_dis3$Energy_gh[is.na(dairy24m_data_CF_dis3$Energy_gh)] <- 0
  dairy24m_data_CF_dis4$Energy_gh[is.na(dairy24m_data_CF_dis4$Energy_gh)] <- 0

  # Merge soil and energy emissions
  dairy24m_data_CF_dis$CO2e_rm_soils <- as.numeric(
    dairy24m_data_CF_dis$CO2e_rm_soils_dir
  ) +
    as.numeric(dairy24m_data_CF_dis$CO2e_rm_soils_indir)
  dairy24m_data_CF_dis$CO2e_rm_energy <- as.numeric(
    dairy24m_data_CF_dis$Energy_diesel
  ) +
    as.numeric(dairy24m_data_CF_dis$Energy_gh) +
    as.numeric(dairy24m_data_CF_dis$Energy_irr) +
    as.numeric(dairy24m_data_CF_dis$Energy_ph) +
    as.numeric(dairy24m_data_CF_dis$Energy_feed_proc) +
    as.numeric(dairy24m_data_CF_dis$Energy_feed_t) +
    as.numeric(dairy24m_data_CF_dis$Energy_stables) +
    as.numeric(dairy24m_data_CF_dis$Energy_slaughter)
  dairy24m_data_CF_dis1$CO2_rm_energy <- as.numeric(
    dairy24m_data_CF_dis1$Energy_diesel
  ) +
    as.numeric(dairy24m_data_CF_dis1$Energy_gh) +
    as.numeric(dairy24m_data_CF_dis1$Energy_irr) +
    as.numeric(dairy24m_data_CF_dis1$Energy_ph) +
    as.numeric(dairy24m_data_CF_dis1$Energy_feed_proc) +
    as.numeric(dairy24m_data_CF_dis1$Energy_feed_t) +
    as.numeric(dairy24m_data_CF_dis1$Energy_stables) +
    as.numeric(dairy24m_data_CF_dis1$Energy_slaughter)
  dairy24m_data_CF_dis2$CH4_fossil_rm_energy <- as.numeric(
    dairy24m_data_CF_dis2$Energy_diesel
  ) +
    as.numeric(dairy24m_data_CF_dis2$Energy_gh) +
    as.numeric(dairy24m_data_CF_dis2$Energy_irr) +
    as.numeric(dairy24m_data_CF_dis2$Energy_ph) +
    as.numeric(dairy24m_data_CF_dis2$Energy_feed_proc) +
    as.numeric(dairy24m_data_CF_dis2$Energy_feed_t) +
    as.numeric(dairy24m_data_CF_dis2$Energy_stables) +
    as.numeric(dairy24m_data_CF_dis2$Energy_slaughter)
  dairy24m_data_CF_dis4$N2O_rm_soils <- as.numeric(
    dairy24m_data_CF_dis4$N2O_rm_soils_dir
  ) +
    as.numeric(dairy24m_data_CF_dis4$N2O_rm_soils_indir)
  dairy24m_data_CF_dis4$N2O_rm_energy <- as.numeric(
    dairy24m_data_CF_dis4$Energy_diesel
  ) +
    as.numeric(dairy24m_data_CF_dis4$Energy_gh) +
    as.numeric(dairy24m_data_CF_dis4$Energy_irr) +
    as.numeric(dairy24m_data_CF_dis4$Energy_ph) +
    as.numeric(dairy24m_data_CF_dis4$Energy_feed_proc) +
    as.numeric(dairy24m_data_CF_dis4$Energy_feed_t) +
    as.numeric(dairy24m_data_CF_dis4$Energy_stables) +
    as.numeric(dairy24m_data_CF_dis4$Energy_slaughter)

  # Select only the columns that are needed.
  dairy24m_data_CF_dis <- dairy24m_data_CF_dis[, c(
    "CO2e_rm_fert_prod",
    "CO2e_rm_cap_goods",
    "CO2e_rm_soils",
    "CO2e_rm_energy",
    "CO2e_rm_LUC",
    "CO2e_rm_ent_ferm",
    "CO2e_rm_manure"
  )]
  dairy24m_data_CF_dis1 <- dairy24m_data_CF_dis1[, c(
    "CO2_rm_fert_prod",
    "CO2_rm_cap_goods",
    "CO2_rm_energy",
    "CO2_rm_LUC"
  )]
  dairy24m_data_CF_dis2 <- dairy24m_data_CF_dis2[, c(
    "CH4_fossil_rm_fert_prod",
    "CH4_fossil_rm_cap_goods",
    "CH4_fossil_rm_energy"
  )]
  dairy24m_data_CF_dis3 <- dairy24m_data_CF_dis3[, c(
    "CH4_bio_rm_soils_dir",
    "CH4_bio_rm_ent_ferm",
    "CH4_bio_rm_manure"
  )]
  dairy24m_data_CF_dis4 <- dairy24m_data_CF_dis4[, c(
    "N2O_rm_fert_prod",
    "N2O_rm_cap_goods",
    "N2O_rm_soils",
    "N2O_rm_energy",
    "N2O_rm_manure"
  )]

  # Add the disaggregated carbon footprint to the other indicators
  dairy24m_data <- cbind(
    dairy24m_data,
    dairy24m_data_CF_dis,
    dairy24m_data_CF_dis1,
    dairy24m_data_CF_dis2,
    dairy24m_data_CF_dis3,
    dairy24m_data_CF_dis4
  )

  # Rearrange the columns
  dairy24m_data <- dairy24m_data[, c(
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
  )]

  ############################################################################################################
  ####################################### DAIRY CALVES 9 MONTHS #############################################
  ############################################################################################################

  # Read the data for the calves slaughtered at 24 months
  dairy9m_data <- read_excel(
    "../2 - Livestock/Dairy calves 9m.xlsx",
    sheet = "Footprints, results per kg"
  )

  # Assign new names to the columns
  columns_names <- c(
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
  colnames(dairy9m_data) <- columns_names

  # Remove the first four rows
  dairy9m_data <- dairy9m_data[-c(1:4), ]

  # Read all the disaggregated climate impact data
  dairy9m_data_CF_dis_all <- read_excel(
    "../2 - Livestock/Dairy calves 9m.xlsx",
    sheet = "GHG detailed, results per kg"
  )

  # Assign new names to the columns
  columns_names_CF_dis <- c(
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
  colnames(dairy9m_data_CF_dis_all) <- columns_names_CF_dis

  # Remove the first rows
  dairy9m_data_CF_dis_all <- dairy9m_data_CF_dis_all[-c(1:4), ]

  # Select the different rows with either CO2-equivalents, CO2, CH4 fossil, CH4 biogenic and N2O
  dairy9m_data_CF_dis <- dairy9m_data_CF_dis_all[
    dairy9m_data_CF_dis_all$Gas == "CO2e",
  ]
  dairy9m_data_CF_dis1 <- dairy9m_data_CF_dis_all[
    dairy9m_data_CF_dis_all$Gas == "CO2",
  ]
  dairy9m_data_CF_dis2 <- dairy9m_data_CF_dis_all[
    dairy9m_data_CF_dis_all$Gas == "CH4, fossil",
  ]
  dairy9m_data_CF_dis3 <- dairy9m_data_CF_dis_all[
    dairy9m_data_CF_dis_all$Gas == "CH4, biogenic",
  ]
  dairy9m_data_CF_dis4 <- dairy9m_data_CF_dis_all[
    dairy9m_data_CF_dis_all$Gas == "N2O",
  ]

  # Now rename also the rest of the datasets
  columns_names_CF_dis1 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "CO2_rm_fert_prod",
    "CO2_rm_cap_goods",
    "CO2_rm_soils_dir",
    "CO2_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "CO2_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CO2_rm_ent_ferm",
    "CO2_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(dairy9m_data_CF_dis1) <- columns_names_CF_dis1
  columns_names_CF_dis2 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "CH4_fossil_rm_fert_prod",
    "CH4_fossil_rm_cap_goods",
    "CH4_fossil_rm_soils_dir",
    "CH4_fossil_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "CH4_fossil_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CH4_fossil_rm_ent_ferm",
    "CH4_fossil_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(dairy9m_data_CF_dis2) <- columns_names_CF_dis2
  columns_names_CF_dis3 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "CH4_bio_rm_fert_prod",
    "CH4_bio_rm_cap_goods",
    "CH4_bio_rm_soils_dir",
    "CH4_bio_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "CO2e_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CH4_bio_rm_ent_ferm",
    "CH4_bio_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(dairy9m_data_CF_dis3) <- columns_names_CF_dis3
  columns_names_CF_dis4 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "N2O_rm_fert_prod",
    "N2O_rm_cap_goods",
    "N2O_rm_soils_dir",
    "N2O_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "N2O_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CO2e_rm_ent_ferm",
    "N2O_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(dairy9m_data_CF_dis4) <- columns_names_CF_dis4

  # Fill NA-values with 0 (here only energy use in greenhouses)
  dairy9m_data_CF_dis$Energy_gh[is.na(dairy9m_data_CF_dis$Energy_gh)] <- 0
  dairy9m_data_CF_dis1$Energy_gh[is.na(dairy9m_data_CF_dis1$Energy_gh)] <- 0
  dairy9m_data_CF_dis2$Energy_gh[is.na(dairy9m_data_CF_dis2$Energy_gh)] <- 0
  dairy9m_data_CF_dis3$Energy_gh[is.na(dairy9m_data_CF_dis3$Energy_gh)] <- 0
  dairy9m_data_CF_dis4$Energy_gh[is.na(dairy9m_data_CF_dis4$Energy_gh)] <- 0

  # Merge soil and energy emissions
  dairy9m_data_CF_dis$CO2e_rm_soils <- as.numeric(
    dairy9m_data_CF_dis$CO2e_rm_soils_dir
  ) +
    as.numeric(dairy9m_data_CF_dis$CO2e_rm_soils_indir)
  dairy9m_data_CF_dis$CO2e_rm_energy <- as.numeric(
    dairy9m_data_CF_dis$Energy_diesel
  ) +
    as.numeric(dairy9m_data_CF_dis$Energy_gh) +
    as.numeric(dairy9m_data_CF_dis$Energy_irr) +
    as.numeric(dairy9m_data_CF_dis$Energy_ph) +
    as.numeric(dairy9m_data_CF_dis$Energy_feed_proc) +
    as.numeric(dairy9m_data_CF_dis$Energy_feed_t) +
    as.numeric(dairy9m_data_CF_dis$Energy_stables) +
    as.numeric(dairy9m_data_CF_dis$Energy_slaughter)
  dairy9m_data_CF_dis1$CO2_rm_energy <- as.numeric(
    dairy9m_data_CF_dis1$Energy_diesel
  ) +
    as.numeric(dairy9m_data_CF_dis1$Energy_gh) +
    as.numeric(dairy9m_data_CF_dis1$Energy_irr) +
    as.numeric(dairy9m_data_CF_dis1$Energy_ph) +
    as.numeric(dairy9m_data_CF_dis1$Energy_feed_proc) +
    as.numeric(dairy9m_data_CF_dis1$Energy_feed_t) +
    as.numeric(dairy9m_data_CF_dis1$Energy_stables) +
    as.numeric(dairy9m_data_CF_dis1$Energy_slaughter)
  dairy9m_data_CF_dis2$CH4_fossil_rm_energy <- as.numeric(
    dairy9m_data_CF_dis2$Energy_diesel
  ) +
    as.numeric(dairy9m_data_CF_dis2$Energy_gh) +
    as.numeric(dairy9m_data_CF_dis2$Energy_irr) +
    as.numeric(dairy9m_data_CF_dis2$Energy_ph) +
    as.numeric(dairy9m_data_CF_dis2$Energy_feed_proc) +
    as.numeric(dairy9m_data_CF_dis2$Energy_feed_t) +
    as.numeric(dairy9m_data_CF_dis2$Energy_stables) +
    as.numeric(dairy9m_data_CF_dis2$Energy_slaughter)
  dairy9m_data_CF_dis4$N2O_rm_soils <- as.numeric(
    dairy9m_data_CF_dis4$N2O_rm_soils_dir
  ) +
    as.numeric(dairy9m_data_CF_dis4$N2O_rm_soils_indir)
  dairy9m_data_CF_dis4$N2O_rm_energy <- as.numeric(
    dairy9m_data_CF_dis4$Energy_diesel
  ) +
    as.numeric(dairy9m_data_CF_dis4$Energy_gh) +
    as.numeric(dairy9m_data_CF_dis4$Energy_irr) +
    as.numeric(dairy9m_data_CF_dis4$Energy_ph) +
    as.numeric(dairy9m_data_CF_dis4$Energy_feed_proc) +
    as.numeric(dairy9m_data_CF_dis4$Energy_feed_t) +
    as.numeric(dairy9m_data_CF_dis4$Energy_stables) +
    as.numeric(dairy9m_data_CF_dis4$Energy_slaughter)

  # Select only the columns that are needed.
  dairy9m_data_CF_dis <- dairy9m_data_CF_dis[, c(
    "CO2e_rm_fert_prod",
    "CO2e_rm_cap_goods",
    "CO2e_rm_soils",
    "CO2e_rm_energy",
    "CO2e_rm_LUC",
    "CO2e_rm_ent_ferm",
    "CO2e_rm_manure"
  )]
  dairy9m_data_CF_dis1 <- dairy9m_data_CF_dis1[, c(
    "CO2_rm_fert_prod",
    "CO2_rm_cap_goods",
    "CO2_rm_energy",
    "CO2_rm_LUC"
  )]
  dairy9m_data_CF_dis2 <- dairy9m_data_CF_dis2[, c(
    "CH4_fossil_rm_fert_prod",
    "CH4_fossil_rm_cap_goods",
    "CH4_fossil_rm_energy"
  )]
  dairy9m_data_CF_dis3 <- dairy9m_data_CF_dis3[, c(
    "CH4_bio_rm_soils_dir",
    "CH4_bio_rm_ent_ferm",
    "CH4_bio_rm_manure"
  )]
  dairy9m_data_CF_dis4 <- dairy9m_data_CF_dis4[, c(
    "N2O_rm_fert_prod",
    "N2O_rm_cap_goods",
    "N2O_rm_soils",
    "N2O_rm_energy",
    "N2O_rm_manure"
  )]

  # Add the disaggregated carbon footprint to the other indicators
  dairy9m_data <- cbind(
    dairy9m_data,
    dairy9m_data_CF_dis,
    dairy9m_data_CF_dis1,
    dairy9m_data_CF_dis2,
    dairy9m_data_CF_dis3,
    dairy9m_data_CF_dis4
  )

  # Rearrange the columns
  dairy9m_data <- dairy9m_data[, c(
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
  )]

  ############################################################################################################
  ####################################### DAIRY COW MEAT #####################################################
  ############################################################################################################

  # Read the data for the dairy cow meat
  dairycows_data <- read_excel(
    "../2 - Livestock/Dairy.xlsx",
    sheet = "Footprints, results per kg meat"
  )

  # Assign new names to the columns
  columns_names <- c(
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
  colnames(dairycows_data) <- columns_names

  # Remove the first four rows
  dairycows_data <- dairycows_data[-c(1:4), ]

  # Read all the disaggregated climate impact data
  dairycows_data_CF_dis_all <- read_excel(
    "../2 - Livestock/Dairy.xlsx",
    sheet = "GHG det, results per kg meat"
  )

  # Assign new names to the columns
  columns_names_CF_dis <- c(
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
  colnames(dairycows_data_CF_dis_all) <- columns_names_CF_dis

  # Remove the first rows
  dairycows_data_CF_dis_all <- dairycows_data_CF_dis_all[-c(1:4), ]

  # Select the different rows with either CO2-equivalents, CO2, CH4 fossil, CH4 biogenic and N2O
  dairycows_data_CF_dis <- dairycows_data_CF_dis_all[
    dairycows_data_CF_dis_all$Gas == "CO2e",
  ]
  dairycows_data_CF_dis1 <- dairycows_data_CF_dis_all[
    dairycows_data_CF_dis_all$Gas == "CO2",
  ]
  dairycows_data_CF_dis2 <- dairycows_data_CF_dis_all[
    dairycows_data_CF_dis_all$Gas == "CH4, fossil",
  ]
  dairycows_data_CF_dis3 <- dairycows_data_CF_dis_all[
    dairycows_data_CF_dis_all$Gas == "CH4, biogenic",
  ]
  dairycows_data_CF_dis4 <- dairycows_data_CF_dis_all[
    dairycows_data_CF_dis_all$Gas == "N2O",
  ]

  # Now rename also the rest of the datasets
  columns_names_CF_dis1 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "CO2_rm_fert_prod",
    "CO2_rm_cap_goods",
    "CO2_rm_soils_dir",
    "CO2_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "CO2_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CO2_rm_ent_ferm",
    "CO2_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(dairycows_data_CF_dis1) <- columns_names_CF_dis1
  columns_names_CF_dis2 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "CH4_fossil_rm_fert_prod",
    "CH4_fossil_rm_cap_goods",
    "CH4_fossil_rm_soils_dir",
    "CH4_fossil_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "CH4_fossil_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CH4_fossil_rm_ent_ferm",
    "CH4_fossil_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(dairycows_data_CF_dis2) <- columns_names_CF_dis2
  columns_names_CF_dis3 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "CH4_bio_rm_fert_prod",
    "CH4_bio_rm_cap_goods",
    "CH4_bio_rm_soils_dir",
    "CH4_bio_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "CO2e_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CH4_bio_rm_ent_ferm",
    "CH4_bio_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(dairycows_data_CF_dis3) <- columns_names_CF_dis3
  columns_names_CF_dis4 <- c(
    "Code",
    "Name",
    "Category",
    "Country_name",
    "Country_code",
    "Gas",
    "Sum",
    "N2O_rm_fert_prod",
    "N2O_rm_cap_goods",
    "N2O_rm_soils_dir",
    "N2O_rm_soils_indir",
    "Energy_diesel",
    "Energy_gh",
    "Energy_irr",
    "Energy_ph",
    "N2O_rm_LUC",
    "Energy_feed_proc",
    "Energy_feed_t",
    "CO2e_rm_ent_ferm",
    "N2O_rm_manure",
    "Manure_dir",
    "Manure_indir",
    "Energy_stables",
    "Energy_slaughter"
  )
  colnames(dairycows_data_CF_dis4) <- columns_names_CF_dis4

  # Fill NA-values with 0 (here only energy use in greenhouses)
  dairycows_data_CF_dis$Energy_gh[is.na(dairycows_data_CF_dis$Energy_gh)] <- 0
  dairycows_data_CF_dis1$Energy_gh[is.na(dairycows_data_CF_dis1$Energy_gh)] <- 0
  dairycows_data_CF_dis2$Energy_gh[is.na(dairycows_data_CF_dis2$Energy_gh)] <- 0
  dairycows_data_CF_dis3$Energy_gh[is.na(dairycows_data_CF_dis3$Energy_gh)] <- 0
  dairycows_data_CF_dis4$Energy_gh[is.na(dairycows_data_CF_dis4$Energy_gh)] <- 0

  # Merge soil and energy emissions
  dairycows_data_CF_dis$CO2e_rm_soils <- as.numeric(
    dairycows_data_CF_dis$CO2e_rm_soils_dir
  ) +
    as.numeric(dairycows_data_CF_dis$CO2e_rm_soils_indir)
  dairycows_data_CF_dis$CO2e_rm_energy <- as.numeric(
    dairycows_data_CF_dis$Energy_diesel
  ) +
    as.numeric(dairycows_data_CF_dis$Energy_gh) +
    as.numeric(dairycows_data_CF_dis$Energy_irr) +
    as.numeric(dairycows_data_CF_dis$Energy_ph) +
    as.numeric(dairycows_data_CF_dis$Energy_feed_proc) +
    as.numeric(dairycows_data_CF_dis$Energy_feed_t) +
    as.numeric(dairycows_data_CF_dis$Energy_stables) +
    as.numeric(dairycows_data_CF_dis$Energy_slaughter)
  dairycows_data_CF_dis1$CO2_rm_energy <- as.numeric(
    dairycows_data_CF_dis1$Energy_diesel
  ) +
    as.numeric(dairycows_data_CF_dis1$Energy_gh) +
    as.numeric(dairycows_data_CF_dis1$Energy_irr) +
    as.numeric(dairycows_data_CF_dis1$Energy_ph) +
    as.numeric(dairycows_data_CF_dis1$Energy_feed_proc) +
    as.numeric(dairycows_data_CF_dis1$Energy_feed_t) +
    as.numeric(dairycows_data_CF_dis1$Energy_stables) +
    as.numeric(dairycows_data_CF_dis1$Energy_slaughter)
  dairycows_data_CF_dis2$CH4_fossil_rm_energy <- as.numeric(
    dairycows_data_CF_dis2$Energy_diesel
  ) +
    as.numeric(dairycows_data_CF_dis2$Energy_gh) +
    as.numeric(dairycows_data_CF_dis2$Energy_irr) +
    as.numeric(dairycows_data_CF_dis2$Energy_ph) +
    as.numeric(dairycows_data_CF_dis2$Energy_feed_proc) +
    as.numeric(dairycows_data_CF_dis2$Energy_feed_t) +
    as.numeric(dairycows_data_CF_dis2$Energy_stables) +
    as.numeric(dairycows_data_CF_dis2$Energy_slaughter)
  dairycows_data_CF_dis4$N2O_rm_soils <- as.numeric(
    dairycows_data_CF_dis4$N2O_rm_soils_dir
  ) +
    as.numeric(dairycows_data_CF_dis4$N2O_rm_soils_indir)
  dairycows_data_CF_dis4$N2O_rm_energy <- as.numeric(
    dairycows_data_CF_dis4$Energy_diesel
  ) +
    as.numeric(dairycows_data_CF_dis4$Energy_gh) +
    as.numeric(dairycows_data_CF_dis4$Energy_irr) +
    as.numeric(dairycows_data_CF_dis4$Energy_ph) +
    as.numeric(dairycows_data_CF_dis4$Energy_feed_proc) +
    as.numeric(dairycows_data_CF_dis4$Energy_feed_t) +
    as.numeric(dairycows_data_CF_dis4$Energy_stables) +
    as.numeric(dairycows_data_CF_dis4$Energy_slaughter)

  # Select only the columns that are needed.
  dairycows_data_CF_dis <- dairycows_data_CF_dis[, c(
    "CO2e_rm_fert_prod",
    "CO2e_rm_cap_goods",
    "CO2e_rm_soils",
    "CO2e_rm_energy",
    "CO2e_rm_LUC",
    "CO2e_rm_ent_ferm",
    "CO2e_rm_manure"
  )]
  dairycows_data_CF_dis1 <- dairycows_data_CF_dis1[, c(
    "CO2_rm_fert_prod",
    "CO2_rm_cap_goods",
    "CO2_rm_energy",
    "CO2_rm_LUC"
  )]
  dairycows_data_CF_dis2 <- dairycows_data_CF_dis2[, c(
    "CH4_fossil_rm_fert_prod",
    "CH4_fossil_rm_cap_goods",
    "CH4_fossil_rm_energy"
  )]
  dairycows_data_CF_dis3 <- dairycows_data_CF_dis3[, c(
    "CH4_bio_rm_soils_dir",
    "CH4_bio_rm_ent_ferm",
    "CH4_bio_rm_manure"
  )]
  dairycows_data_CF_dis4 <- dairycows_data_CF_dis4[, c(
    "N2O_rm_fert_prod",
    "N2O_rm_cap_goods",
    "N2O_rm_soils",
    "N2O_rm_energy",
    "N2O_rm_manure"
  )]

  # Add the disaggregated carbon footprint to the other indicators
  dairycows_data <- cbind(
    dairycows_data,
    dairycows_data_CF_dis,
    dairycows_data_CF_dis1,
    dairycows_data_CF_dis2,
    dairycows_data_CF_dis3,
    dairycows_data_CF_dis4
  )

  # Rearrange the columns
  dairycows_data <- dairycows_data[, c(
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
  )]

  ############################################################################################################
  ####################################### READ THE SHARES ####################################################
  ############################################################################################################

  # Read the shares
  shares <- read_excel("../2 - Livestock/Beef shares.xlsx", sheet = "Summary")

  ############################################################################################################
  ####################################### CALCULATE WEIGHTED AVERAGE #########################################
  ############################################################################################################

  for (i in 1:12) {
    # Read the shares for this country
    share_dairy_cow <- as.numeric(shares[i, "Shares_dairy_cows"])
    share_suckler <- as.numeric(shares[i, "Shares_suckler"])
    share_dairy24m <- as.numeric(shares[i, "Shares_dairy24m"])
    share_dairy9m <- as.numeric(shares[i, "Shares_dairy9m"])

    # Read the data for this country for the different production systems and multiply with the share
    data_dairy_cow <- dairycows_data[i, 6:43]
    data_dairy_cow <- as.data.frame(lapply(data_dairy_cow, as.numeric))
    data_dairy_cow <- data_dairy_cow * share_dairy_cow

    data_suckler <- suckler_data[i, 6:43]
    data_suckler <- as.data.frame(lapply(data_suckler, as.numeric))
    data_suckler <- data_suckler * share_suckler

    data_dairy24m <- dairy24m_data[i, 6:43]
    data_dairy24m <- as.data.frame(lapply(data_dairy24m, as.numeric))
    data_dairy24m <- data_dairy24m * share_dairy24m

    data_dairy9m <- dairy9m_data[i, 6:43]
    data_dairy9m <- as.data.frame(lapply(data_dairy9m, as.numeric))
    data_dairy9m <- data_dairy9m * share_dairy9m

    # Add the values from the different systems to compose the average for this country
    beef_average_country <- data_dairy_cow +
      data_suckler +
      data_dairy24m +
      data_dairy9m

    # Add this country to the full beef dataset
    beef_average <- rbind(beef_average, beef_average_country)
  }

  # Add the first columns with the labels back
  label_columns <- dairycows_data[, 1:5]
  beef_average <- cbind(label_columns, beef_average)
  beef_average$Code <- "21111.02"
  beef_average$Name <- "Bovine muscle"
  beef_average$Category <- "Red meat"

  return(beef_average)
}
