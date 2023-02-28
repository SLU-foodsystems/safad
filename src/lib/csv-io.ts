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
