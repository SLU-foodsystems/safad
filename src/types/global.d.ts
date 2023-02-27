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
}
