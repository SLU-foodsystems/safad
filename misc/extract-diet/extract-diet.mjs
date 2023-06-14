import * as fs from "fs";
import * as path from "path";
import url from "url";

import { readCsv, roundToPrecision } from "../utils.mjs";

const DIRNAME = path.dirname(url.fileURLToPath(import.meta.url));
const OUTPUT_AS_CSV = false;

const DIETS = {
  France: "The French national dietary survey (INCA3, 2014-2015)",
  Germany: "Eating Study as a KiGGS Module (EsKiMo)",
  Greece:
    "The EFSA-funded collection of dietary and related data in the general population aged 10-74 years in Greece",
  Hungary: "Hungarian national food consumption survey",
  Ireland: "National Adult Nutrition Survey",
  Italy:
    "Italian national dietary survey on adult population from 10 up to 74 years old",
  Spain:
    "Spanish National dietary survey in adults, elderly and pregnant women",
  Sweden: "Swedish National Dietary Survey - Riksmaten adults 2010-11",
};

function main(args) {
  const [dietCsvPath, creaToEfsaCsvPath] = args;

  const df = readCsv(dietCsvPath, ",").slice(1);

  const creaToEfsaCodes = Object.fromEntries(
    readCsv(creaToEfsaCsvPath, ",")
      .slice(1)
      .map((row) => [row[3], row[5]])
  );

  const groupCodes = new Set();

  const generalDietFilter = ([
    _id,
    _country,
    _surveyYear,
    _surveyName,
    _surveyCode,
    _ageClass,
    exposureLevel,
    _groupLevel,
    groupCode,
    gender,
    _sample,
    _consumer,
    _surveyMean,
  ]) =>
    exposureLevel === "L5" && gender === "Total" && !groupCode.startsWith("4.");

  const filtered = df.filter(generalDietFilter);

  Object.entries(DIETS).forEach(([country, surveyName]) => {
    const amounts = filtered
      .filter((row) => row[1] === country && row[3] === surveyName)
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
        groupCodes.add(creaCode);

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
    Object.keys(amounts).forEach((key) => {
      amounts[key] = roundToPrecision(amounts[key], 4);
    });

    if (OUTPUT_AS_CSV) {
      const namesMap = Object.fromEntries(
        filtered.map((row) => {
          return [creaToEfsaCodes[row[8]], row[7]];
        })
      );

      const csvHeader = "Code,Name,Amount";
      const csvBody = Object.entries(amounts)
        .map(([code, amount]) =>
          [code, `"${namesMap[code]}"`, amount].join(",")
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
