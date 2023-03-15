#!/usr/bin/env bash

set -eu

for country in es uk de dk ir se fr; do
  csv_fpath="./data/diets/${country}.csv"
  json_fpath="../src/data/diets/${country}.json" 
  echo "Generating CSV for $country..."
  node "./generate-dummy-diet.js" > $csv_fpath
  echo "Converting $country.csv to json..."
  node "./diet-csv-to-json.mjs" $csv_fpath > $json_fpath
  echo "Done!"
done
