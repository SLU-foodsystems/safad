/**
 * Sum over a list of numbers, assuming none are NaN
 */
export function sum(numbers: number[]) {
  return numbers.reduce((a, b) => a + b, 0);
}

/**
 * Get the average value over a list of numbers, assuming none are NaN
 */
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

// From a list of ids and a function F, give a Record<id, F()> map
export const generateIdValueMap = <T>(ids: string[], defaultValue: () => T) =>
  Object.fromEntries(ids.map((id) => [id, defaultValue()]));

// Generate a random sequence of alphanumeric characters
export const generateRandomId = (): string =>
  Math.random().toString(36).substring(2, 9);

// Partition an array into two based on a predicate
// e.g. ([1, 2, 3, 4], isEven) -> [[2, 4], [1, 3]]
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
    [[], []] // First list are elements that fulfill predicate, second not
  );

/**
 * Apply a set of factors overrides (values with mode, relative or absolute)
 * to a list of factors, giving a 'flattened' list of factors.
 */
export function applyFactorsOverrides(
  factorsOverridesMode: "relative" | "absolute",
  factorsOverrides: Record<keyof Factors, number | null>,
  factorsValues: Record<string, Factors>
): Record<string, Factors> {
  // Getter depending on mode
  let getFactor: (factors: Factors, factor: keyof Factors) => number;

  if (factorsOverridesMode === "absolute") {
    getFactor = (factors: Factors, factor: keyof Factors) =>
      factorsOverrides[factor] || factors[factor];
  } else {
    getFactor = (factors: Factors, factor: keyof Factors) =>
      factorsOverrides[factor] === null
        ? factors[factor]
        : (factorsOverrides[factor]! * factors[factor]) / 100;
  }

  return Object.fromEntries(
    Object.entries(factorsValues).map(([fbsId, factors]) => [
      fbsId,
      {
        consumerWaste: getFactor(factors, "consumerWaste"),
        retailWaste: getFactor(factors, "retailWaste"),
        productionWaste: getFactor(factors, "productionWaste"),
        technicalImprovement: getFactor(factors, "technicalImprovement"),
      },
    ])
  );
}
