import { asCsvString, readCsv } from "../utils.mjs";

function groupBy(getKey, items) {
  const result = {};
  items.forEach((item) => {
    const k = getKey(item);
    if (k in result) {
      result[k].push(item);
    } else {
      result[k] = [item];
    }
  });

  return result;
}

function main(args) {
  if (args.length !== 2) {
    throw new Error(
      "Expected exactly two arguments: <existing-file> <new-lines>"
    );
  }

  const [header, ...existingEntries] = readCsv(args[0]);
  const newEntries = readCsv(args[1]).slice(1);

  console.error(
    "Number of codes: " +
    new Set(existingEntries.map(r => r[0])).size
  )

  const newEntriesCodes = new Set(newEntries.map((x) => x[0]));
  const newEntriesGrouped = groupBy((row) => row[0], newEntries);

  let lastCode = null;
  const mergedFile = existingEntries.reduce((acc, curr) => {
    const code = curr[0];

    if (newEntriesCodes.has(code)) {
      if (code !== lastCode) {
        acc.push(...newEntriesGrouped[code]);
        delete newEntriesGrouped[code];
      } // else skip
    } else {
      acc.push(curr);
    }

    lastCode = code;
    return acc;
  }, []);

  const remainingCodes = Object.keys(newEntriesGrouped);
  if (remainingCodes.length > 0) {
    console.error(
      "ERR: Some codes in the new-entries file were not handled in the existing-entries file.\n\tCodes: " +
        remainingCodes.join(", ") +
        "\n"
    );
  }

  console.log(
    asCsvString([header, ...mergedFile], {
      NEWLINE: "\n",
      withBOM: true,
    })
  );
}

main(process.argv.slice(2));
