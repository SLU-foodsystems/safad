#!/usr/bin/env bash

set -eu

# RPC parameters
#node ./rpc-parameters/generate-csv-per-country.mjs France Germany Greece Hungary Ireland Italy Poland Spain Sweden

# Extract all category names
node ./foodex-names/extract-category-names.mjs ./foodex-names/foodex-names.csv 2 > ../src/data/category-names.json

