import { average, sum, toPrecision } from "@/lib/utils";
export type Mode = "amount" | "factors" | "origin";

export function isMode(value: any): value is Mode {
  switch (value) {
    case "amount":
    case "factors":
    case "origin":
      return true;
    default:
      return false;
  }
}

export function unit(mode: Mode, short = false): string {
  switch (mode) {
    case "amount":
      return short ? "g" : "g/day";
    case "factors":
      return "%";
    case "origin":
      return "";
  }
}

export function limits(mode: Mode): [number, number] {
  switch (mode) {
    case "amount":
      return [0, Number.POSITIVE_INFINITY];
    case "origin":
    case "factors":
      return [0, 100];
  }
}

export function aggregate(values: number[], mode: Mode): number {
  switch (mode) {
    case "amount":
      return toPrecision(sum(values));
    case "factors":
      return toPrecision(average(values));
    case "origin":
      return 0;
  }
}

export default {};
