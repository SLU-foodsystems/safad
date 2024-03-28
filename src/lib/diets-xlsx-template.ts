import dietTemplateUrl from "@/data/SAFAD OR Footprints per Diet TEMPLATE.xlsx?url";

/**
 * This file serves to populate the Diet XLSX-template file with our own data.
 *
 * It was not possible to do this using the SheetJS or exceljs libraries, as
 * they strip the document of charts (and partially formatting, for free sheetjs
 * version).
 *
 * Instead, we use the fact that xlsx files are zip-files, unzipping them and
 * replacing the worksheet file for the tab 'Data'.
 *
 * To familiarise myself with the OOXML-xlsx format, I used the following
 * reserouces, along with reverse-engineering xlsx files:
 *
 * http://officeopenxml.com/anatomyofOOXML-xlsx.php
 * http://officeopenxml.com/SScontentOverview.php
 */

/**
 * Generate an array indicating which type each column has, based on the
 * header names.
 */
const colTypeArray = (header: string[]): ("number" | "string")[] => {
  // For numbers
  const startIndex = header.indexOf("Amount (g)");
  const endIndex = header.indexOf("Processes");

  return header.map((_, i) =>
    i >= startIndex && i < endIndex ? "number" : "string"
  );
};

// Get a column id
const idxToColId = (idx: number) => {
  const CC_A = "A".charCodeAt(0);
  const CC_Z = "Z".charCodeAt(0);

  const offsetIndex = CC_A + idx;
  if (offsetIndex <= CC_Z) {
    return String.fromCharCode(CC_A + idx);
  }

  const RANGE = CC_Z - CC_A;

  const char1 = String.fromCharCode(CC_A + Math.floor(idx / RANGE) - 1);
  const char2 = String.fromCharCode(CC_A + (idx % RANGE) - 1);

  return char1 + char2;
};

function asSheetXml(data: string[][], columnFormats: ("string" | "number")[]) {
  const nRows = data.length;
  const nCols = data[0].length;
  const lastCellPos = idxToColId(nCols - 1) + nRows;

  // r: the position, e.g. A1 or BC27
  // t: type
  // s: style
  const cNumber = (pos: string, value: string) =>
    `<c r="${pos}" s="1" t="n"><v>${value}</v></c>`;

  const cString = (pos: string, value: string) =>
    `<c r="${pos}" s="1" t="inlineStr"><is><t>${value}</t></is></c>`;

  const sheetData = data.map(
    (cells, rowIdx) =>
      `<row r="${rowIdx + 1}">` +
      cells
        .map((value, columnIdx) => {
          const pos = idxToColId(columnIdx) + (rowIdx + 1);
          return rowIdx === 0 || columnFormats[columnIdx] === "string"
            ? cString(pos, value)
            : cNumber(pos, value);
        })
        .join("\n") +
      `</row>`
  );

  /**
   * Types [t]:
   * b for boolean
   * d for date
   * e for error
   * inlineStr for an inline string (i.e., not stored in the shared strings part, but directly in the cell)
   * n for number
   * s for shared string (so stored in the shared strings part and not in the cell)
   * str for a formula (a string representing the formula)
   */
  return `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:xr2="http://schemas.microsoft.com/office/spreadsheetml/2015/revision2">
  <sheetPr filterMode="false">
    <pageSetUpPr fitToPage="false" />
  </sheetPr>
  <dimension ref="A1:${lastCellPos}" />
  <sheetViews>
    <sheetView workbookViewId="0">
      <selection pane="topLeft" activeCell="A1" activeCellId="0" sqref="A1" />
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="14.5" zeroHeight="false" outlineLevelRow="0" outlineLevelCol="0" />
  <cols><col min="1" max="1" width="18" customWidth="1"/><col min="2" max="2" width="24" customWidth="1"/><col min="3" max="3" width="19" customWidth="1"/></cols>
  <sheetData>${sheetData}</sheetData>
  <autoFilter ref="A1:${lastCellPos}" xr:uid="{00000000-0009-0000-0000-000005000000}"/><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
  </worksheet>
`;
}

export async function downloadAsDietTemplate(
  filename: string,
  data: string[][]
) {
  // Async load dependencies
  const [{ default: JSZip }, { default: saveAs }, res] = await Promise.all([
    import("jszip"),
    import("file-saver"),
    fetch(dietTemplateUrl),
  ]);

  // Convert template file into array-buffer, so that we can use it
  const ab = await res.arrayBuffer();

  // Create JSZip instance and populate it with the template xlsx file
  const zip = new JSZip();
  await zip.loadAsync(ab);

  // Fetch the workbook.xml file
  const wbMeta = (await zip.file("xl/workbook.xml")?.async("string")) || "";
  if (!wbMeta) {
    throw new Error("No xl/workbook.xml found in xlsx file.");
  }

  // Parse the workbook.xml file to identify the id of the sheet named 'Data'
  const wbMetaXml = new DOMParser().parseFromString(wbMeta, "text/xml");
  const dataSheetDescription = wbMetaXml.querySelector('sheet[name="Data"]');
  const dataSheetId = dataSheetDescription?.getAttribute("r:id")?.substring(3);
  // Now that we have the id, we know what the file of the worksheet is called
  const fpath = `xl/worksheets/sheet${dataSheetId}.xml`;

  // Generate a new sheet<id>.xml file, and replace the old one with it
  const newSheetXmlData = asSheetXml(data, colTypeArray(data[0]));
  zip.file(fpath, newSheetXmlData);
  // Download it!
  const content = await zip.generateAsync({
    type: "blob",
    mimeType: "application/octet-stream",
  });
  saveAs(content, filename);
}
