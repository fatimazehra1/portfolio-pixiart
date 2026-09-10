/**
 * The Sky system — a reusable, self-contained pixel-art sky.
 *
 * Drop `SkySystem` behind any Pixi scene: it owns its own gradient, clouds,
 * sun, moon and horizon haze, and needs nothing from the rest of the world.
 * Import from "@/engine/sky".
 */
export { SkySystem } from "./SkySystem";
export { SkyGradient } from "./SkyGradient";
export { CloudLayer } from "./CloudLayer";
export { BirdFlock } from "./BirdFlock";
export { CelestialBody } from "./CelestialBody";
export { HorizonHaze } from "./HorizonHaze";
export {
  SKY_PRESETS,
  DEFAULT_TIME_OF_DAY,
  lerpPalette,
  lerpColor,
  sampleGradient,
} from "./palette";
export type { CloudShapeTextures, GlowOptions } from "./textures";
export type {
  BirdTone,
  CelestialField,
  CelestialState,
  CloudLayerConfig,
  CloudTones,
  GradientStop,
  SkyPalette,
  SkySystemOptions,
  TimeOfDay,
} from "./types";
export { FULL_CELESTIAL_FIELD } from "./types";
