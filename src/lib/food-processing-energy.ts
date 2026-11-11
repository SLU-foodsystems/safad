export type ProcessEnergy = Record<string, number[]>;
export type FoodProcessEnergy = Record<string, ProcessEnergy>;
export type FoodRecipeAmount = {
  component: string;
  grossAmount: number;
  reverseYield: number;
  netAmount: number;
  level: number;
};
export type FoodRecipeAmounts = Record<string, FoodRecipeAmount[]>;
export type FoodPreparationYields = Record<string, number | null>;

const cache = new WeakMap<
  FoodsRecipes,
  WeakMap<Record<string, number[]>, FoodProcessEnergy>
>();

const emptyEnergy = () => Array.from({ length: 9 }, () => 0);

const add = (target: number[], source: number[], multiplier = 1) =>
  source.forEach((value, index) => {
    target[index] = (target[index] || 0) + value * multiplier;
  });

const processCodes = (codes: string[]) =>
  codes.filter((code) => code.startsWith("F28."));

/**
 * Calculates process energy per kg of each food, retaining the process that
 * supplied each energy vector for the existing process breakdown.
 */
export function computeFoodProcessEnergy(
  recipes: FoodsRecipes,
  processEnergy: Record<string, number[]>
): FoodProcessEnergy {
  const cachedByEnergy = cache.get(recipes);
  const cached = cachedByEnergy?.get(processEnergy);
  if (cached) return cached;

  const memo = new Map<string, ProcessEnergy>();
  const active = new Set<string>();

  const process = (food: string): ProcessEnergy => {
    const cached = memo.get(food);
    if (cached) return cached;
    if (active.has(food)) {
      throw new Error(`Cycle in food processing recipe at ${food}.`);
    }

    const rows = recipes[food];
    if (!rows) return {};
    active.add(food);
    const result: ProcessEnergy = {};
    const addProcess = (code: string, multiplier: number) => {
      const value = processEnergy[code];
      if (!value) throw new Error(`Missing energy demand for process ${code}.`);
      if (!result[code]) result[code] = emptyEnergy();
      add(result[code]!, value, multiplier);
    };

    const preparation = (entry: FoodsRecipeElement) => {
      processCodes(entry[4] || []).forEach((code) =>
        addProcess(code, entry[5] || 0)
      );
    };

    rows.forEach((entry) => {
      const [
        component,
        facets,
        share,
        reverseYield,
        _prep,
        _prepYield,
        include,
      ] = entry;
      const weight = (share || 0) * (reverseYield || 1);
      processCodes(facets || []).forEach((code) => addProcess(code, weight));
      if (component !== food && recipes[component]) {
        const nested = process(component);
        Object.entries(nested).forEach(([code, value]) => {
          if (!result[code]) result[code] = emptyEnergy();
          add(result[code]!, value, weight);
        });
        if (include === false) {
          const componentPreparation = recipes[component]![0]!;
          processCodes(componentPreparation[4] || []).forEach((code) =>
            addProcess(code, -weight * (componentPreparation[5] || 0))
          );
        }
      }
    });

    preparation(rows[0]!);
    active.delete(food);
    memo.set(food, result);
    return result;
  };

  Object.keys(recipes).forEach(process);
  const result = Object.fromEntries(memo);
  if (cachedByEnergy) {
    cachedByEnergy.set(processEnergy, result);
  } else {
    cache.set(recipes, new WeakMap([[processEnergy, result]]));
  }
  return result;
}

export function computeFoodRecipeAmounts(
  recipes: FoodsRecipes,
  amountGram = 1000
): FoodRecipeAmounts {
  const result: FoodRecipeAmounts = {};
  const active = new Set<string>();

  const process = (
    food: string,
    amount: number,
    level: number,
    rootFood: string
  ) => {
    const rows = recipes[food];
    if (!rows || active.has(food)) return;

    active.add(food);
    rows.forEach(([component, _facets, share, reverseYield]) => {
      const grossAmount = amount * (share || 0);
      const yieldFactor = reverseYield || 1;
      const netAmount = grossAmount * yieldFactor;
      result[rootFood]!.push({
        component,
        grossAmount,
        reverseYield: yieldFactor,
        netAmount,
        level,
      });
      process(component, netAmount, level + 1, rootFood);
    });
    active.delete(food);
  };

  Object.keys(recipes).forEach((food) => {
    result[food] = [];
    process(food, amountGram, 0, food);
  });
  return result;
}

export function computeFoodPreparationYields(
  recipes: FoodsRecipes
): FoodPreparationYields {
  return Object.fromEntries(
    Object.entries(recipes).map(([food, rows]) => [
      food,
      rows[0]?.[5] ? rows[0][5] : null,
    ])
  );
}
