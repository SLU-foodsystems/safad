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
}
