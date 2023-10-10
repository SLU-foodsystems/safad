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

const slvRecipes = slvRecipesJson as Record<
  string,
  { rpcs: Record<string, number>; processes: Record<string, number> }
>;

const maybeQuote = (str: string) => (str.includes(",") ? `"${str}"` : str);

export default async function computeSlvImpacts(): Promise<string> {
  const RE = new ResultsEngine();
  RE.setEnvFactors(allEnvImpacts);
  RE.setCountry("Sweden");
  RE.setRpcFactors(rpcFile);

  const headerStr =
    "SLV Code,Sub-code,Name,Amount (g)," + AGGREGATE_HEADERS.join(",");

  return (
    headerStr +
    "\n" +
    Object.entries(slvRecipes)
      .map(([slvCode, { rpcs, processes: slvProcesses }]) => {
        const BASE_AMOUNT = 1000; // 1 kg

        const diet = Object.entries(rpcs).map(([code, percentage]) => ({
          code,
          amount: percentage * BASE_AMOUNT,
          retailWaste: 0,
          consumerWaste: 0,
        }));

        const disaggregateImpacts = diet.map((dietEl) => {
          const { code: foodExCode, amount } = dietEl;
          const impacts = RE.computeImpacts([dietEl]);
          const impactsVector =
            impacts === null ? ENV_IMPACTS_ZERO : aggregateImpacts(...impacts);

          const name = maybeQuote(rpcNames[foodExCode] || "(Name not found)");
          return [slvCode, foodExCode, name, amount, ...impactsVector];
        });

        const totalImpacts = RE.computeImpacts(diet);
        if (totalImpacts === null) return [[]];

        let totalProcessImpacts = totalImpacts[1];

        // If the breakdown from SLV to RPC foods includes processes, we want to
        // add those to the total process impacts
        const hasProcesses = Object.keys(slvProcesses).length > 0;
        if (hasProcesses) {
          // Compte the env. impacts of the additional, slv processes. This is
          // a bit hacky, as we're reaching into the RE for its
          // processEnvFactors. Sorry about that :)
          const slvProcessesImpacts = computeProcessImpacts(
            { processes: slvProcesses },
            RE.processEnvFactors!
          ).processes;

          // The key "A.00" does not matter - that information is not used,
          // but it's needed for the structure (i.e. { [string]: impacts })
          Object.assign(totalProcessImpacts, { "A.00": slvProcessesImpacts });
        }

        const impactsVector = aggregateImpacts(
          totalImpacts[0],
          totalProcessImpacts,
          totalImpacts[2],
          totalImpacts[3]
        );

        return [
          [
            slvCode,
            "(total)",
            maybeQuote(slvNames[slvCode]),
            1000,
            ...impactsVector,
          ],
          ...disaggregateImpacts,
        ];
      })
      .map((rows) => rows.map((row) => row.join(",")).join("\n"))
      .join("\n")
  );
}

// export default async function computeFootprintsForEachRpcWithOrigin(
//   envFactors?: EnvFactors
// ): Promise<string[][]> {
//   const HEADER = ["Category Code", "Category Name", ...AGGREGATE_HEADERS];
//   return (await computeFootprintsForDiets(envFactors)).map(
//     ([country, data]) => [
//       country,
//       HEADER + "\n" + data.map((row) => row.join(",")).join("\n"),
//     ]
//   );
// }
