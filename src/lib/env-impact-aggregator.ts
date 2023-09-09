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
  envImpactSheet: EnvFactors,
  rpcFactors: RpcFactors,
  mode: "organic" | "conventional"
): EnvImpacts {
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

  const suaCodes = Object.keys(envImpactSheet);

  const entries = suaCodes
    .map((suaCode) => {
      const envImpacts = envImpactSheet[suaCode];
      const originFactors = rpcFactors[suaCode];

      if (!originFactors) {
        console.warn(`No origin factors found for SUA ${suaCode}`);
        return null;
      }

      const joinedEnvFactors = Object.keys(originFactors)
        .map((origin) => {
          const [shareRatio, waste, organic] = originFactors[origin];
          const wasteChangeFactor = 1 / (1 - waste);
          const organicRatio = mode === "organic" ? organic : 1 - organic;

          const ratio = shareRatio * organicRatio * wasteChangeFactor;
          if (!envImpacts[origin]) {
            origin = "RoW";
          }
          return envImpacts[origin].map((x) => ratio * x);
        })
        .reduce((a, b) => a.map((x, i) => x + b[i]), ENV_IMPACTS_ZERO);

      return [suaCode, joinedEnvFactors];
    })
    .filter((x) => x !== null)
    .map((x) => x!);

  return Object.fromEntries(entries!);
}
