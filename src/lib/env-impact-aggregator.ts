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

// TODO: This function could also take a diet and compute the env impact
// directly, i.e. only computing the factors for the RPCs that are actually
// included in the diet, rather than for all of them. This would be more
// efficient, but I doubt this is the bottleneck. We can see later.
export default function aggregate(
  envImpactSheet: EnvOriginFactors,
  rpcFactors: RpcFactors,
  mode: "organic" | "conventional"
): EnvFootprints {
  // Idea: Increase impact to account for waste.
  //    - Downside: we won't be able to say "environmental impact from waste"
  //    - (unless we outpt with and without waste fore very item?)
  //
  // Input:
  //  - env impact sheet ((rpc, country) -> impacts)
  //  - country distribution: ((rpc, country) -> (ratio, waste))
  //
  // Output:
  //  - (rpc -> env)

  const rpcCodes = Object.keys(envImpactSheet);

  const entries = rpcCodes.map((rpcCode) => {
    const envImpacts = envImpactSheet[rpcCode];
    const originFactors = rpcFactors[rpcCode];

    // TODO: Think about how to handle the organic %-age here.
    const joinedEnvFactors = Object.keys(originFactors)
      .map((origin) => {
        const [percentage, waste, organic] = originFactors[origin];
        const wasteChangeFactor = 1 / ((100 - waste) / 100);
        const organicRatio = mode === "organic"
          ? organic / 100
          : (100 - organic) / 100;
        const shareRatio = (percentage / 100);

        const ratio = shareRatio * organicRatio * wasteChangeFactor;
        return envImpacts[origin].map((x) => ratio * x);
      })
      .reduce(
        (a, b) => a.map((x, i) => x + b[i]),
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      );

    return [rpcCode, joinedEnvFactors];
  });

  return Object.fromEntries(entries);
}
