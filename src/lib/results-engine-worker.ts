import * as Comlink from "comlink";
import ResultsEngine from "@/lib/ResultsEngine";

const RE = new ResultsEngine();

export type T = typeof RE;

Comlink.expose(RE);
