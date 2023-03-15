export {}

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
}
