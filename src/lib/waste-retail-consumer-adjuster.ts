import { getRpcCodeSubset } from "@/lib/utils";

export default function adjustDietForWaste(
  diet: Diet,
  waste: Record<string, number[]>
): Diet {
  return diet.map(([code, amount]) => {
    // Get the level 2 code, and make sure it's on A and not I
    const l2Code = getRpcCodeSubset(code, 2).replace("I", "A");
    const [retailWaste, consumerWaste] = waste[l2Code] || [0, 0];
    // TODO: Some sanity-checks could be made here, e.g. like negative or more
    // than 100% wastes
    const wasteChangeFactor = 1 / ((1 - retailWaste) * (1 - consumerWaste));
    return [code, amount * wasteChangeFactor];
  });
}
