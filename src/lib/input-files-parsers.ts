import { parseCsvFile, roundToPrecision, vectorsSum } from "@/lib/utils";

import processTranslationsCsv from "@/data/sfa-to-efsa-processes.csv?raw";
import { ENV_IMPACTS_ZERO } from "./constants";

const SfaEfsaProcessTranslations: Record<string, string> = Object.fromEntries(
  parseCsvFile(processTranslationsCsv)
    .slice(1)
    .map(([sfaName, efsaCode]) => [sfaName, efsaCode])
);

const asNumber = (str: string, elseValue = 0): number => {
  const maybeNumber = Number.parseFloat((str || "").trim());
  return Number.isNaN(maybeNumber) ? elseValue : maybeNumber;
};

interface ValidateCsvOptions {
  minRows: number;
  maxRows: number;
  minCols: number;
  maxCols: number;
  checkNotEmpty: boolean;
  checkSingleCol: boolean;
}

export enum CsvValidationErrorType {
  MinRows = "MIN_ROWS",
  MaxRows = "MAX_ROWS",
  MinCols = "MIN_COLS",
  MaxCols = "MIN_ROWS",
  SingleCol = "SINGLE_COL",
  Empty = "EMPTY",
  Unknown = "UNKNOWN",
  Other = "OTHER",
}

export class CsvValidationError extends Error {
  public readonly type: CsvValidationErrorType;
  public readonly message: string = "";

  constructor(type: CsvValidationErrorType, message?: string) {
    super("Csv Validation Error: " + type);
    this.type = type;
    this.message = message || String(type);
  }
}

function validateCsv(
  csvData: string[][],
  optionOverrides: Partial<ValidateCsvOptions>
): CsvValidationErrorType | null {
  const options: ValidateCsvOptions = {
    minRows: -1,
    minCols: -1,
    maxRows: Number.POSITIVE_INFINITY,
    maxCols: Number.POSITIVE_INFINITY,
    checkNotEmpty: true,
    checkSingleCol: true,
    ...optionOverrides,
  };

  if (
    (options.checkNotEmpty && csvData.length <= 1) ||
    csvData.every((row) => row.length === 0)
  ) {
    return CsvValidationErrorType.Empty;
  }

  const nRows = csvData.length;
  const nCols = Math.max(0, ...csvData.map((row) => row.length));

  if (nRows < options.minRows) return CsvValidationErrorType.MinRows;
  if (nRows > options.maxRows) return CsvValidationErrorType.MaxRows;

  if (options.checkSingleCol && nCols <= 1) {
    return CsvValidationErrorType.SingleCol;
  }

  if (nCols < options.minCols) return CsvValidationErrorType.MinCols;
  if (nCols > options.maxCols) return CsvValidationErrorType.MaxCols;

  return null;
}

export function parseEmissionsFactorsPackaging(csvString: string) {
  const csv = parseCsvFile(csvString)
    .slice(1) // Drop header
    // Remove empty rows
    .filter((row) => row.some((cell) => cell.length > 0));

  // maxCols = 12 for some flexibility for comments etc
  const err = validateCsv(csv, { minCols: 6, maxCols: 10 });
  if (err) {
    throw new CsvValidationError(err);
  }

  return Object.fromEntries(
    csv.map(([packagingCode, _packagingName, ...efs]) => [
      packagingCode,
      efs.map((x) => asNumber(x)),
    ])
  );
}

export function parseEmissionsFactorsEnergy(csvString: string) {
  const csv = parseCsvFile(csvString).slice(1); // Drop Header

  const emissionsFactors: Record<string, number[] | Record<string, number[]>> =
    { Electricity: {} };

  // maxCols = 10 for some flexibility for comments etc
  const err = validateCsv(csv, { minCols: 6, maxCols: 10 });
  if (err) {
    throw new CsvValidationError(err);
  }

  csv.forEach(([carrier, _country, countryCode, ...ghgsStrs]) => {
    const ghgs = ghgsStrs.map((x) => asNumber(x, 0));
    if (carrier === "Electricity") {
      (emissionsFactors[carrier] as Record<string, number[]>)[countryCode] =
        ghgs;
    } else {
      emissionsFactors[carrier] = ghgs;
    }
  });

  return emissionsFactors;
}

