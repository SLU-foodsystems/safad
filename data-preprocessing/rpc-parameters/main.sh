#!/usr/bin/env bash

for c in DE ES FR GR HU IE IT PL SE; do
  old_file="../../SAFAD IP Origin and Waste of RPC/SAFAD IP Origin and Waste of RPC $c.csv"
  new_file="./new-origin-files/SAFAD IP Origin and Waste of RPC $c.csv"
  diff_file="./filtered-origin-files/SAFAD IP Origin and Waste of RPC $c.csv"
  merged_file="./merged-origin-files/SAFAD IP Origin and Waste of RPC $c.csv"

  # Ensure old_file exists
  [[ -f "$old_file" ]] || (echo "No file found at old_file=$old_file" && exit 1)

  # Generate a new file from Kastner data
  node main.mjs $c > "$new_file"
  # List entries in old file with invalid sums
  node ./list-items-with-invalid-sums.mjs "$old_file" "$new_file" > "$diff_file"
  # replace the rows in the old files with those in the new
  node merge-in-changes.mjs "$old_file" "$diff_file" > "$merged_file"
done
