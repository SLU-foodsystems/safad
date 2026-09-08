import { watch, type Ref } from "vue";

import { COUNTRIES, MAX_SELECTED_FOODS } from "./constants";

export interface UrlState {
  country: string;
  foods: string[];
}

/**
 * Parse the app's state (country, selected foods) out of a URL hash.
 * Unknown or invalid values are omitted, rather than replaced by a default,
 * so the caller can fall back to its own default with `??`.
 */
export function parseUrlState(hash: string): Partial<UrlState> {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const state: Partial<UrlState> = {};

  const country = params.get("country")?.toUpperCase();
  if (country && country in COUNTRIES) {
    state.country = country;
  }

  const foodsParam = params.get("foods");
  if (foodsParam !== null) {
    const foods = [...new Set(foodsParam.split(",").map((code) => code.trim()).filter(Boolean))];
    state.foods = foods.slice(0, MAX_SELECTED_FOODS);
  }

  return state;
}

/**
 * Serialize the app's state into a URL hash (without the leading "#").
 * Commas in the foods list are kept literal, rather than percent-encoded,
 * to keep the URL readable.
 */
export function serializeUrlState(state: UrlState): string {
  const params = new URLSearchParams();
  params.set("country", state.country);
  params.set("foods", state.foods.join(","));
  return params.toString().replace(/%2C/g, ",");
}

/**
 * Read the current state from `window.location.hash`.
 */
export function readUrlState(): Partial<UrlState> {
  return parseUrlState(window.location.hash);
}

/**
 * Keep `window.location.hash` in sync with the given country/foods refs,
 * using `history.replaceState` so no new browser-history entries are
 * created.
 */
export function useUrlState(country: Ref<string>, foods: Ref<string[]>) {
  watch([country, foods], ([newCountry, newFoods]) => {
    const hash = serializeUrlState({ country: newCountry, foods: newFoods });
    history.replaceState(null, "", "#" + hash);
  });
}
