#!/usr/bin/env bash

set -eu

for country in es uk de dk ir se fr; do
  diet_csv_fpath="./data/diets/${country}.csv"
  diet_json_fpath="../src/data/diets/${country}.json" 
  env_csv_fpath="./data/env/${country}.csv"

  echo "Generating Base Diet CSV for $country..."
  node "./generate-dummy-diet.js" > $diet_csv_fpath
  echo "Generating Env Impact CSV for $country..."
  node "./generate-dummy-env-factors.mjs" "$diet_csv_fpath" > $env_csv_fpath
  echo "NOT generating Nutr impact CSV for $country..."
  # node "./generate-dummy-nutr-factors.mjs" > $env_csv_fpath

  echo "Converting diets/$country.csv to json..."
  node "./diet-csv-to-json.mjs" $diet_csv_fpath > $diet_json_fpath

  echo "Converting env/$country.csv to json..."
  node "./env-csv-to-json.mjs" $diet_csv_fpath > $diet_json_fpath
  echo "Done!"
done
