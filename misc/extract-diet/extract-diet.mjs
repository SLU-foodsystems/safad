#!/usr/bin/env node
/**
 * Script for extracting diets from a large CREA database csv.
 *
 * Takes three parameters:
 * - path to CREA file
 * - path to CREA-EFSA code conversion file
 * - path to EFSA- waste factors conversion file
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
    surveyName: "The French national dietary survey (INCA3, 2014-2015)",
    ageClass: "Adolescents",
  },
  {
    country: "Germany",
    surveyName: "Eating Study as a KiGGS Module (EsKiMo)",
    ageClass: "Adolescents",
  },
  {
    country: "Greece",
    surveyName:
      "The EFSA-funded collection of dietary and related data in the general population aged 10-74 years in Greece",
    ageClass: "Elderly",
  },
  {
    country: "Hungary",
    surveyName: "Hungarian national food consumption survey",
    ageClass: "Adults",
  },
  {
    country: "Ireland",
    surveyName: "National Adult Nutrition Survey",
    ageClass: "Adults",
  },
  {
    country: "Italy",
    surveyName:
      "Italian national dietary survey on adult population from 10 up to " +
      "74 years old",
    ageClass: "Adults",
  },
  {
    country: "Spain",
    surveyName:
      "Spanish National dietary survey in adults, elderly and pregnant women",
    ageClass: "Adults",
  },
  {
    country: "Sweden",
    surveyName: "Swedish National Dietary Survey - Riksmaten adults 2010-11",
    ageClass: "Adults",
  },
];

function wasteGetter(wasteData) {
  const wasteFactors = {};
  wasteData.forEach(
    ([
      foodCode,
      _foodName,
      countryName,
      _countryCode,
      retailWaste,
      consumerWaste,
    ]) => {
      if (!wasteFactors[countryName]) wasteFactors[countryName] = {};
      const wastes = [retailWaste, consumerWaste].map((x) => {
        const parsed = parseFloat(x);
        const number = Number.isNaN(parsed) ? 0 : parsed;
        return Math.max(0, number); // Ensure non-negative wastes
      });
      const safeCode = foodCode.replace("I", "A");
      wasteFactors[countryName][safeCode] = wastes;
    }
  );

  return (country, code) => {
    const l2Code = code.split(".").slice(0, 3).join(".").replace("I", "A");
    return wasteFactors[country][l2Code];
  };
}

function main(args) {
  const [dietCsvPath, creaToEfsaCsvPath, wasteFactorsCsvPath] = args;

  const df = readCsv(dietCsvPath, ",").slice(1);

  const creaToEfsaCodes = Object.fromEntries(
    readCsv(creaToEfsaCsvPath, ",")
      .slice(1)
      .map((row) => [row[3], row[5]])
  );

  const getWaste = wasteGetter(readCsv(wasteFactorsCsvPath, ",").slice(1));

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
        (row) =>
          row[1] === country &&
          row[3] === surveyName &&
          (!ageClass || row[5] === ageClass)
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

    // Add wastes
    Object.keys(amounts).forEach((efsaCode) => {
      amounts[efsaCode] = [amounts[efsaCode], ...getWaste(country, efsaCode)];
    });

    if (OUTPUT_AS_CSV) {
      const namesMap = Object.fromEntries(
        filtered.map((row) => {
          return [creaToEfsaCodes[row[8]], row[7]];
        })
      );

      const csvHeader = "Code,Name,Amount,Retail Waste,Consumer Waste";
      const csvBody = Object.entries(amounts)
        .map(([code, [amount, retailWaste, consumerWaste]]) =>
          [
            code,
            `"${namesMap[code]}"`,
            amount,
            retailWaste,
            consumerWaste,
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
