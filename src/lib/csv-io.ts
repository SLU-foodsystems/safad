import { toPrecision } from "./utils";
import { fbsIds, suaIds, suaToFbsId } from "./foods-constants";

/**
 * Constants and types
 * ========================================================================= */

const CSV_DELIMITER = ",";
const HEADER = [
  "SUA Id",
  "FBS Id",
  "Amount (g)",
  "Production Waste (%)",
  "Retail Waste (%)",
  "Consumer Waste (%)",
  "Technical Improvement (%)",
  "Origin (country1:amount1 country2:amount2 ...)",
];
const EXPECTED_LENGTH = HEADER.length;
const SUM_ARITHMETIC_THRESHOLD = 0.1; // Allowed absolute deviation from sum
const EXPORT_FILENAME_BASE = "slu-planeat";

const ErrorCodes = {
  ROW_INVALID_LENGTH: "row-invalid-length",
  ROW_MISSING_SUA_ID: "row-missing-sua-id",
  ROW_AMOUNT_NAN: "row-amount-nan",
  ROW_AMOUNT_ILLEGAL_VALUE: "row-amount-illegal-value",
  ROW_FACTORS_NAN: "row-factors-nan",
  ROW_FACTORS_ILLEGAL_VALUE: "row-factors-illegal-value",
  ROW_ORIGIN_MISSING: "row-origin-missing",
  ROW_ORIGIN_MALFORMATTED: "row-origin-malformatted",
  ROW_ORIGIN_INVALID_SUM: "row-origin-invalid-sum",
  FILE_INSUFFICIENT_ROWS: "file-invalid-length",
  FILE_DUPLICATE_SUA_IDS: "file-duplicate-sua-ids",
  FILE_DUPLICATE_FBS_IDS: "file-duplicate-fbs-ids",
  FILE_MISSING_FBS_IDS: "file-missing-fbs-ids",
} as const;

type ErrorCodeKey = keyof typeof ErrorCodes;
type ErrorCodeValue = (typeof ErrorCodes)[ErrorCodeKey];

interface CsvError {
  scope: "file" | "row";
  code: ErrorCodeValue;
}
interface CsvFileError extends CsvError {
  code: ErrorCodeValue;
  data: string | number;
  scope: "file";
}
interface CsvRowError extends CsvError {
  code: ErrorCodeValue;
  index: number;
  scope: "row";
}

const csvRowError = (code: ErrorCodeValue, index: number): CsvRowError => ({
  scope: "row",
  code,
  index,
});
const csvFileError = (
  code: ErrorCodeValue,
  data: string | number
): CsvFileError => ({
  scope: "file",
  code,
  data,
});

/**
 * Generic Helper methods
 * ========================================================================= */

const setEquals = <T>(xs: Set<T>, ys: Set<T>): boolean =>
  xs.size === ys.size && [...xs].every((x) => ys.has(x));

const setMinus = <T>(xs: Set<T>, ys: Set<T>): Set<T> => {
  const difference = new Set<T>();
  xs.forEach((x) => {
    if (!ys.has(x)) difference.add(x);
  });

  return difference;
};

function generateFileName() {
  const now = new Date();
  const twoDigit = (x: number) => (x > 9 ? "" : "0") + x;
  const datetimeStamp = `${now.getFullYear()}${twoDigit(
    now.getMonth() + 1
  )}${twoDigit(now.getDate())}`;
  return `${EXPORT_FILENAME_BASE}-${datetimeStamp}`;
}

/**
 * Import functionality
 * ========================================================================= */

/**
 * Check a CSV row against a number of errors. Returns 'null' if no errors are
 * found, and an object { scope: 'row'; message: string; }
 */
