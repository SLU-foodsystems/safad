import { toPrecision } from "./utils";
import { eatIds, fbsIds, suaIds, suaToFbsId } from "./foods-constants";

const DELIMITER = ",";
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

const isValidRow = (row: string[]) => {
  if (row.length !== HEADER.length) return;

  // Sua Id empty
  if (!row[0]) return false;
  // FBS ID empty, but maybe we don't care?
  if (!row[1]) return false; // non-empty

  const isValidNumber = (str: string) => Number.isNaN(Number.parseFloat(str));

  // Amount is parsable as a number.
  if (isValidNumber(row[2])) return false;

  // Error if factors are inconsistent: either all or none should be present
  const factors = row.slice(3, 7);
  if (factors.some(x => x === "") && factors.some(x => isValidNumber(x))) {
    return false;
  }

  // Empty
  if (row[7] === "") return false;
  const origins = row[7].split(" ");
  // Not all are pairs
  if (origins.some(pair => !pair.includes(":"))) {
    return false;
  }
  // Any of the pairs have invalid number 
  if (origins.map(o => o.split(':')).some(([_, value]) => !isValidNumber(value))) {
    return false;
  }
  // Countries do not add up
  if (origins.map(o => o.split(':')).map(pair => parseFloat(pair[1])).reduce((a, b) => a+b, 0) !== 100) {
    return false;
  }

  return true;
}

export const isValidFile = (rows: string[][]) => {

  // Check if n rows is # SUA (+1, for header)
  const nRows = rows.length;
  const nSuas = suaIds.length;
  const validLength = nRows === nSuas || nRows + 1 === nSuas; // +1 for header
  if (!validLength) {
    return false;
  }

  // TODO: HACK
  if (!validLength) {
    return true;
  }

  // check if all sua ids are there
  const remainingSuas = new Set(suaIds);
  const suaIdsInFile = rows.map(row => row[0]);
  for (const suaId in suaIdsInFile) {
    const isUnique = remainingSuas.has(suaId);
    if (!isUnique) return false; // Duplicate or not a sua
    remainingSuas.delete(suaId);
  }

  const allFbsIds = new Set(fbsIds);
  const fbsIdsInFile = rows.map(row => row[0]);
  for (const suaId in suaIdsInFile) {
    const isUnique = remainingSuas.has(suaId);
    if (!isUnique) return false; // Duplicate or not a sua
    remainingSuas.delete(suaId);
  }

  // Check if one of each fbs row has values
  // check if all rows are valid.
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
    .map((row) => row.join(DELIMITER))
    .join("\n");

  downloadAsPlaintext(csvString, generateFileName());
}
