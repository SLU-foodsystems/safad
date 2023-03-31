import baseValues from "../data/original-values";

import computeResults from "./results-computation-engine";

type EnvFactorsMatrix = Record<string, Record<string, EnvFactors>>;
type NutrFactorsMatrix = Record<string, NutrFactors>;

class ResultsManager {
  // Environmental factors by fbs and origin
  envFactors: null | EnvFactorsMatrix;
  nutrFactors: null | NutrFactorsMatrix;

  constructor() {
    this.envFactors = null;
    this.nutrFactors = null;
  }

  // TODO: need some sort of check to make sure they match!
  setEnvironmentalFactors(envFactors: EnvFactorsMatrix) {
    this.envFactors = envFactors;
  }

  setNutritionalFactors(nutrFactors: NutrFactorsMatrix) {
    this.nutrFactors = nutrFactors;
  }

  // TODO: Should be 'BaseValues' as a type, once we get organic in here
  compute(values: {
    amount: Record<string, number>;
    factors: Record<string, Factors>;
    origin: Record<string, OriginMap>;
  }) {
    if (!this.envFactors || !this.nutrFactors) {
      throw new Error("Env- or nutrient factors were unset");
    }

    const environmentalFactors = this.envFactors;
    const nutritionalFactors = this.nutrFactors;
    return computeResults(values, { environmentalFactors, nutritionalFactors });
  }
}

const singleton = new ResultsManager();
export default singleton;