function verifyCsvInputRow(row: string[], index: number): CsvError | null {
  const err = (code: ErrorCodeValue) => csvRowError(code, index);
  if (row.length !== EXPECTED_LENGTH) {
    return err(ErrorCodes.ROW_INVALID_LENGTH);
  }

  // Sua Id empty
  if (!row[0]) return err(ErrorCodes.ROW_MISSING_SUA_ID);
  // We don't care if the fbs id is empty.

  const isNaN = (str: string) => Number.isNaN(Number.parseFloat(str));

  // Amount is parsable as a number.
  if (isNaN(row[2])) return err(ErrorCodes.ROW_AMOUNT_NAN);
  const amountNumber = parseFloat(row[2]);
  if (amountNumber < 0) return err(ErrorCodes.ROW_AMOUNT_ILLEGAL_VALUE);

  // Error if factors are inconsistent: either all or none should be present
  const factors = row.slice(3, 7);
  const hasEmptyFactors = factors.some((x) => x === "");
  const hasNaNFactors = factors.some((x) => x !== "" && isNaN(x));
  if (hasEmptyFactors && hasNaNFactors) {
    return err(ErrorCodes.ROW_FACTORS_NAN);
  }

  // Check if any of the numeric values are non-percentages
  if (
    factors
      .filter((f) => !isNaN(f))
      .map((f) => parseFloat(f))
      .some((f) => f < 0 || f > 100)
  ) {
    return err(ErrorCodes.ROW_FACTORS_ILLEGAL_VALUE);
  }

  if (row[7] !== "") {
    const origins = row[7].split(" ");
    // Not all are pairs
    if (origins.some((pair) => !pair.includes(":"))) {
      return err(ErrorCodes.ROW_ORIGIN_MALFORMATTED);
    }
    // Any of the pairs have invalid number
    if (origins.map((o) => o.split(":")).some(([_, value]) => isNaN(value))) {
      return err(ErrorCodes.ROW_ORIGIN_MALFORMATTED);
    }
    // sums do not add up 100
    const originSum = origins
      .map((o) => parseFloat(o.split(":")[1]))
      .reduce((a, b) => a + b, 0);

    // Give some lea-way for float imprecision
    if (Math.abs(100 - originSum) > SUM_ARITHMETIC_THRESHOLD) {
      return err(ErrorCodes.ROW_ORIGIN_INVALID_SUM);
    }
  }

  return null;
}

// TODO: Go over this and consider which errors are fatal, and which are not.
function verifyCsvInputFile(rows: string[][]) {
  // Check if n rows is # SUA (+1, for header)
  const nRows = rows.length;
  const nSuas = suaIds.length;
  if (nRows < nSuas) {
    // TODO: We do not need to break here. Instead, we can tell the user that N
    // sua's are missing, and fill these with the base values instead.
    return csvFileError(ErrorCodes.FILE_INSUFFICIENT_ROWS, nSuas - nRows);
  }

  // Check if all sua ids are there
  // Together with the previous clause, we cover duplicates.
  const suaIdsInFile = new Set(rows.map((row) => row[0]));
  if (!setEquals(new Set(suaIds), suaIdsInFile)) {
    // TODO: Here we could really just throw a warning, and drop the dupes.
    return csvFileError(ErrorCodes.FILE_DUPLICATE_SUA_IDS, "");
  }

  /**
   * Following steps check the 'factors', postitioned [3, 7]
   */

  // We only consider rows with have all factors populated
  const rowsWithFbsValues = rows.filter((row) =>
    row.slice(3, 8).some((cell) => cell !== "")
  );
  // Check for duplicates: first give us the ids, then compare sizes..
  const fbsIdsWithValues = rowsWithFbsValues.map((row) => row[1]);
  const hasDuplicateFbsValues =
    fbsIdsWithValues.length !== new Set(fbsIdsWithValues).size;
  if (hasDuplicateFbsValues) {
    // TODO: Similarly to sua values, we can 'simply' drop the duplicate values
    return csvFileError(ErrorCodes.FILE_DUPLICATE_FBS_IDS, "");
  }
  // Check for missing fbsids
  const hasMissingFbsIds = !setEquals(
    new Set(fbsIds),
    new Set(fbsIdsWithValues)
  );
  if (hasMissingFbsIds) {
    // TODO: Can warn here as well.
    const missingFbsIds = setMinus(new Set(fbsIds), new Set(fbsIdsWithValues));
    console.log(missingFbsIds);
    return csvFileError(ErrorCodes.FILE_MISSING_FBS_IDS, "TODO");
  }

  return null;
}

function dropHeaderIfPresent(matrix: string[][]): string[][] {
  const [header, firstRow, ...rest] = matrix;

  // Check if the amount-col, which is something that should have a numeric
  // value for all rows, is parseable as a number for the 'header'. If it isn't,
  // we assume it's a label, i.e. a header. If it is parseable, we assume no
  // header.
  if (Number.isNaN(Number.parseFloat(header[2]))) {
    return [firstRow, ...rest];
  }

  return matrix;
}

