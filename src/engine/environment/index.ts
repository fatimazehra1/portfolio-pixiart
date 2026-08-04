/**
 * The Environment system — everything growing on, standing on, or washed up on
 * the shore.
 *
 * `EnvironmentConfig` is the planting scheme; `EnvironmentGenerator` decides
 * where everything stands, deterministically from a seed; `PropFactory` bakes
 * each drawing once and lends out the sprites; `Prop` is one placed thing and
 * the pooled view that shows it; and `Environment` is the system that puts those
 * together and keeps only what is on screen alive.
 *
 * Import from "@/engine/environment".
 */
export { Environment } from "./Environment";
export type { LightingSource } from "./Environment";
export { generate, standProps, countByKind } from "./EnvironmentGenerator";
export type { GenerateOptions } from "./EnvironmentGenerator";
export { PropFactory } from "./PropFactory";
export type { PropFactoryOptions } from "./PropFactory";
export { PropView } from "./Prop";
export type { Prop, PropTextures, ToneTextures } from "./Prop";
export {
  KINDS,
  KIND_TONES,
  PROP_KINDS,
  MATERIALS as PROP_MATERIALS,
  EMISSIVE as PROP_EMISSIVE,
  PETALS,
  FLICKER,
  DEFAULT_SEED as ENVIRONMENT_SEED,
} from "./EnvironmentConfig";
export type {
  BandWeight,
  EnvironmentOptions,
  GroundAnchors,
  KindConfig,
  PropKind,
  PropMotion,
} from "./EnvironmentConfig";
