library(readxl)
library(openxlsx)
library(purrr)
library(fs)

read_sheet_parts <- function(input_path, sheet_name) {
  probe <- read_excel(
    input_path,
    sheet = sheet_name,
    col_names = FALSE,
    col_types = "text",
    .name_repair = "minimal"
  )
  all_text <- read_excel(
    input_path,
    sheet = sheet_name,
    range = sprintf("A1:%s1000", int2col(ncol(probe))),
    col_names = FALSE,
    col_types = "text",
    .name_repair = "minimal"
  )
  while (nrow(all_text) > 0 &&
         all(is.na(all_text[nrow(all_text), ]))) {
    all_text <- all_text[-nrow(all_text), , drop = FALSE]
  }

  first_column <- trimws(as.character(all_text[[1]]))
  header_row <- which(
    !is.na(first_column) &
      grepl("^(foodex )?code$", first_column, ignore.case = TRUE)
  )[1]
  if (is.na(header_row)) {
    stop("Could not find a code header in ", input_path, " / ", sheet_name)
  }

  data <- read_excel(
    input_path,
    sheet = sheet_name,
    skip = header_row,
    col_names = FALSE,
    .name_repair = "minimal"
  )
  list(
    header = all_text[seq_len(header_row), , drop = FALSE],
    data = data
  )
}

write_sheet_parts <- function(wb, sheet_name, parts) {
  addWorksheet(wb, sheet_name)

  walk(seq_len(nrow(parts$header)), function(row) {
    if (all(is.na(parts$header[row, ]))) {
      setRowHeights(wb, sheet_name, rows = row, heights = 15)
      writeData(
        wb, sheet_name, "", startCol = 1, startRow = row, colNames = FALSE
      )
    }
    walk(seq_len(ncol(parts$header)), function(col) {
      value <- parts$header[[row, col]]
      if (!is.na(value)) {
        writeData(
          wb, sheet_name, value,
          startCol = col, startRow = row, colNames = FALSE
        )
      }
    })
  })

  writeData(
    wb, sheet_name, parts$data,
    startRow = nrow(parts$header) + 1,
    colNames = FALSE
  )
}

output_dir <- "./2 - Livestock"
input_dir <- path(output_dir, "original-files")
if (!dir_exists(input_dir)) stop("No directory for input files found.")

walk(list.files(input_dir, pattern = "^[^~$].*[.]xlsx$"), function(file_name) {
  input_path <- path(input_dir, file_name)
  available <- excel_sheets(input_path)
  sheets_to_keep <- grep(
    "^(Footprints, per kg|GHG det, per kg)",
    available,
    value = TRUE
  )

  if (!length(sheets_to_keep)) {
    warning("No output sheets found in ", file_name)
    return()
  }

  if (length(sheets_to_keep) == length(available)) {
    warning("Skipping file, no need to flatten ", file_name)
    return()
  }

  sheets_parts <- map(
    sheets_to_keep,
    ~ read_sheet_parts(input_path, .x)
  )

  wb <- createWorkbook()
  walk2(
    sheets_parts,
    sheets_to_keep,
    ~ write_sheet_parts(wb, .y, .x)
  )
  saveWorkbook(wb, path(output_dir, file_name), overwrite = TRUE)

  message(
    "Wrote ", path(output_dir, file_name),
    " (sheets: ", paste(sheets_to_keep, collapse = ", "), ")"
  )
})
