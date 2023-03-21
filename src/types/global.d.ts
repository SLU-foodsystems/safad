export {}

type Tuple<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : _TupleOf<T, N, []>
  : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N
  ? R
  : _TupleOf<T, N, [T, ...R]>;

declare global {
  interface SUA {
    name: string;
    id: string;
  }

  interface FBS {
    name: string;
    id: string;
    sua: SUA[];
  }

  interface EAT {
    name: string;
    id: string;
    fbs: FBS[];
  }

  interface Factors {
    productionWaste: number;
    retailWaste: number;
    consumerWaste: number;
    technicalImprovement: number;
  }

  interface OriginMap {
    [k: string]: number;
  }

  interface BaseValues {
    amount: Record<string, number>;
    factors: Record<string, Factors>;
    origin: Record<string, OriginMap>;
    organic: Record<string, number>;
  }

  type EnvFactors = Tuple<number, 10>;
  type NutrFactors = Tuple<number, 36>; // yikes
}
