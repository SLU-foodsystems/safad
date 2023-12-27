export function sum(numbers: number[]) {
  return numbers.reduce((a, b) => a + b, 0);
}

export function average(numbers: number[]) {
  if (numbers.length === 0) return 0;
  return sum(numbers) / numbers.length;
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

export const generateRandomId = (prefix: string) =>
  prefix + Math.floor(Math.random() * 1e8);

export const partition = <T>(array: T[], predicate: (el: T) => boolean) =>
  array.reduce(
    (lists: [T[], T[]], element: T) => {
      if (predicate(element) === true) {
        lists[0].push(element);
      } else {
        lists[1].push(element);
      }
      return lists;
    },
    [[], []]
  );

export function vectorSum(xs: number[], ys: number[]) {
  if (xs.length !== ys.length) {
    throw new Error("Expected vectors to be of same length.");
  }

  return xs.map((x, i) => x + ys[i]);
}

export function vectorsSum(lists: number[][]): number[] {
  if (lists.length === 0) return [];
  if (lists.length === 1) return lists[0];

  const [head, ...tail] = lists;
  return tail.reduce((acc, curr) => acc.map((x, i) => x + curr[i]), head);
}

export function aggregateBy<T>(
  entries: [string, T][],
  grouper: (k: string) => string,
  aggregator: (v1: T, v2: T) => T
): Record<string, T> {
  const result: Record<string, T> = {};

  entries.forEach(([k, v]) => {
    const newKey = grouper(k);
    if (!(newKey in result)) {
      result[newKey] = v;
    } else {
      result[newKey] = aggregator(result[newKey], v);
    }
  });

  return result;
}

export function getRpcCodeSubset(code: string, level: number) {
  if (!code) return "";
  const idx = nthIndexOf(code, ".", level);
  if (idx === -1) return code;
  const subset = code.substring(0, idx);
  return subset.replace("I", "A");
}

/**
 * Aggergate or sum over rpc categories to the fist level (e.g. A01).
 */
export function aggregateRpcCategories(
  rpcMap: Record<string, number[]>,
  level: number
) {
  return aggregateBy<number[]>(
    Object.entries(rpcMap),
    (code) => getRpcCodeSubset(code, level),
    (a: number[], b: number[]) => a.map((x, i) => x + b[i])
  );
}

export const replaceKeys = <V>(
  obj: Record<string, V>,
  replacement: Record<string, string>
): Record<string, V> =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [replacement[k], v]));

export const mapValues = <V, T>(
  object: Record<string, V>,
  fn: (x: V) => T
): Record<string, T> =>
  Object.fromEntries(Object.entries(object).map(([k, v]) => [k, fn(v)]));

/**
 * Wraps a string in double quotes if it contains a delimiter (default: comma).
 * This is useful when printing CSV files, to avoid breaking the format.
 */
export const maybeQuoteValue = (str: string, delim = ","): string =>
  str && str.includes(delim) ? `"${str}"` : str;

export const uniq = <T>(xs: T[]) => [...new Set(xs)];

export const stringifyCsvData = (data: string[][]) =>
  data.map((row) => row.join(",")).join("\n");

export const listAllProcesses = (data: NestedRecord<string, number[]>) =>
  uniq(
    Object.values(data)
      .map((obj) => Object.keys(obj))
      .flat(1)
  );

/**
 * Recursive function to find the nth index of a substring in a string.
 */
export const nthIndexOf = (
  string: string,
  searchString: string,
  nth: number,
  fromIndex = 0
): number => {
  const index = string.indexOf(searchString, fromIndex);

  if (index === -1) {
    return -1;
  }

  if (nth === 0) {
    return index;
  }

  return nthIndexOf(string, searchString, nth - 1, index + 1);
};

/**
 * Split a csv-document into a 2d-array, while ignoring any delimiter-
 * occurances inside double-quotes.
 *
 * e.g. 'hello, world, 3, "foo, bar", 10' ->
 *      [['hello', 'world', 3, 'foo, bar', 10]]
 */
interface ParseCsvFileOptions {
  delimiter: string;
  trim: boolean;
}
export function parseCsvFile(
  fileContent: string,
  optionOverrides: Partial<ParseCsvFileOptions> = {}
) {
  const options: ParseCsvFileOptions = {
    delimiter: ",",
    trim: true,
    ...optionOverrides,
  };

  let line = [""];
  const ret = [line];
  let quote = false;

  for (let i = 0; i < fileContent.length; i++) {
    const cur = fileContent[i];
    const next = fileContent[i + 1];

    if (!quote) {
      const cellIsEmpty = line[line.length - 1].length === 0;
      if (cur === '"' && cellIsEmpty) quote = true;
      else if (cur === options.delimiter) line.push("");
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

  if (options.trim) {
    return ret.map((row) => row.map((cell) => (cell || "").trim()));
  }

  return ret;
}

export function roundToPrecision(number: number, decimalPoints = 2) {
  const k = 10 ** decimalPoints;
  return Math.round(number * k) / k;
}
