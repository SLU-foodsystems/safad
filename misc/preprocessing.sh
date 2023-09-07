#!/usr/bin/env bash

set -eu

# Carrier GHG factors: GHG per energy type for each country
node ./carrier-ghg-factors/carrier-ghg-factors-csv-to-json.mjs ./carrier-ghg-factors/carrier-ghg-factors.csv \
  > ../src/data/carrier-ghg-factors.json

# Transport emissions factors: emissions for each consumption/production pair
node ./transport-emissions-factors/transports-emissions-factors-csv-to-json.mjs \
  ./transport-emissions-factors/transports-emissions-factors.csv \
  > ../src/data/transport-emissions-factors.json

# Processes energy demands: Energy req. of each process
node ./processes-energy-demand/processes-energy-demand-csv-json.mjs ./processes-energy-demand/processes-energy-demand.csv > ../src/data/processes-energy-demands.json


# Flat environmental factors - without import factors, mostly for verification
node ./env-factors/flat-env-factors-csv-to-json.mjs ./env-factors/env-factors.csv > ../src/data/env-factors-flat.json

# Environmental factors with import factors
node ./env-factors/env-factors-csv-to-json.mjs ./env-factors/env-factors.csv > ../src/data/env-factors.json

# RPC parameters: done in two steps to allow for, in the future, to manually
# adjust the values if we want to.
# Step a: Generate csv files
node ./rpc-parameters/generate-csv-per-country.mjs France Germany Greece Hungary Ireland Italy Poland Spain Sweden

# Step b: Convert csv to json
for country in France Germany Greece Hungary Ireland Italy Poland Spain Sweden; do
  node ./rpc-parameters/rpc-parameters-csv-to-json.mjs "./rpc-parameters/csv-out/$country-rpc.csv" > "../src/data/rpc-parameters/$country-rpc.json"
done

# Extract all category names
node ./foodex-names/extract-category-names.mjs ./foodex-names/foodex-names.csv 2 > ../src/data/category-names.json

# Create a json for mapping rpc codes to sua names
node ./rpc-sua-map/rpc-sua-csv-to-json.mjs ./rpc-sua-map/rpc-to-sua.csv > ../src/data/rpc-to-sua.json

# Create a json representation of the csvs
node ./foodex-recipes/recipes-csv-parser.mjs ./foodex-recipes/foodex-recipes.csv ./foodex-recipes/foods-and-processes.csv > ../src/data/foodex-recipes.json

# Processes and Packaging file: Additional processes and packaing data
node ./processes-and-packaging/processes-and-packaging.mjs ./processes-and-packaging/processes-and-packaging.csv > ../src/data/processes-and-packaging.json
