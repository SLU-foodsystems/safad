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
