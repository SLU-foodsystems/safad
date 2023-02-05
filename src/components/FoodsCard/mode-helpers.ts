import { average, sum, toPrecision } from "@/lib/utils";
type Mode = "amount" | "percentage";

export function isMode(value: any): value is Mode {
  switch (value) {
    case "amount":
    case "percentage":
      return true;
    default:
      return false;
  }
}

export function unit(mode: Mode, short = false) {
  switch (mode) {
    case "amount":
      return short ? "g" : "g/day";
    case "percentage":
      return "%";
  }
}

export function limits(mode: Mode): [number, number] {
  switch (mode) {
    case "amount":
      return [0, Number.POSITIVE_INFINITY];
    case "percentage":
      return [0, 100];
  }
}

export function aggregate(values: number[], mode: Mode): number {
  switch (mode) {
    case "amount":
      return toPrecision(sum(values));
    case "percentage":
      return toPrecision(average(values));
  }
}

export default {};
