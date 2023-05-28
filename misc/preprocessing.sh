#!/usr/bin/env bash

# FoodEx recipes
source ./recipes-csv-parser.mjs \
  "./data/foodex-recipes.csv" \
  "./data/foods-and-processes.csv" \
  > "../src/data/foodex-recipes.json"
