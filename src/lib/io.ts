/**
 * Export functionality
 * ========================================================================= */

import { stringifyCsvData } from "./utils";

function downloadBlob(filename: string, blob: Blob) {
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

export function downloadAsPlaintext(data: string, filename: string) {
  const blob = new Blob(["\ufeff" + data], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(filename, blob);
}

export function downloadAsCsv(filename: string, data: string[][]) {
  downloadAsPlaintext(stringifyCsvData(data), filename);
}

export async function downloadAsXlsx(
  filename: string,
  sheets: [string, string[][]][],
) {
  if (sheets.length === 0) return;

  const ExcelJS = await import("exceljs");

  const wb = new ExcelJS.Workbook();

  sheets.forEach(([sheetname, data]) => {
    const ws = wb.addWorksheet(sheetname);
    ws.addRows(data);
  });

  const buffer = await wb.xlsx.writeBuffer();
  const mimetype =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const blob = new Blob([buffer], { type: mimetype });
  downloadBlob(filename, blob);
}