export function parseEmissionsFactorsTransport(csvString: string) {
  const csv = parseCsvFile(csvString).slice(1); // Drop Header

  // maxCols = 12 for some flexibility for comments etc
  const err = validateCsv(csv, { minCols: 7, maxCols: 12 });
  if (err) {
    throw new CsvValidationError(err);
  }

  const results: NestedRecord<string, number[]> = {};

  csv.forEach(
    ([
      consumptionCountryCode,
      _consumptionCountry,
      productionCountryCode,
      _productionCountry,
      ...ghgsStrs
    ]) => {
      // Skip empty rows
      if (!consumptionCountryCode) return;
      // Convert all GHG factors to numbers, falling back to 0 if missing
      const ghgs = ghgsStrs.map((x) => asNumber(x, 0));

      if (!(consumptionCountryCode in results)) {
        results[consumptionCountryCode] = {};
      }

      results[consumptionCountryCode][productionCountryCode] = ghgs;
    }
  );

  const countriesMissingRestOfWorld = Object.keys(results).filter(
    (consumptionCountryCode) => !("RoW" in results[consumptionCountryCode])
  );

  if (countriesMissingRestOfWorld.length > 0) {
    const missingStr = countriesMissingRestOfWorld.join(", ");
    throw new CsvValidationError(
      CsvValidationErrorType.Other,
      "All countries must have transport emissions factors for RoW. " +
        "Following countries lack RoW entry: " +
        missingStr
    );
  }

  // TODO: Could add a check here to ensure each country has an RoW value

  return results;
}

export function parseProcessesEnergyDemands(
  csvString: string
): Record<string, number[]> {
  const csv = parseCsvFile(csvString).slice(1);

  // MaxCols with some margin for comments etc
  const err = validateCsv(csv, { minCols: 13, maxCols: 18 });
  if (err) {
    throw new CsvValidationError(err);
  }

  // TODO: ensure length of demandsStrs is correct
  return Object.fromEntries(
    csv.map(([code, _processName, _totalEnergy, _note, ...demandsStrs]) => {
      // Covnert from strings to numbers
      const demands = demandsStrs.map((x) => asNumber(x, 0));
      return [code, demands];
    })
  );
}
export function parsePreparationProcesses(
  csvString: string
): Record<string, string[]> {
  const data = parseCsvFile(csvString).slice(1);

  const err = validateCsv(data, { minCols: 3 });
  if (err) {
    throw new CsvValidationError(err);
  }

  const firstNRows = data.slice(1, 20);
  // A sanity-check that it's the right file
  const l3CodesInThirdCol = firstNRows.every(
    ([maybeCode]) =>
      (maybeCode[0] === "A" || maybeCode[0] === "I") && maybeCode.includes(".")
  );
  if (!l3CodesInThirdCol) {
    throw new CsvValidationError(CsvValidationErrorType.Unknown);
  }

  const splitFacetStr = (str: string) =>
    (str || "").split("$").filter((x) => x.length > 0 && x !== "NA");

  const hasNonEmptyValue = (pair: [any, any[]]): boolean => pair[1]?.length > 0;

  return Object.fromEntries(
    data
      .map((row): [string, string[]] => [row[0], splitFacetStr(row[2])])
      .filter(hasNonEmptyValue)
  );
}

export function parsePackagingCodes(csvString: string): Record<string, string> {
  const data = parseCsvFile(csvString).slice(1);

  const err = validateCsv(data, { minCols: 3 });
  if (err) {
    throw new CsvValidationError(err);
  }

  const firstNRows = data.slice(1, 20);
  // A sanity-check that it's the right file
  const l3CodesInThirdCol = firstNRows.every(
    ([maybeCode]) =>
      (maybeCode[0] === "A" || maybeCode[0] === "I") && maybeCode.includes(".")
  );
  if (!l3CodesInThirdCol) {
    throw new CsvValidationError(CsvValidationErrorType.Unknown);
  }

  return Object.fromEntries(
    data
      .map((row): [string, string] => [row[0], row[2]])
      .filter((kv) => !!kv[1])
  );
}

