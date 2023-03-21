import { suaToFbsId } from "./foods-constants";

// If we think of this as a web-worker, we want to expose two functionalities,
// each with two modes.
//
// 'delta' / 'incremental': Send a delta-update, and use that + previous results
//                          to compute a change.
//                          - This could either work such that the worker holds
//                          the previous state, and computes the entire change,
//                          or that the callee sends "before" + "after" values.
// 'complete' / 'full': Send the entire diet
//
// We also want to be able to either recieve back the detailed results, or
// just the summary.
//
// Let's start with the 'complete' version, and see if we can implement the
// 'incremntal' mode later. Maybe the computations are so fast it's not really
// needed.

const ENV_FACTORS_ZERO: EnvFactors = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const NUTR_FACTORS_ZERO: NutrFactors = Array.from({ length: 36 }).map(
  (_) => 0
) as NutrFactors;

function getWasteChangeFactor(factors: Factors) {
  return (
    ((100 - factors.consumerWaste) *
      (100 - factors.productionWaste) *
      (100 - factors.retailWaste)) /
    1e6
  );
}

const getGrossAmounts = (
  amountValues: Record<string, number>,
  factors: Record<string, Factors>
) =>
  Object.fromEntries(
    Object.keys(amountValues).map((suaId) => {
      const fbsId = suaToFbsId(suaId);
      const changeFactor = getWasteChangeFactor(factors[fbsId]);
      return [suaId, (1 / changeFactor) * amountValues[suaId]];
    })
  );

// Compute the gross- and net fbs amounts by summing over the sua-levels
function getFbsLevelAmounts(amountValues: Record<string, number>) {
  const fbsAmounts: Record<string, number> = {};
  Object.keys(amountValues).forEach((suaId) => {
    const fbsId = suaToFbsId(suaId);
    if (fbsId in fbsAmounts) {
      fbsAmounts[fbsId] += amountValues[suaId];
    } else {
      fbsAmounts[fbsId] = amountValues[suaId];
    }
  });

  return fbsAmounts;
}

function sumNutritionalFactors(
  nutritionalFactors: Record<string, NutrFactors>,
  amounts: Record<string, number>
) {
  const nutritionalImpacts = Object.fromEntries(
    Object.keys(amounts).map((suaId) => [
      suaId,
      nutritionalFactors[suaId].map((val) => (val * amounts[suaId]) / 1e3),
    ])
  );

  // (acc, suaId) => acc.map((sum, i) => sum + nutritionalFactors[suaId][i] * amounts[suaId] / 1e3),
  const nutritionalImpactsSum = Object.values(nutritionalImpacts).reduce(
    (acc, curr) => curr.map((x, i) => x + acc[i]),
    NUTR_FACTORS_ZERO
  );

  return [nutritionalImpacts, nutritionalImpactsSum];
}

function sumEnvFactors(
  envFactors: Record<string, Record<string, EnvFactors>>,
  grossFbsAmounts: Record<string, number>,
  originValues: Record<string, OriginMap>
) {
  const envImpactByFbs = Object.entries(grossFbsAmounts).map(
    ([fbsId, amount]) => {
      const origins = Object.entries(originValues[fbsId]);
      return (
        origins
          // Multiply by amount (g -> kg)
          .map(([country, ratio]) =>
            envFactors[fbsId][country].map((x) => x * (amount / 1e3) * ratio)
          )
          // Join origins together
          .reduce(
            (acc, curr) => acc.map((val, i) => val + curr[i]),
            ENV_FACTORS_ZERO
          )
      );
    }
  );

  const envImpactsSum = Object.values(envImpactByFbs).reduce(
    (acc, prev) => prev.map((x, i) => x + acc[i]),
    ENV_FACTORS_ZERO
  );

  return [envImpactByFbs, envImpactsSum];
}

// TODO: if performance turns out to be critical, we could
// have a 'patch' function
export default function main(
  {
    amount,
    factors,
    origin,
  }: {
    amount: Record<string, number>;
    factors: Record<string, Factors>;
    origin: Record<string, OriginMap>;
  },
  {
    environmentalFactors,
    nutritionalFactors,
  }: {
    environmentalFactors: Record<string, Record<string, EnvFactors>>;
    nutritionalFactors: Record<string, NutrFactors>;
  }
) {
  const grossAmounts = getGrossAmounts(amount, factors);
  const grossFbsAmounts = getFbsLevelAmounts(grossAmounts);

  // Let's pretend we have values here
  const [envImpactByFbs, envImpactsSum] = sumEnvFactors(
    environmentalFactors,
    grossFbsAmounts,
    origin
  );

  const [nutritionalImpactsBySua, nutritionalImpactsSum] =
    sumNutritionalFactors(nutritionalFactors, amount);

  return {
    envImpactByFbs,
    envImpactsSum,
    nutritionalImpactsBySua,
    nutritionalImpactsSum,
  };
}
