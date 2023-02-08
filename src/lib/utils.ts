export function sum(numbers: number[]) {
  return numbers.reduce((a, b) => a + b, 0);
}

export function average(numbers: number[]) {
  if (numbers.length === 0) return 0;
  return sum(numbers) / numbers.length;
}

// Round a number to a given precision (= number of decimal points)
export function toPrecision(number: number, precision: number = 2) {
  return Math.round(number * 10 ** precision) / 10 ** precision;
}

export function inputValueToNumber(value: string): number {
  // Exit early if null or empty string
  if (!value) return NaN;

  // Attempt cleaning string by trimming, using . for decimals, and removing
  // non-numeric characters.
  const cleaned = value
    .trim()
    .replace(/\,/g, ".")
    .replace(/[^\d\.]/g, "");

  // Return number (or NaN, e.g. if string is empty).
  return Number.parseFloat(cleaned);
}

export const generateIdValueMap = <T>(ids: string[], defaultValue: () => T) =>
  Object.fromEntries(ids.map((id) => [id, defaultValue()]));

export const generateCsvData = (header: string[], body: string[][]): string =>
  [header, ...body]
    // Escape any comma with
    // .map((row) => row.map((cell) => (cell.includes(",") ? `"${cell}"` : cell)))
    .map((row) => row.join(","))
    .join("\n");

export function downloadCsv(csvData: string, filename: string) {
  const blob = new Blob(["\ufeff" + csvData], {
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
