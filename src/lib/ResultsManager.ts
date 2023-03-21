import baseValues from "../data/original-values";

import computeResults from "./results-computation-engine";

type EnvFactorsMatrix = Record<string, Record<string, EnvFactors>>;
type NutrFactorsMatrix = Record<string, NutrFactors>;

class StatefulResultsManager {
  // Environmental factors by fbs and origin
  envFactors: EnvFactorsMatrix;
  nutrFactors: NutrFactorsMatrix;

  constructor(envFactors: EnvFactorsMatrix, nutrFactors: NutrFactorsMatrix) {
    this.envFactors = envFactors;
    this.nutrFactors = nutrFactors;
  }

  // TODO: Should be 'BaseValues' as a type, once we get organic in here
  compute(values: {
    amount: Record<string, number>;
    factors: Record<string, Factors>;
    origin: Record<string, OriginMap>;
  }) {
    const environmentalFactors = this.envFactors;
    const nutritionalFactors = this.nutrFactors;
    return computeResults(values, { environmentalFactors, nutritionalFactors });
  }
}

const singleton = new StatefulResultsManager(
  Object.fromEntries(
    Object.entries(baseValues.origin).map(([fbsId, originMap]) => [
      fbsId,
      Object.fromEntries(
        Object.keys(originMap as OriginMap).map((country) => [
          country,
          Array.from({ length: 10 }).map(
            (_) => 0.5 + Math.random()
          ) as EnvFactors,
        ])
      ),
    ])
  ),
  Object.fromEntries(
    Object.keys(baseValues.amount).map((suaId) => [
      suaId,
      Array.from({ length: 36 }).map((_) => 0.5 + Math.random()) as NutrFactors,
    ])
  )
);
export default singleton;
