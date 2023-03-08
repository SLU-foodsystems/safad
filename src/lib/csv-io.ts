import { toPrecision } from "./utils";
import { fbsIds, suaIds, suaToFbsId } from "./foods-constants";

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

const ERROR_CODES = {
  ROW_MISSING_SUA_ID: "row-missing-sua-id",
  ROW_AMOUNT_NAN: "row-amount-nan",
  ROW_AMOUNT_ILLEGAL_VALUE: "row-amount-illegal-value",
  ROW_FACTORS_NAN: "row-factors-nan",
  ROW_FACTORS_ILLEGAL_VALUE: "row-factors-illegal-value",
  ROW_ORIGIN_MISSING: "row-origin-missing",
  ROW_ORIGIN_MALFORMATTED: "row-origin-malformatted",
  ROW_ORIGIN_INVALID_SUM: "row-origin-invalid-sum",
  FILE_INVALID_LENGTH: "file-invalid-length",
  FILE_DUPLICATE_SUA_IDS: "file-duplicate-sua-ids",
  FILE_DUPLICATE_FBS_IDS: "file-duplicate-fbs-ids",
  FILE_MISSING_FBS_IDS: "file-missing-fbs-ids",
} as const;

const isValidRow = (row: string[]) => {
  if (row.length !== HEADER.length) return;

  // Sua Id empty
  if (!row[0]) throw new Error(ERROR_CODES.ROW_MISSING_SUA_ID);
  // We don't care if the fbs id is empty.

  const isNaN = (str: string) => Number.isNaN(Number.parseFloat(str));

  // Amount is parsable as a number.
  if (isNaN(row[2])) throw new Error(ERROR_CODES.ROW_AMOUNT_NAN);
  const amountNumber = parseFloat(row[2]);
  if (amountNumber < 0) throw new Error(ERROR_CODES.ROW_AMOUNT_ILLEGAL_VALUE);

  // Error if factors are inconsistent: either all or none should be present
  const factors = row.slice(3, 7);
  const hasEmptyFactors = factors.some((x) => x === "");
  const hasNaNFactors = factors.some((x) => x !== "" && isNaN(x));
  if (hasEmptyFactors && hasNaNFactors) {
    throw new Error(ERROR_CODES.ROW_FACTORS_NAN);
  }

  // Check if any of the numeric values are non-percentages
  if (
    factors
      .filter((f) => !isNaN(f))
      .map((f) => parseFloat(f))
      .some((f) => f < 0 || f > 100)
  ) {
    throw new Error(ERROR_CODES.ROW_FACTORS_ILLEGAL_VALUE);
  }

  if (row[7] !== "") {
    const origins = row[7].split(" ");
    // Not all are pairs
    if (origins.some((pair) => !pair.includes(":"))) {
      return ERROR_CODES.ROW_ORIGIN_MALFORMATTED;
    }
    // Any of the pairs have invalid number
    if (origins.map((o) => o.split(":")).some(([_, value]) => isNaN(value))) {
      throw new Error(ERROR_CODES.ROW_ORIGIN_MALFORMATTED);
    }
    // sums do not add up 100
    const originSum = origins
      .map((o) => parseFloat(o.split(":")[1]))
      .reduce((a, b) => a + b, 0);

    // Give some lea-way for float imprecision
    if (Math.abs(100-originSum) > 0.1) {
      console.log(originSum);
      throw new Error(ERROR_CODES.ROW_ORIGIN_INVALID_SUM);
    }
  }

  return true;
};

const setEquals = <T>(xs: Set<T>, ys: Set<T>): boolean =>
  xs.size === ys.size && [...xs].every(x => ys.has(x));

const isValidFile = (rows: string[][]) => {
  // Check if n rows is # SUA (+1, for header)
  const nRows = rows.length;
  const nSuas = suaIds.length;
  if (nRows !== nSuas) {
    throw new Error(ERROR_CODES.FILE_INVALID_LENGTH);
  }

  // check if all sua ids are there
  const suaIdsInFile = new Set(rows.map((row) => row[0]));
  if (!setEquals(new Set(suaIds), suaIdsInFile)) {
    throw new Error(ERROR_CODES.FILE_DUPLICATE_SUA_IDS)
  }

  const rowsWithFbsValues = rows.filter(row => row.slice(3, 8).some(cell => cell !== ""));
  const fbsIdsWithValues = rowsWithFbsValues.map(row => row[1]);
  const hasDuplicateFbsValues = fbsIdsWithValues.length !== new Set(fbsIdsWithValues).size;
  if (hasDuplicateFbsValues) {
    throw new Error(ERROR_CODES.FILE_DUPLICATE_FBS_IDS)
  }
  const hasMissingFbsIds = !setEquals(new Set(fbsIds), new Set(fbsIdsWithValues));
  if (hasMissingFbsIds) {
    throw new Error(ERROR_CODES.FILE_MISSING_FBS_IDS);
  }

  rows.forEach(isValidRow);
};

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

export function csvToStructuredJson(csv: string): BaseValues {
  const matrix = dropHeaderIfPresent(
    csv
      .split("\n")
      .map((row) => row.split(CSV_DELIMITER))
      .filter((x) => x.length > 1)
  );

  const firstInvalidLengthRow = matrix.findIndex(
    (row) => row.length !== EXPECTED_LENGTH
  );
  if (firstInvalidLengthRow !== -1) {
    const len = matrix[firstInvalidLengthRow].length;
    throw new Error(
      `Invalid row length found, row ${firstInvalidLengthRow} (len=${len})`
    );
  }

  isValidFile(matrix);

  const result: BaseValues = {
    amount: {},
    origin: {},
    factors: {},
  };

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

function generateFileName() {
  const now = new Date();
  const twoDigit = (x: number) => (x > 9 ? "" : "0") + x;
  const datetimeStamp = `${now.getFullYear()}${twoDigit(
    now.getMonth() + 1
  )}${twoDigit(now.getDate())}`;
  return `slu-planeat-${datetimeStamp}`;
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
    // Escape any comma with
    // .map((row) => row.map((cell) => (cell.includes(",") ? `"${cell}"` : cell)))
    .map((row) => row.join(CSV_DELIMITER))
    .join("\n");

  downloadAsPlaintext(csvString, generateFileName());
}
