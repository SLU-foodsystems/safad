import { suaToFbsId } from "./foods-constants";

const ENV_FACTORS_ZERO = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

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

/*
 {
    [fbsId]: {
      [country]: {
        [...envFactors]: number,
      }
    }
 }
*/

type EnvFactors = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];

function sumEnvFactors(
  grossFbsAmounts: Record<string, number>,
  originValues: Record<string, OriginMap>
) {
  // Let's pretend we have values here
  const envFactors = {} as Record<string, Record<string, EnvFactors>>;

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
            (curr, prev) => prev.map((val, i) => val + curr[i]),
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

// TODO: Continue from here
export function main({
  amountValues,
  factors,
  originValues,
}: {
  amountValues: Record<string, number>;
  factors: Record<string, Factors>;
  originValues: Record<string, OriginMap>;
}) {
  const grossAmounts = getGrossAmounts(amountValues, factors);
  const grossFbsAmounts = getFbsLevelAmounts(grossAmounts);

  const netFbsAmounts = getFbsLevelAmounts(amountValues);

  const [envImpactByFbs, envImpactsSum] = sumEnvFactors(
    grossFbsAmounts,
    originValues
  );



  // For now, just return the sum of the overall environmental impacts.

  console.log(envImpactByFbs);
  console.log(envImpactsSum);

  // I need a json (from csv) with each <id, country, ....envFactors>
}
