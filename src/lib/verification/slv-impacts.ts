/**
 * Computes the footprints of each rpc in the recipe.
 */

import { AGGREGATE_HEADERS, aggregateImpacts } from "@/lib/impacts-csv-utils";

import allEnvImpactsJson from "@/data/env-factors.json";
import slvNamesJson from "@/data/slv-names.json";

import swedenRpcFactors from "@/data/rpc-parameters/Sweden-rpc.json";
import slvRecipesJson from "@/data/slv-diet.json";
import rpcNamesJson from "@/data/rpc-names.json";
import wasteFactors from "@/data/waste-factors.json";

import ResultsEngine from "@/lib/ResultsEngine";
import { ENV_IMPACTS_ZERO } from "@/lib/constants";
import { computeProcessImpacts } from "@/lib/process-emissions";
import { getRpcCodeSubset, listAllProcesses } from "@/lib/utils";
import {
  emissionsFactorsEnergy,
  emissionsFactorsPackaging,
  emissionsFactorsTransport,
  processesAndPackagingData,
  processesEnergyDemands,
} from "../default-files-importer";

const allEnvImpacts = allEnvImpactsJson.data as unknown as EnvFactors;
const rpcFile = swedenRpcFactors.data as unknown as RpcFactors;
const rpcNames = rpcNamesJson as Record<string, string>;
const slvNames = slvNamesJson as Record<string, string>;
const swedenWasteFactors = wasteFactors.Sweden as Record<string, number[]>;

const slvRecipes = slvRecipesJson as unknown as Record<
  string,
  [string, string, number, number, string][]
>;

const getWaste = (rpcCode: string) => {
  const code = getRpcCodeSubset(rpcCode, 2);
  return swedenWasteFactors[code] || [0, 0];
};

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
  RE.setCountryCode("SE");
  RE.setRpcFactors(rpcFile);

  RE.setEmissionsFactorsPackaging(await emissionsFactorsPackaging());
  RE.setEmissionsFactorsEnergy(await emissionsFactorsEnergy());
  RE.setEmissionsFactorsTransport(await emissionsFactorsTransport());
  RE.setProcessesEnergyDemands(await processesEnergyDemands());
  RE.setProcessesAndPackaging(await processesAndPackagingData());

  const headerStr =
    "SLV Code,SLV Name,Ingredient Code,FoodEx2 code,Ingredient Name,Net Amount (g)," +
    AGGREGATE_HEADERS.join(",") +
    ",Processes,Packaging";

  const data = Object.entries(slvRecipes).map(([slvCode, ingredients]) => {
    const BASE_AMOUNT = 1000; // grams, = 1 kg
    const slvName = maybeQuote(slvNames[slvCode]);

    // Gather all slv-level processes
    const slvProcesses: { [process: string]: number } = {};
    ingredients.forEach(
      ([_code, _shortCode, _grossShare, netShare, process]) => {
        if (!process) return;
        slvProcesses[process] =
          (slvProcesses[process] || 0) + netShare * BASE_AMOUNT;
      }
    );

    // Now, compute the impact of each diet element seperately
    const disaggregateImpacts = ingredients.map(
      ([code, shortCode, grossShare, netShare, process]) => {
        const [retailWaste, consumerWaste] = getWaste(code);
        const netAmount = netShare * BASE_AMOUNT;
        const impacts = RE.computeImpacts([
          {
            code,
            amount: netAmount,
            retailWaste,
            consumerWaste,
          },
        ]);

        let impactsVector = ENV_IMPACTS_ZERO;
        let processes = "";
        let packaging = "";
        if (impacts !== null) {
          const processImpacts = addProcesses(
            impacts[1],
            process ? { [process]: netAmount } : {},
            RE
          );
          impactsVector = aggregateImpacts(
            impacts[0],
            processImpacts,
            impacts[2],
            impacts[3]
          );
          processes = listAllProcesses(processImpacts).join("$");
          packaging = listAllProcesses(impacts[2]).join("$");
        }

        const i1Name = maybeQuote(rpcNames[code] || "(Name not found)");
        return [
          slvCode,
          slvName,
          code,
          shortCode,
          i1Name,
          grossShare * BASE_AMOUNT,
          ...impactsVector,
          processes,
          packaging,
        ];
      }
    );

    // And, for good measure, we compute the total impacts as well (should be
    // the sum of the disaggregate ones, but we will also add the processes to
    // it below.)
    const totalImpacts = RE.computeImpacts(
      ingredients.map(([code, _i1ShortCode, _grossShare, netShare]) => ({
        code,
        amount: netShare * BASE_AMOUNT,
        retailWaste: getWaste(code)[0],
        consumerWaste: getWaste(code)[1],
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
      [slvCode, slvName, slvCode, "", "(total)", 1000, ...impactsVector],
      ...disaggregateImpacts,
    ];
  });

  return (
    headerStr +
    "\n" +
    data.map((rows) => rows.map((row) => row.join(",")).join("\n")).join("\n")
  );
}
