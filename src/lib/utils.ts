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

function aggregateBy<T>(
  map: Record<string, T>,
  grouper: (k: string) => string,
  aggregator: (v1: T, v2: T) => T
): Record<string, T> {
  const result: Record<string, T> = {};

  Object.entries(map).forEach(([k, v]) => {
    const newKey = grouper(k);
    if (!(newKey in result)) {
      result[newKey] = v;
    } else {
      result[newKey] = aggregator(result[newKey], v);
    }
  });

  return result;
}

/**
 * Aggergate or sum over rpc categories to the fist level (e.g. A01).
 */
export function aggregateRpcCategories(rpcMap: Record<string, number[]>) {
  return aggregateBy<number[]>(
    rpcMap,
    (code) => code.substring(0, 4),
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
export const maybeQuoteValue = (str: string, delim = ",") =>
  str && str.includes(delim) ? `"${str}"` : str;
