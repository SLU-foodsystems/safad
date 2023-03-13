export const FACTORS: (keyof Factors)[] = [
  "productionWaste",
  "retailWaste",
  "consumerWaste",
  "technicalImprovement",
];

export const FACTOR_LABELS: Record<keyof Factors, string> = {
  productionWaste: "Production Waste",
  consumerWaste: "Consumer Waste",
  retailWaste: "Retail Waste",
  technicalImprovement: "Technical Improvement",
};
