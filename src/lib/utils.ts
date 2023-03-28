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

// Generate a random sequence of alphanumeric characters
export const generateRandomId = (): string =>
  Math.random().toString(36).substring(2, 9);

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
