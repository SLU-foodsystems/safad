# Data inventory

## FAO-stat Land use data

### Forest land-use

- Filename: `faostat-agricultural-land-use.csv`
- Description: Land use of type "Forest land" per country (2021). Used to
  calculate the share of deforested land with the UNFCCC data.
- Source: Fetched from faostat.org

### Agricultural land-use

- Filename: `faostat-agricultural-land-use.csv`
- Description: Land use of type "Agricultural land" per country, 2004-2023. 
- Source: Fetched from faostat.org
- URL (api-key required): https://faostatservices.fao.org/api/v1/en/data/RL?area=2%2C3%2C4%2C5%2C6%2C7%2C258%2C8%2C9%2C1%2C22%2C187%2C10%2C11%2C52%2C12%2C13%2C16%2C14%2C57%2C255%2C15%2C23%2C53%2C17%2C18%2C19%2C278%2C80%2C20%2C21%2C239%2C26%2C27%2C233%2C29%2C35%2C115%2C32%2C33%2C36%2C37%2C39%2C259%2C40%2C351%2C96%2C128%2C214%2C41%2C44%2C45%2C46%2C47%2C48%2C98%2C49%2C279%2C50%2C167%2C51%2C107%2C116%2C250%2C54%2C72%2C55%2C56%2C58%2C59%2C60%2C61%2C178%2C63%2C209%2C238%2C62%2C65%2C64%2C66%2C67%2C68%2C69%2C70%2C74%2C75%2C73%2C79%2C81%2C82%2C84%2C85%2C86%2C87%2C88%2C89%2C90%2C175%2C91%2C93%2C94%2C95%2C97%2C99%2C100%2C101%2C102%2C103%2C104%2C264%2C105%2C106%2C109%2C110%2C112%2C108%2C114%2C83%2C118%2C113%2C120%2C119%2C121%2C122%2C123%2C124%2C125%2C126%2C256%2C129%2C130%2C131%2C132%2C133%2C134%2C127%2C135%2C136%2C137%2C270%2C138%2C145%2C140%2C141%2C273%2C142%2C143%2C144%2C28%2C147%2C148%2C149%2C150%2C151%2C153%2C156%2C157%2C158%2C159%2C160%2C161%2C154%2C163%2C162%2C221%2C164%2C165%2C180%2C299%2C166%2C168%2C169%2C170%2C171%2C172%2C173%2C174%2C177%2C179%2C117%2C146%2C183%2C185%2C184%2C182%2C282%2C188%2C189%2C281%2C190%2C191%2C244%2C192%2C193%2C194%2C195%2C272%2C186%2C196%2C197%2C200%2C280%2C199%2C198%2C25%2C201%2C202%2C277%2C203%2C38%2C276%2C206%2C207%2C210%2C211%2C212%2C208%2C216%2C176%2C217%2C218%2C219%2C220%2C222%2C213%2C224%2C227%2C223%2C228%2C226%2C230%2C225%2C229%2C215%2C240%2C231%2C234%2C235%2C155%2C236%2C237%2C243%2C205%2C249%2C248%2C251%2C181&area_cs=ISO2&element=5110&item=6610&year=2004%2C2005%2C2006%2C2007%2C2008%2C2009%2C2010%2C2011%2C2012%2C2013%2C2014%2C2015%2C2016%2C2017%2C2018%2C2019%2C2020%2C2021%2C2022%2C2023&show_codes=true&show_unit=true&show_flags=true&show_notes=true&null_values=false&output_type=objects&caching=false

## UNFCCC Inventory on Agricultural Deforestation: Annual Area in kha

- Filename: `unfccc-deforestation-data.csv` 
- Description: Conversion of forest into cropland and grassland (kha / year)
  in 2021 per country. Used as a nuancing source for when the OWID data is
  uncertain (0.02-0.05%).
- Source: Fetched from https://di.unfccc.int/flex_annex1 on November 2, 2026.

> Query results for — Party: Austria and 23 other(s) | Year: Last Inventory Year (2021) | Category: 4.B.2.a  Forest Land Converted to Cropland and 1 other(s) | Classification: 4 (III) Direct N2O Emissions from N Mineralization/ Immobilization | Type of value: Area | Gas: No gas | Unit: kha

Source: UNFCCC GHG Data Interface

**Notes from file:**
> Note 1: The reporting and review requirements for GHG inventories are different for Annex I and non-Annex I Parties. The definition format of data for emissions/removals from the forestry sector is different for Annex I and non-Annex I Parties.
> Note 2: Base year data in the data interface relate to the base year under the Climate Change Convention (UNFCCC).  The base year under the Convention is defined slightly different than the base year under the Kyoto Protocol.
> "Note 3: – means ""No data available"""
> "Note 4: Data displayed on the data interface are ""as received"" from Parties. The publication of Party submissions on this website does not imply the expression of any opinion whatsoever on the part of the UNFCCC or the Secretariat of the United Nations concerning the legal status of any country, territory, city or area or of its authorities, or concerning the delimitation of its frontiers or boundaries as may be referred to in any of the submissions."
> Note 5: Data expressed in CO2 equivalent are in accordance with the global warming potential values (GWPs) used by Parties in their submission. Please refer to the “Notes on GHG data” available on the UNFCCC website for additional information.
> "Note 6: Data displayed for Australia reflects their GHG Inventory submission on 16 September 2022. The latest data submitted by Australia in 2023, including the CRT and NIR submission made under the Paris Agreement, are available on the UNFCCC website."
