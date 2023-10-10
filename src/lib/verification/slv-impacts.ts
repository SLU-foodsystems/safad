/**
 * Computes the footprints of each rpc in the recipe.
 */

import { AGGREGATE_HEADERS, aggregateImpacts } from "@/lib/impacts-csv-utils";

import allEnvImpactsJson from "@/data/env-factors.json";
import slvNamesJson from "@/data/slv-names.json";

import swedenRpcFactors from "@/data/rpc-parameters/Sweden-rpc.json";
import slvRecipesJson from "@/data/slv-diet.json";
import rpcNamesJson from "@/data/rpc-names.json";

import ResultsEngine from "@/lib/ResultsEngine";
import { ENV_IMPACTS_ZERO } from "../constants";
import { computeProcessImpacts } from "../process-emissions";

const allEnvImpacts = allEnvImpactsJson.data as unknown as EnvFactors;
const rpcFile = swedenRpcFactors.data as unknown as RpcFactors;
const rpcNames = rpcNamesJson as Record<string, string>;
const slvNames = slvNamesJson as Record<string, string>;

const slvRecipes = slvRecipesJson as unknown as Record<
  string,
  [string, string, string, number, { [code: string]: number }][]
>;

const maybeQuote = (str: string) => (str.includes(",") ? `"${str}"` : str);

const addProcesses = (
  processImpacts: Record<string, Record<string, number[]>>,
  processAmounts: Record<string, number>,
  RE: ResultsEngine
): Record<string, Record<string, number[]>> => {
  const hasProcesses = Object.keys(processAmounts).length > 0;
  if (!hasProcesses) return processImpacts;

  const impactsCopy = { ...processImpacts };

  // Compte the env. impacts of the additional, slv processes. This is
  // a bit hacky, as we're reaching into the RE for its
  // processEnvFactors. Sorry about that :)
  const slvProcessesImpacts = computeProcessImpacts(
    { foo: processAmounts },
    RE.processEnvFactors!
  ).foo;

  // The key "A.00" does not matter - that information is not used,
  // but it's needed for the structure (i.e. { [string]: impacts })
  Object.assign(impactsCopy, { "A.00": slvProcessesImpacts });
  return impactsCopy;
};

export default async function computeSlvImpacts(): Promise<string> {
  const RE = new ResultsEngine();
  RE.setEnvFactors(allEnvImpacts);
  RE.setCountry("Sweden");
  RE.setRpcFactors(rpcFile);

  const headerStr =
    "SLV Code,SLV Name,Ingredient Code,Ingredient Name,Net Amount (g)," +
    AGGREGATE_HEADERS.join(",");

  const data = Object.entries(slvRecipes).map(([slvCode, ingredients]) => {
    const BASE_AMOUNT = 1000; // grams, = 1 kg
    const slvName = maybeQuote(slvNames[slvCode]);

    const slvProcesses: { [facet: string]: number } = {};
    ingredients.forEach(([_i1Code, _i1Amount, _rpcCode, processes]) =>
      Object.entries(processes).forEach(([facet, perc]) => {
        slvProcesses[facet] = (slvProcesses[facet] || 0) + perc * BASE_AMOUNT;
      })
    );

    // Now, compute the impact of each diet element seperately
    const disaggregateImpacts = ingredients.map(
      ([i1Code, i1Amount, rpcCode, percAmount, processes]) => {
        const impacts = RE.computeImpacts([
          {
            code: rpcCode,
            amount: percAmount * BASE_AMOUNT,
            // TODO: Bring waste into here!
            retailWaste: 0,
            consumerWaste: 0,
          },
        ]);
        let impactsVector = ENV_IMPACTS_ZERO;
        if (impacts !== null) {
          const processImpacts = addProcesses(impacts[1], processes, RE);
          impactsVector = aggregateImpacts(
            impacts[0],
            processImpacts,
            impacts[2],
            impacts[3]
          );
        }

        const i1Name = maybeQuote(rpcNames[i1Code] || "(Name not found)");
        return [slvCode, slvName, i1Code, i1Name, i1Amount, ...impactsVector];
      }
    );

    // And, for good measure, we compute the total impacts as well (should be
    // the sum of the disaggregate ones, but we will also add the processes to
    // it below.)
    const totalImpacts = RE.computeImpacts(
      ingredients.map(([_i1Code, _i1Amount, rpcCode, percAmount]) => ({
        code: rpcCode,
        amount: percAmount * BASE_AMOUNT,
        // TODO: Bring waste into here!
        retailWaste: 0,
        consumerWaste: 0,
      }))
    );
    if (totalImpacts === null) return [[]];

    let totalProcessImpacts = totalImpacts[1];

    const impactsVector = aggregateImpacts(
      totalImpacts[0],
      addProcesses(totalProcessImpacts, slvProcesses, RE),
      totalImpacts[2],
      totalImpacts[3]
    );

    return [
      [slvCode, slvName, slvCode, "(total)", 1000, ...impactsVector],
      ...disaggregateImpacts,
    ];
  });

  return (
    headerStr +
    "\n" +
    data.map((rows) => rows.map((row) => row.join(",")).join("\n")).join("\n")
  );
}
