/**
 * This file serves to aggregate environmental impacts across origins
 * to a single set of env impacts for each RPC.
 * In other words, it bundles the different origins based on their
 * share of the diet, as well as the assumed waste, to a single
 * list of factors.
 *
 * It may not semantically make sense to work with the share from each
 * origin at the same time as the waste.
 * However, this is because they are entered in the same file, on the same
 * level, and as such, it's a lot more convenient.
 */

import { ENV_IMPACTS_ZERO } from "./constants";

// TODO: This function could also take a diet and compute the env impact
// directly, i.e. only computing the factors for the RPCs that are actually
// included in the diet, rather than for all of them. This would be more
// efficient, but I doubt this is the bottleneck. We can see later.
export default function flattenEnvironmentalFactors(
  envImpactSheet: RpcFootprintsByOrigin,
  rpcOriginWaste: RpcOriginWaste
): RpcFootprints {
  // Idea: Increase impact to account for waste.
  //    - Downside: we won't be able to say "environmental impact from waste"
  //    - (unless we outpt with and without waste for every item?)
  //
  // Input:
  //  - env impact sheet ((rpc, country) -> impacts)
  //  - country distribution: ((rpc, country) -> (ratio, waste))
  //
  // Output:
  //  - (rpc -> env)

  const rpcCodes = Object.keys(envImpactSheet);

  const entries = rpcCodes
    .map((rpcCode) => {
      const envImpacts = envImpactSheet[rpcCode];
      const originFactors = rpcOriginWaste[rpcCode];

      if (!originFactors) {
        console.warn(`No origin factors found for rpc ${rpcCode}`);
        return null;
      }

      const joinedEnvFactors = Object.keys(originFactors)
        .map((origin) => {
          const [shareRatio, waste] = originFactors[origin];
          const wasteChangeFactor = 1 / (1 - waste);

          const ratio = shareRatio * wasteChangeFactor;
          if (!envImpacts[origin]) {
            origin = "RoW";
          }

          if (origin === "RoW" && !envImpacts[origin]) {
            console.error("RoW missing for rpc " + rpcCode);
          }
          return envImpacts[origin].map((x) => ratio * x);
        })
        .reduce((a, b) => a.map((x, i) => x + b[i]), ENV_IMPACTS_ZERO);

      return [rpcCode, joinedEnvFactors];
    })
    .filter((x): x is [string, number[]] => x !== null)

  return Object.fromEntries(entries);
}