function aggregateErrorMessages(
  fileError: CsvError | null,
  rowErrors: (CsvError | null)[]
) {
  const messages = [];
  const code = fileError?.code ?? null;

  switch (code) {
    case null:
      break;
    case ErrorCodes.FILE_DUPLICATE_FBS_IDS:
      messages.push("Some FBS ids are missing;");
      break;
    case ErrorCodes.FILE_DUPLICATE_SUA_IDS:
      break;
    case ErrorCodes.FILE_INSUFFICIENT_ROWS:
      break;
    case ErrorCodes.FILE_MISSING_FBS_IDS:
      break;
  }

  return [code, ...rowErrors.map((err) => err?.code || null)].filter(
    (x) => x !== null
  );
}

export function csvToStructuredJson(csv: string): BaseValues {
  const matrix = dropHeaderIfPresent(
    csv
      .split("\n")
      .map((row) => row.split(CSV_DELIMITER))
      .filter((x) => x.length > 1) // Skip empty rows
  );

  const fileError = verifyCsvInputFile(matrix);
  const rowErrors = matrix.map(verifyCsvInputRow);
  const errors = aggregateErrorMessages(fileError, rowErrors);

  if (errors && errors.length > 0) {
    alert("Errors were found when parsing file.");
    console.error(errors);
  }

  // Filter out the rowErrors that are missing.

  const result: BaseValues = {
    amount: {},
    origin: {},
    factors: {},
  };

  // Skip the rows that are errornous
  matrix.forEach((fields) => {
    const [
      suaId,
      fbsId,
      amount,
      productionWaste,
      retailWaste,
      consumerWaste,
      technicalImprovement,
      originStr,
    ] = fields;

    const amountNumber = amount === "" ? 0 : Number.parseFloat(amount);
    result.amount[suaId] = amountNumber;

    if (!productionWaste) return;

    result.factors[fbsId] = {
      productionWaste: parseFloat(productionWaste),
      retailWaste: parseFloat(retailWaste),
      consumerWaste: parseFloat(consumerWaste),
      technicalImprovement: parseFloat(technicalImprovement),
    };

    result.origin[fbsId] = Object.fromEntries(
      originStr
        .split(" ")
        .map((pair) => pair.split(":"))
        .map(([country, valueStr]) => [country, parseFloat(valueStr)])
    );
  });

  return result;
}

/**
 * Export functionality
 * ========================================================================= */

function downloadAsPlaintext(data: string, filename: string) {
  const blob = new Blob(["\ufeff" + data], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  const isSafariBrowser =
    navigator.userAgent.indexOf("Safari") !== -1 &&
    navigator.userAgent.indexOf("Chrome") === -1;

  //if Safari open in new window to save file with random filename.
  if (isSafariBrowser) link.setAttribute("target", "_blank");

  link.setAttribute("href", url);
  link.setAttribute("download", filename + ".csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportCsv({
  amountValues,
  factorsValues,
  factorsOverrides,
  originValues,
}: {
  amountValues: Record<string, number>;
  factorsValues: Record<string, Factors>;
  factorsOverrides: Record<keyof Factors, number | null>;
  originValues: Record<string, OriginMap>;
}) {
  const fbsTreated = new Set();

  const getFactor = (fbsId: string, factor: keyof Factors) =>
    factorsOverrides[factor] || factorsValues[fbsId][factor];

  const rows = suaIds.map((id) => {
    const fbsId = suaToFbsId(id);
    if (fbsTreated.has(fbsId)) {
      return [id, fbsId, toPrecision(amountValues[id]), "", "", "", "", ""];
    }

    fbsTreated.add(fbsId);

    const originString = Object.entries(originValues[fbsId] as OriginMap)
      .map(([country, value]) => `${country}:${toPrecision(value)}`)
      .join(" ");

    return [
      id,
      fbsId,
      amountValues[id],
      getFactor(fbsId, "productionWaste"),
      getFactor(fbsId, "retailWaste"),
      getFactor(fbsId, "consumerWaste"),
      getFactor(fbsId, "technicalImprovement"),
      originString,
    ].map((x) => (x instanceof Number ? String(toPrecision(x as number)) : x));
  });

  const csvString = [HEADER, ...rows]
    // Wrap any column with comma values in quotese
    // .map((row) => row.map((cell) => (cell.includes(",") ? `"${cell}"` : cell)))
    .map((row) => row.join(CSV_DELIMITER))
    .join("\n");

  downloadAsPlaintext(csvString, generateFileName());
}
