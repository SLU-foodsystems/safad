import { readCsv, roundToPrecision } from "../utils.mjs";

const OUTPUT_AS_CSV = true;

function main(args) {
  const [dietCsvPath, creaToEfsaCsvPath] = args;

  const df = readCsv(dietCsvPath, ",").slice(1);

  const creaToEfsaCodes = Object.fromEntries(
    readCsv(creaToEfsaCsvPath, ",")
      .slice(1)
      .map((row) => [row[3], row[5]])
  );

  const isRelevantDiet = ([
    _id,
    country,
    surveyYear,
    surveyName,
    _surveyCode,
    ageClass,
    exposureLevel,
    _groupLevel,
    _groupCode,
    gender,
    _sample,
    _consumer,
    _surveyMean,
  ]) =>
    country === "Sweden" &&
    surveyYear === "2010" &&
    exposureLevel === "L5" &&
    surveyName ===
      "Swedish National Dietary Survey - Riksmaten adults 2010-11" &&
    gender === "Total" &&
    ageClass === "Adults";

  const filtered = df.filter(isRelevantDiet);
  const amounts = filtered
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
        groupCode,
        _gender,
        _sample,
        _consumer,
        surveyMean,
      ] = row;

      const efsaCode = creaToEfsaCodes[groupCode];

      if (!efsaCode) {
        console.error("Could not find code", groupCode);
        return null;
      }

      return [efsaCode, parseFloat(surveyMean)];
    })
    .filter((x) => x !== null)
    .reduce((results, [code, amount]) => {
      if (!(code in results)) {
        results[code] = 0;
      }
      results[code] += amount;
      return results;
    }, {});

  Object.keys(amounts).forEach((key) => {
    amounts[key] = roundToPrecision(amounts[key], 4);
  });

  if (OUTPUT_AS_CSV) {
    const namesMap = Object.fromEntries(
      filtered.map((row) => {
        return [creaToEfsaCodes[row[8]], row[7]];
      })
    );

    const csv = Object.entries(amounts).map(([code, amount]) => [code, `"${namesMap[code]}"`, amount].join(",")).join("\n")
    console.log("Code,Name,Amount\n" + csv);
  } else {
    console.log(JSON.stringify(amounts));
  }
}

main(process.argv.slice(2));
