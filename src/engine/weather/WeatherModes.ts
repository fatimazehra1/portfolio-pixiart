import type { WeatherKind } from "../scene";

/**
 * The weather a visitor can ask for, from the sky controls.
 *
 * `auto` is the world as authored: every scene's own climate, blended as you
 * walk (fog over the finished chapters, dust at the foundry, lightning at the
 * tent). Every other mode replaces that with one sky everywhere, until the
 * visitor puts it back. It is a view setting, like the hour, and it never
 * edits a scene.
 */
export type WeatherMode = "auto" | "clear" | "rain" | "storm" | "fog";

export const WEATHER_MODES: readonly WeatherMode[] = ["auto", "clear", "rain", "storm", "fog"];

/** What each non-auto mode actually runs, kind by intensity. */
export const WEATHER_MODE_MIX: Record<Exclude<WeatherMode, "auto">, ReadonlyMap<WeatherKind, number>> = {
  clear: new Map([["clear", 1]]),
  rain: new Map([["rain", 1]]),
  // Rain, a lower sky, and the flashes the tent already knows how to make.
  storm: new Map<WeatherKind, number>([
    ["rain", 1],
    ["fog", 0.35],
    ["lightning", 1],
  ]),
  fog: new Map([["fog", 1]]),
};

/** The mix for a mode, or null for `auto` (the scene decides). */
export function weatherMix(mode: WeatherMode): ReadonlyMap<WeatherKind, number> | null {
  return mode === "auto" ? null : WEATHER_MODE_MIX[mode];
}
