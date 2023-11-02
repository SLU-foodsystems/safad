#!/usr/bin/env node
/**
 * Script for extracting diets from a large CREA database csv.
 *
 * Takes two parameters:
 * - path to CREA file, with foods and their amounts
 * - path to CREA-EFSA code conversion file
 */

import * as fs from "fs";
import * as path from "path";
import url from "url";

import { readCsv, roundToPrecision } from "../utils.mjs";

const DIRNAME = path.dirname(url.fileURLToPath(import.meta.url));
const OUTPUT_AS_CSV = false;

const DIETS = [
  {
    country: "France",
    countryCode: "FR",
    surveyName: "The French national dietary survey (INCA3, 2014-2015)",
    ageClass: "Adolescents",
  },
  {
    country: "Germany",
    countryCode: "DE",
    surveyName: "Eating Study as a KiGGS Module (EsKiMo)",
    ageClass: "Adolescents",
  },
  {
    country: "Greece",
    countryCode: "GR",
    surveyName:
      "The EFSA-funded collection of dietary and related data in the general population aged 10-74 years in Greece",
    ageClass: "Elderly",
  },
  {
    country: "Hungary",
    countryCode: "HU",
    surveyName: "Hungarian national food consumption survey",
    ageClass: "Adults",
  },
  {
    country: "Ireland",
    countryCode: "IE",
    surveyName: "National Adult Nutrition Survey",
    ageClass: "Adults",
  },
  {
    country: "Italy",
    countryCode: "IT",
    surveyName:
      "Italian national dietary survey on adult population from 10 up to " +
      "74 years old",
    ageClass: "Adults",
  },
  {
    country: "Spain",
    countryCode: "ES",
    surveyName:
      "Spanish National dietary survey in adults, elderly and pregnant women",
    ageClass: "Adults",
  },
  {
    country: "SwedenBaseline",
    countyCode: "SE-B",
    surveyName: "Swedish National Dietary Survey - Riksmaten adults 2010-11",
    ageClass: "Adults",
  },
  {
    country: "Sweden",
    countyCode: "SE",
    surveyName: "National Food Administration",
    ageClass: "Other children",
  },
];

function main(args) {
  const [dietCsvPath, creaToEfsaCsvPath] = args;

  const df = readCsv(dietCsvPath, ",").slice(1);

  const creaToEfsaCodes = Object.fromEntries(
    readCsv(creaToEfsaCsvPath, ",")
      .slice(1)
      .map((row) => [row[3], row[5]])
  );

  const generalDietFilter = ([
    _id,
    _country,
    _surveyYear,
    _surveyName,
    _surveyCode,
    _ageClass,
    exposureLevel,
    _groupLevel,
    _groupCode,
    gender,
    _sample,
    _consumer,
    _surveyMean,
  ]) => exposureLevel === "L5" && gender === "Total";

  const filtered = df.filter(generalDietFilter);

  DIETS.forEach(({ country, surveyName, ageClass }) => {
    const amounts = filtered
      .filter(
        (row) => row[3] === surveyName && (!ageClass || row[5] === ageClass)
      )
      .map((row) => {
        const [
          _id,
          _country,
          _surveyYear,
          _surveyName,
          _surveyCode,
          _ageClass,
          _exposureLevel,
          _groupLevel,
          creaCode,
          _gender,
          _sample,
          _consumer,
          surveyMean,
        ] = row;

        const efsaCode = creaToEfsaCodes[creaCode];
        if (!efsaCode) {
          console.error("Could not find code", creaCode);
          return null;
        }

        return [efsaCode, parseFloat(surveyMean)];
      })
      .filter((x) => x !== null)
      // Sum to an object, because different CREA codes may point to the same
      // EFSA code.
      .reduce((results, [code, amount]) => {
        if (!(code in results)) {
          results[code] = 0;
        }
        results[code] += amount;
        return results;
      }, {});

    // Round all values to a limited set of decimal points
    Object.keys(amounts).forEach((efsaCode) => {
      amounts[efsaCode] = roundToPrecision(amounts[efsaCode], 4);
    });

    if (OUTPUT_AS_CSV) {
      const namesMap = Object.fromEntries(
        filtered.map((row) => {
          return [creaToEfsaCodes[row[8]], row[7]];
        })
      );

      const csvHeader = "Code,Name,Amount";
      const csvBody = Object.entries(amounts)
        .map(([code, [amount]]) =>
          [
            code,
            `"${namesMap[code]}"`,
            amount,
          ].join(",")
        )
        .join("\n");
      const csv = csvHeader + "\n" + csvBody;
      fs.writeFileSync(
        path.resolve(DIRNAME, `./csv-out/${country}-crea-diet.csv`),
        csv
      );
    } else {
      fs.writeFileSync(
        path.resolve(DIRNAME, `../../src/data/diets/${country}.json`),
        JSON.stringify(amounts)
      );
    }
  });
}

main(process.argv.slice(2));
