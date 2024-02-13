import { parseCsvFile, roundToPrecision, vectorsSum } from "@/lib/utils";

import processTranslationsCsv from "@/data/slv-to-efsa-processes.csv?raw";

const SlvEfsaProcessTranslations: Record<string, string> = Object.fromEntries(
  parseCsvFile(processTranslationsCsv)
    .slice(1)
    .map(([slvName, efsaCode]) => [slvName, efsaCode])
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
}

export class CsvValidationError extends Error {
  public readonly type: CsvValidationErrorType;

  constructor(type: CsvValidationErrorType) {
    super("Csv Validation Error: " + type);
    this.type = type;
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
    const ghgs = ghgsStrs.map((x) => (x ? parseFloat(x) : 0));
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

  csv
    .map((row) => row.map((x) => x.trim())) // Trim all fields
    .forEach(
      ([
        consumptionCountryCode,
        _consumptionCountry,
        productionCountryCode,
        _productionCountry,
        ...ghgsStrs
      ]) => {
        // Convert all GHG factors to numbers, falling back to 0 if missing
        const ghgs = ghgsStrs
          .map((x) => (x ? parseFloat(x) : 0))
          .map((x) => (Number.isNaN(x) ? 0 : x));

        if (!(consumptionCountryCode in results)) {
          results[consumptionCountryCode] = {};
        }

        results[consumptionCountryCode][productionCountryCode] = ghgs;
      }
    );

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
      const demands = demandsStrs.map((x) => {
        const val = Number.parseFloat(x) || 0;
        return Number.isNaN(x) ? 0 : val;
      });
      return [code, demands];
    })
  );
}

export function parseProcessesPackaging(
  csvString: string
): Record<string, string[]> {
  const data = parseCsvFile(csvString).slice(1);

  const err = validateCsv(data, { minCols: 9 });
  if (err) {
    throw new CsvValidationError(err);
  }

  const firstNRows = data.slice(1, 20);
  // A sanity-check that it's the right file
  const l2CodesInFirstCol = firstNRows.every(
    ([l2Code]) => l2Code.length === 7 && l2Code.match(/^(A|I)\..\d\.\d\d$/)
  );
  const l3CodesInThirdCol = firstNRows.every(
    ([_0, _1, l3Code]) => l3Code.split(".").length === 4
  );
  if (!l2CodesInFirstCol || !l3CodesInThirdCol) {
    throw new CsvValidationError(CsvValidationErrorType.Unknown);
  }

  const splitFacetStr = (str: string) =>
    (str || "").split("$").filter((x) => x.length > 0 && x !== "NA");

  const packagingData = Object.fromEntries(
    data.map((row) => [row[0], splitFacetStr(row[7])])
  );
  const preparationProcessesData = Object.fromEntries(
    data
      .map((row) => [row[2], splitFacetStr(row[4])])
      .filter((pair) => pair[1].length > 0)
  );

  return { ...packagingData, ...preparationProcessesData };
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

  const structured = {} as RpcFootprintsByOrigin;

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

        // Handle the base-case, i.e. the initial acc.
        if (!(rpcCode in structured)) {
          structured[rpcCode] = {};
        }

        // Handle if someone inputs ROW, row, roW or any other case variant
        if (originCode.toLowerCase().trim() === "row") {
          originCode = "RoW";
        }

        // Store values, as number
        structured[rpcCode][originCode] = impactsStr.map((x) => asNumber(x, 0));
      }
    );

  // Set RoW to be the average
  Object.entries(structured).forEach(([rpcCode, factorsPerOrigin]) => {
    // Abort if RoW already is defined
    if (Object.keys(factorsPerOrigin).includes("RoW")) return;

    const numberOfOrigins = Object.values(factorsPerOrigin).length;
    const averages = vectorsSum(Object.values(factorsPerOrigin)).map(
      (x: number) => x / numberOfOrigins
    );

    structured[rpcCode].RoW = averages;
  });

  return structured;
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

  const err = validateCsv(data, { minCols: 3, maxCols: 5 });
  if (err) {
    throw new CsvValidationError(err);
  }

  const firstNRows = data.slice(0, 10);
  const codesInFirstCol = firstNRows.every(
    ([code]) => ["A", "I"].includes(code[0]) && code.includes(".")
  );
  const amountsInLastCol = firstNRows.every(
    ([_0, _1, amount]) => !Number.isNaN(Number.parseFloat(amount))
  );
  if (!codesInFirstCol || !amountsInLastCol) {
    throw new CsvValidationError(CsvValidationErrorType.Unknown);
  }

  return data.map(
    ([code, _name, amount]): FoodEntry => [code, asNumber(amount)]
  );
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
        (asNumber(perc, 100) * asNumber(prob, 100)) / 100,
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

export function parseSlvRecipes(recipesCsvStr: string): SlvRecipeComponent[] {
  const data: string[][] = parseCsvFile(recipesCsvStr).slice(1);

  const err = validateCsv(data, { minCols: 10 }); // don't need the last 2
  if (err) {
    throw new CsvValidationError(err);
  }

  return (
    data
      .map(
        ([
          slvCode,
          slvName,
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
          slvCode,
          slvName,
          foodEx2Code: i1FoodEx2Code,
          process: SlvEfsaProcessTranslations[i1ProcessName] || "",
          grossShare: asNumber(i1Share, 0) / 100,
          netShare: asNumber(i1NetShare, 0) / 100,
        })
      )
      // Skip any ingredients with a 0-value
      .filter((x) => x.grossShare > 0 && x.netShare > 0)
  );
}
