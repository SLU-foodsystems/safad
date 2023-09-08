/**
 * Compute the total amount (weight) of rpcs from each country,
 * given a list of RPCs and their factors (i.e. the import share)
 * Returns an object with countries as keys (incl. Domestic)
 */
export default function aggregateAmountsPerOrigin(
  rpcAmounts: [string, number][],
  rpcParameters: RpcFactors
) {
  // You can do a really fancy flatMap+reduce here, but it wouldn't be very readable.


  // Each country with the amount (in grams??)
  const results: Record<string, number> = {};

  rpcAmounts.forEach(([rpcCode, rpcAmount]) => {
    const factorsPerOrigin = rpcParameters[rpcCode];
    if (!factorsPerOrigin) {
      console.error(`No origin found for rpc-code ${rpcCode}.`);
      return;
    }

    Object.entries(factorsPerOrigin).map(([originName, factors]) => {
      const originAmount = factors[0] * rpcAmount;
      results[originName] = (results[originName] || 0) + originAmount;
    });
  });

  return results;
}
