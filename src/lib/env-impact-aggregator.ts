/**
 * This file serves to aggregate environmental impacts across origins
 * to a single set of env impacts for each RPC.
 * In other words, it bundles the different origins based on their
 * share of the diet, as well as the assumed waste, to a single
 * list of factors.
 */

import { vectorsSum } from "./utils";

// TODO: This function could also take a diet and compute the env impact
// directly, i.e. only computing the factors for the RPCs that are actually
// included in the diet, rather than for all of them. This would be more
// efficient, but I doubt this is the bottleneck. We can see later.
//
// Input:
//  - env impact sheet ((rpc, country) -> impacts)
//  - country distribution: ((rpc, country) -> (ratio, waste))
//
// Output:
//  - (rpc -> env)
export default function flattenEnvironmentalFactors(
  envImpactSheet: RpcFootprintsByOrigin,
  rpcOriginWaste: RpcOriginWaste
): RpcFootprints {
  const rpcCodes = Object.keys(envImpactSheet);

  const entries = rpcCodes
    .map((rpcCode) => {
      const envImpacts = envImpactSheet[rpcCode];
      const originFactors = rpcOriginWaste[rpcCode];

      if (!originFactors) {
        console.warn(`No origin factors found for rpc ${rpcCode}`);
        return null;
      }

      const joinedEnvFactors = vectorsSum(
        Object.entries(originFactors).map(([origin, [shareRatio, waste]]) => {
          const wasteChangeFactor = 1 / (1 - waste);

          const ratio = shareRatio * wasteChangeFactor;
          // If envImpacts are missing for this origin, fall back to RoW
          if (!envImpacts[origin]) {
            origin = "RoW";
          }

          if (origin === "RoW" && !envImpacts[origin]) {
            console.error("RoW missing for rpc " + rpcCode);
          }
          return envImpacts[origin].map((x) => ratio * x);
        })
      );

      return [rpcCode, joinedEnvFactors];
    })
    .filter((x): x is [string, number[]] => x !== null);

  return Object.fromEntries(entries);
}
