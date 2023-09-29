import orderedNames from "./ordered-names.json" assert { type: "json" };
import { readCsv } from "../utils.mjs";

const { names } = orderedNames;

function main() {
  const handledCodes = new Set();

  const nameToCodeMap = {};

  readCsv("./foodex-codes.csv")
    .slice(1)
    .map(([l1Code, l1Name, l2Code, l2Name, l3Code, l3Name, l4Code, l4Name]) => {
      [
        [l1Code, l1Name],
        [l2Code, l2Name],
        [l3Code, l3Name],
        [l4Code, l4Name],
      ]
        .map(([a, b]) => [a.trim(), b.trim()])
        .forEach(([code, name]) => {
          if (handledCodes.has(code)) return;
          handledCodes.add(code);
          nameToCodeMap[name] = code;
        });
    });

  const str = names.map((name) => nameToCodeMap[name.trim()] || "-").join("\n");
  console.log(str);
}

main(process.argv.slice(2));