export function parseFootprintsRpcs(csvString: string) {
  const data = parseCsvFile(csvString).slice(1);

  const err = validateCsv(data, { minCols: 44 });
  if (err) {
    throw new CsvValidationError(err);
  }

  const firstNRows = data.slice(1, 20);
  // Sanity-check: let's not bee too strict on code format
  const codesInFirstRow = firstNRows.every(
    ([code]) => ["A", "I"].includes(code[0]) && code.includes(".")
  );
  if (!codesInFirstRow) {
    throw new CsvValidationError(CsvValidationErrorType.Unknown);
  }

  const rpcFootprints = {} as RpcFootprintsByOrigin;

  // First, we store all footprints in a nested map, like this:
  // {
  //  "A.01.02.123": {
  //    "ES": [1, 2, 3, ...],
  //    "AR": [3, 2, 1, ...],
  //    ...
  //  }
  // }
  data
    .filter((x) => x.length > 1)
    .forEach(
      ([
        rpcCode,
        _foodEx2Code,
        _name,
        _suaCode,
        _suaName,
        _category,
        _originName,
        originCode,
        ...impactsStr
      ]) => {
        if (!rpcCode || rpcCode.trim() === "NA") return;

        if (!(rpcCode in rpcFootprints)) {
          rpcFootprints[rpcCode] = {};
        }

        // Handle if someone inputs RoW (or any other case invariant)
        if (originCode.toLowerCase().trim() === "row") {
          originCode = "RoW";
        }

        // Store values, as number
        const footprints = impactsStr.map((x) => asNumber(x, 0));
        rpcFootprints[rpcCode][originCode] = footprints;
      }
    );

  // Then, we add RoW where needed. RoW is the average of all footprints across
  // all origins for any RPC-code
  Object.entries(rpcFootprints).forEach(([rpcCode, footprintsPerOrigin]) => {
    // Abort if RoW already is defined
    if (footprintsPerOrigin.RoW) return;

    const numberOfOrigins = Object.keys(footprintsPerOrigin).length;

    // Fall-back when no origins are defined
    if (numberOfOrigins === 0) {
      rpcFootprints[rpcCode].RoW = ENV_IMPACTS_ZERO;
      return;
    }

    const averages = vectorsSum(Object.values(footprintsPerOrigin)).map(
      (x: number) => x / numberOfOrigins
    );
    rpcFootprints[rpcCode].RoW = averages;
  });

  return rpcFootprints;
}

export function parseWasteRetailAndConsumer(csvString: string) {
  const csv = parseCsvFile(csvString).slice(1);

  const err = validateCsv(csv, { minCols: 4 });
  if (err) {
    throw new CsvValidationError(err);
  }

  const firstNRows = csv.slice(0, 10);
  const codesInFirstCol = firstNRows.every(
    ([code]) => ["A", "I"].includes(code[0]) && code.includes(".")
  );
  if (!codesInFirstCol) {
    throw new CsvValidationError(CsvValidationErrorType.Unknown);
  }

  return Object.fromEntries(
    csv.map(([code, _name, retailWaste, consumerWaste]) => [
      code,
      [asNumber(retailWaste), asNumber(consumerWaste)],
    ])
  );
}

export function parseDiet(csvString: string): Diet {
  const data = parseCsvFile(csvString).slice(1);

  const err = validateCsv(data, { minCols: 6, maxCols: 8 });
  if (err) {
    throw new CsvValidationError(err);
  }

  const firstNRows = data.slice(0, 10);
  const codesInFirstCol = firstNRows.every(
    ([code]) => ["A", "I"].includes(code[0]) && code.includes(".")
  );
  const amountsInLastCol = firstNRows.every(
    ([_0, _1, _2, _3, _4, amount]) => !Number.isNaN(Number.parseFloat(amount))
  );
  if (!codesInFirstCol || !amountsInLastCol) {
    throw new CsvValidationError(CsvValidationErrorType.Unknown);
  }

  // Collect diet in a map to merge any food items that re-occur.
  const summarizedDiet: Record<string, number> = {};
  data.forEach(([code, _fx2code, _l1, _l2, _name, amount]) => {
    summarizedDiet[code] = (summarizedDiet[code] || 0) + asNumber(amount);
  });

  return Object.entries(summarizedDiet);
}

export function parseRpcOriginWaste(csvString: string) {
  const parametersCsv = parseCsvFile(csvString).slice(1);

  const err = validateCsv(parametersCsv, { minCols: 6 });
  if (err) {
    throw new CsvValidationError(err);
  }

  const firstNRows = parametersCsv.slice(0, 20);
  const codesInFirstCol = firstNRows.every(
    ([code]) => ["A", "I"].includes(code[0]) && code.includes(".")
  );
  const wasteCols = firstNRows.every(
    ([_0, _1, _2, _3, w1, w2]) =>
      !Number.isNaN(Number.parseFloat(w1)) &&
      !Number.isNaN(Number.parseFloat(w2))
  );
  if (!codesInFirstCol || !wasteCols) {
    throw new CsvValidationError(CsvValidationErrorType.Unknown);
  }

  // The CSV has each entry as a line. Even though they're probably sorted and
  // grouped together, we're not going to use that structure in this algorithm,
  // to avoid that assumption causing bugs.
  //
  // We will walk through each line, and successively build an object with the
  // desired shape (see header of this file).
  //
  // If we meet the same (code, origin) pair twice, we will simply overwrite it.
  return parametersCsv.reduce(
    (
      acc,
      [rpcCode, _name, _originName, originCode, originShare, productionWaste]
    ) => {
      // Avoid empty rows
      if (!rpcCode) return acc;
      if (asNumber(originShare, 0) === 0) return acc;

      // First time we see this RPC code? Add an empty object, which we will
      // populate with one obj per origin
      if (!(rpcCode in acc)) {
        acc[rpcCode] = {};
      }

      acc[rpcCode][originCode] = [
        asNumber(originShare),
        asNumber(productionWaste),
      ];

      // Pass the acc along.
      return acc;
    },
    {} as RpcOriginWaste
  );
}

