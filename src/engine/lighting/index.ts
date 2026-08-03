/**
 * The Lighting system — the global reading of how lit the world is.
 *
 * `LightPresets` is where the light of each phase is authored;
 * `LightingSystem` interpolates between two of them and publishes the result;
 * `LightingManager` connects it to the day/night cycle.
 *
 * It lights nothing itself. The sky, sea and land are already lit by the cycle,
 * and every future light source — a lantern, a window, a beam — is a consumer
 * of what this publishes. Import from "@/engine/lighting".
 */
export { LightingSystem, applyAmbient, localIntensity } from "./LightingSystem";
export { LightingManager } from "./LightingManager";
export { LIGHT_PRESETS } from "./LightPresets";
export { LIGHTING_SETTINGS } from "./LightingConfig";
export type {
  LightPreset,
  LightingListener,
  LightingSettings,
  LightingState,
} from "./LightingConfig";
export type { DayNightSource, LightingManagerOptions } from "./LightingManager";
