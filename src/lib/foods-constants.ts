import foodsData from "../data/foods.json";

export const data = foodsData.data as EAT[];

// IDs
export const eatIds = data.map((eat) => eat.id);
export const fbsIds = data.flatMap((eat) => eat.fbs.map((fbs) => fbs.id));
export const suaIds = data.flatMap((eat) =>
  eat.fbs.flatMap((fbs) => fbs.sua.map((sua) => sua.id))
);

const suaToFbsMap = new Map();
data.forEach((eat) => {
  eat.fbs.forEach((fbs) => {
    fbs.sua.forEach((sua) => {
      suaToFbsMap.set(sua.id, fbs.id);
    });
  });
});

/**
 * Get the FBS id that a given SUA id belongs to
 */
export const suaToFbsId = (suaId: string) => suaToFbsMap.get(suaId);

export function applyOverrides(
  factorsOverridesMode: "relative" | "absolute",
  factorsOverrides: Record<keyof Factors, number | null>,
  factorsValues: Record<string, Factors>
): Record<string, Factors> {
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