export function parseFoodsRecipes(recipesCsvStr: string) {
  function removeCorruptValues(obj: FoodsRecipes) {
    Object.entries(obj).forEach(([id, _values]) => {
      obj[id] = obj[id].filter(
        // Remove all cases where the rpc code is "", which can happen for
        // empty rows, etc.
        ([foodCode]) => foodCode && foodCode !== ""
      );
    });
  }

  /**
   * Precautionary: Delete any empty rulesets.
   */
  function deleteEmptyValues(obj: FoodsRecipes) {
    Object.entries(obj).forEach(([id, values]) => {
      const nSubComponents = values.length;
      if (nSubComponents === 0) delete obj[id];
    });
  }

  const recipes: FoodsRecipes = {};

  // drop header in csv file
  const data = parseCsvFile(recipesCsvStr).slice(1);

  const err = validateCsv(data, { minCols: 10 });
  if (err) {
    throw new CsvValidationError(err);
  }

  const firstNRows = data.slice(0, 40);
  const isMaybeCode = (code: string) =>
    ["A", "I"].includes(code[0]) && code.includes(".");
  const codesInFirstCol = firstNRows.every(([code]) => isMaybeCode(code));
  const codesInThirdCol = firstNRows.every(([_0, _1, code]) =>
    isMaybeCode(code)
  );
  if (!codesInFirstCol || !codesInThirdCol) {
    throw new CsvValidationError(CsvValidationErrorType.Unknown);
  }

  data.forEach(
    ([
      code,
      _name,
      component,
      _componentName,
      facetStr,
      _facetDescr,
      perc,
      prob,
      yieldFactor,
      allocationFactor,
    ]) => {
      if (code === "") return; // Empty row
      const value = roundToPrecision(
        (asNumber(perc, 100) * asNumber(prob, 1)) / 100,
        3
      );

      const netYieldFactor =
        asNumber(yieldFactor, 1) * asNumber(allocationFactor, 1);

      if (value === 0) return;

      const PROCESS_UNSPECIFIED = "F28.A07XD";
      const processes = facetStr
        .split("$")
        .filter((f) => f.startsWith("F28.") && f !== PROCESS_UNSPECIFIED);

      const entry: [string, string[], number, number] = [
        component,
        processes,
        value,
        netYieldFactor || 1,
      ];

      if (code in recipes) {
        recipes[code].push(entry);
      } else {
        recipes[code] = [entry];
      }
    }
  );

  removeCorruptValues(recipes);
  deleteEmptyValues(recipes);

  return recipes;
}

export function parseSfaRecipes(recipesCsvStr: string): SfaRecipeComponent[] {
  const data: string[][] = parseCsvFile(recipesCsvStr).slice(1);

  const err = validateCsv(data, { minCols: 10 }); // don't need the last 2
  if (err) {
    throw new CsvValidationError(err);
  }

  return (
    data
      .map(
        ([
          sfaCode,
          sfaName,
          _i1Name,
          i1Share,
          _i1Desc,
          i1ProcessName,
          _i1YieldFactor,
          _i1PublicationSource,
          i1FoodEx2Code,
          i1NetShare,
          _i1NetAmountDesc,
          _i2Name,
        ]) => ({
          sfaCode,
          sfaName,
          foodEx2Code: i1FoodEx2Code,
          process: SfaEfsaProcessTranslations[i1ProcessName] || "",
          grossShare: asNumber(i1Share, 0) / 100,
          netShare: asNumber(i1NetShare, 0) / 100,
        })
      )
      // Skip any ingredients with a 0-value
      .filter((x) => x.grossShare > 0 && x.netShare > 0)
  );
}
