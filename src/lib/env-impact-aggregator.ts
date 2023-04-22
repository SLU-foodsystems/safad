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

type EnvImpactEntry = { [originCode: string]: EnvFactors };
interface EnvImpacts {
  [rpcCode: string]: EnvImpactEntry;
}

interface RPCFactors {
  [rpcCode: string]: {
    [originCode: string]: [number, number];
  };
}

// TODO: This function could also take a diet and adapt it to that. It would be
// more efficient to _only_ compute the factors for a subset, but I doubt it
// makes any noticable performance difference in the end, we would have to
// recompute this or keep track of when the set of RPCs change.
export default function aggregate(
  envImpactSheet: EnvImpacts,
  rpcFactors: RPCFactors
): EnvImpacts {
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

    const joinedEnvFactors: EnvFactors = Object.keys(originFactors)
      .map((origin) => {
        const [percentage, waste] = originFactors[origin];
        const wasteChangeFactor = (100 - waste) / 100;
        const ratio = percentage / 100;
        return envImpacts[origin].map(
          (x) => (ratio * x) / wasteChangeFactor
        ) as EnvFactors;
      })
      .reduce(
        (a, b) => a.map((x, i) => x + b[i]) as EnvFactors,
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      );

    return [rpcCode, joinedEnvFactors];
  });

  return Object.fromEntries(entries);
}
