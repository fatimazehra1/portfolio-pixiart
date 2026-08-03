/**
 * The Day/Night system — six authored looks, and the cycle between them.
 *
 * `ColorPresets` is where every colour in the world is decided;
 * `PaletteInterpolator` expands those decisions into what the renderers want;
 * `DayNightSystem` turns a moment into a crossing between two of them; and
 * `DayNightManager` pushes that into the sky, the sea and the land.
 *
 * The clock is the single source of truth and this only ever reacts to it.
 * Import from "@/engine/dayNight".
 */
export { DayNightSystem } from "./DayNightSystem";
export { DayNightManager } from "./DayNightManager";
export { COLOR_PRESETS } from "./ColorPresets";
export {
  DAY_NIGHT_SETTINGS,
  SKY_STOP_POSITIONS,
} from "./DayNightConfig";
export {
  toPalettes,
  toSkyPalette,
  toOceanPalette,
  toGroundPalette,
} from "./PaletteInterpolator";
export type {
  BodyAnchors,
  DayNightSettings,
  PhasePreset,
  SkyAnchors,
} from "./DayNightConfig";
export type { PhasePalettes } from "./PaletteInterpolator";
export type { DayNightListener, DayNightState } from "./DayNightSystem";
export type {
  DayNightManagerOptions,
  PaletteTarget,
  TimeSource,
} from "./DayNightManager";
