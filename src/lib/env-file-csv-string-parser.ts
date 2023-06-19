import { ENV_IMPACTS_ZERO } from "./constants";

/**
 * Split a csv-document into a 2d-array, while ignoring any delimiter-
 * occurances inside double-quotes.
 *
 * e.g. 'hello, world, 3, "foo, bar", 10' ->
 *      [['hello', 'world', 3, 'foo, bar', 10]]
 */
function csvToArr(str: string, delim = ","): string[][] {
  let line = [""];
  const ret = [line];
  let quote = false;

  for (let i = 0; i < str.length; i++) {
    const cur = str[i];
    const next = str[i + 1];

    if (!quote) {
      const cellIsEmpty = line[line.length - 1].length === 0;
      if (cur === '"' && cellIsEmpty) quote = true;
      else if (cur === delim) line.push("");
      else if (cur === "\r" && next === "\n") {
        line = [""];
        ret.push(line);
        i++;
      } else if (cur === "\n" || cur === "\r") {
        line = [""];
        ret.push(line);
      } else line[line.length - 1] += cur;
    } else {
      if (cur === '"' && next === '"') {
        line[line.length - 1] += cur;
        i++;
      } else if (cur === '"') quote = false;
      else line[line.length - 1] += cur;
    }
  }
  return ret;
}

export default function main(csvString: string) {
  const data = csvToArr(csvString);
  const EXPECTED_LENGTH = 16;

  const structured = {} as EnvFactors;

  data
    .filter((x) => x.length > 1)
    .forEach(
      ([
        _i,
        code,
        _name,
        _category,
        originName,
        _originCode,
        ...impactsStr
      ]) => {
        // Handle the base-case, i.e. the initial acc.
        if (!(code in structured)) {
          structured[code] = {};
        }

        if (originName.toLowerCase().trim() === "Rest of world") {
          originName = "RoW";
        }

        structured[code][originName] = impactsStr.map((x) => {
          const val = parseFloat(x);
          return Number.isNaN(val) ? 0 : val;
        });

        while (structured[code][originName].length < EXPECTED_LENGTH) {
          structured[code][originName].push(0);
        }
      }
    );

  // Set RoW to be the average
  Object.entries(structured).forEach(([suaCode, footprintsPerOrigin]) => {
    const numberOfOrigins = Object.values(footprintsPerOrigin).length;
    const average = Object.values(footprintsPerOrigin)
      .reduce(
        (acc, footprints) => acc.map((x, i) => x + footprints[i]),
        ENV_IMPACTS_ZERO
      )
      .map((x: number) => x / numberOfOrigins);

    structured[suaCode].RoW = average;
  });

  return structured;
}
