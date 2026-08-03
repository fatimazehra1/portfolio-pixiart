/**
 * The Ocean system — a reusable, self-contained pixel-art sea.
 *
 * Drop `Ocean` in front of the sky: it owns its water body, five swells, the
 * sun's reflection and the foam line, and takes nothing from the rest of the
 * world but a time of day. Import from "@/engine/ocean".
 */
export { Ocean } from "./Ocean";
export { WaveLayer } from "./WaveLayer";
export { FoamLayer } from "./FoamLayer";
export { ReflectionLayer } from "./ReflectionLayer";
export {
  OCEAN_LAYERS,
  DEFAULT_MODIFIERS,
  DEFAULT_COVERAGE,
  WATER_RAMP_STEPS,
  deriveOceanPalette,
  lerpOceanPalette,
  waterAt,
} from "./OceanConfig";
export type {
  Harmonic,
  OceanModifiers,
  OceanOptions,
  OceanPalette,
  ShimmerTone,
  WaveLayerConfig,
} from "./OceanConfig";
export type { WaveTextures } from "./textures";
