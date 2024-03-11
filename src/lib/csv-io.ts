/**
 * Export functionality
 * ========================================================================= */

import { stringifyCsvData } from "./utils";

export function downloadAsPlaintext(data: string, filename: string) {
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
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadAsCsv(filename: string, data: string[][]) {
  downloadAsPlaintext(stringifyCsvData(data), filename);
}

export async function downloadAsXlsx(
  filename: string,
  sheets: [string, string[][]][]
) {
  if (sheets.length === 0) return;

  const { utils, writeFileXLSX } = await import("xlsx");

  const wb = utils.book_new();

  sheets.forEach(([sheetname, data]) => {
    const ws = utils.aoa_to_sheet(data);
    utils.book_append_sheet(wb, ws, sheetname);
  });

  writeFileXLSX(wb, filename);
}
