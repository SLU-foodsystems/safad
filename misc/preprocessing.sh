#!/usr/bin/env bash

set -eu

node ./carrier-footprints/carrier-footprints-csv-to-json.mjs ./carrier-footprints/carrier-footprints.csv \
  > ../src/data/carrier-footprints.json

node ./processes-energy-demand/processes-energy-demand-csv-json.mjs ./processes-energy-demand/processes-energy-demand.csv > ../src/data/processes-energy-demands.json

node ./env-factors/flat-env-factors-csv-to-json.mjs ./env-factors/env-factors.csv > ../src/data/env-factors-flat.json

#rpc-parameters

node ./foodex-names/extract-category-names.mjs ./foodex-names/foodex-names.csv > ../src/data/category-names.json

node ./rpc-sua-map/rpc-sua-csv-to-json.mjs ./rpc-sua-map/rpc-to-sua.csv > ../src/data/rpc-to-sua.json

node ./foodex-recipes/recipes-csv-parser.mjs ./foodex-recipes/foodex-recipes.csv ./foodex-recipes/foods-and-processes.csv > ../src/data/foodex-recipes.json
