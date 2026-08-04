// Public surface of the rendering engine. Import from "@/engine".
export { Engine } from "./core/Engine";

// Camera (see ./camera for the full system).
export {
  Camera,
  CameraController,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  CAMERA_SETTINGS,
} from "./camera";
export type {
  CameraControllerOptions,
  CameraSettings,
  FollowOptions,
  FollowTarget,
} from "./camera";

// Time (see ./time for the full system).
export { TimeSystem, TimeManager, PHASE_SPANS, PHASE_ORDER, TIME_SETTINGS } from "./time";
export type { TimeListener, TimePhase, TimeSettings, TimeSnapshot } from "./time";

// Day/night cycle (see ./dayNight for the full system).
export { DayNightSystem, DayNightManager, COLOR_PRESETS, DAY_NIGHT_SETTINGS } from "./dayNight";
export type { DayNightState, PhasePalettes, PhasePreset } from "./dayNight";

// Stars (see ./stars for the full system).
export { Stars, StarField, STAR_SETTINGS, PHASE_VISIBILITY } from "./stars";
export type { StarSettings, StarsOptions } from "./stars";

// Lighting (see ./lighting for the full system).
export {
  LightingSystem,
  LightingManager,
  LIGHT_PRESETS,
  applyAmbient,
  localIntensity,
} from "./lighting";
export type { LightPreset, LightingState } from "./lighting";
export { LayerManager, LAYER_ORDER } from "./layers/LayerManager";
export { AssetLoader } from "./assets/AssetLoader";
export type { Bounds, EngineOptions, LayerName, Size, Vec2 } from "./types";

// Sky (see ./sky for the full system).
export { SkySystem, SKY_PRESETS, DEFAULT_TIME_OF_DAY } from "./sky";
export type { SkyPalette, SkySystemOptions, TimeOfDay } from "./sky";

// Ocean (see ./ocean for the full system).
export { Ocean, OCEAN_LAYERS, deriveOceanPalette } from "./ocean";
export type { OceanModifiers, OceanOptions, OceanPalette } from "./ocean";

// Ground (see ./ground for the full system).
export { Ground, BUILDING_PLOTS, deriveGroundPalette } from "./ground";
export type { GroundOptions, GroundPalette, PlotArea } from "./ground";

// Buildings (see ./buildings for the full system).
export {
  Building,
  BuildingManager,
  BuildingRenderer,
  InteractionZone,
  AptechBuilding,
  Planet01Building,
  VaultsysBuilding,
  NatureTechBuilding,
  INTERACT_KEY,
} from "./buildings";
export type {
  BuildingAnchors,
  BuildingContext,
  BuildingDefinition,
  BuildingManagerOptions,
} from "./buildings";

// Environment props (see ./environment for the full system).
export { Environment, PropFactory, KINDS, PROP_KINDS } from "./environment";
export type {
  EnvironmentOptions,
  KindConfig,
  Prop,
  PropKind,
} from "./environment";

// Lighthouse (see ./lighthouse for the full system).
export { Lighthouse, LighthouseBeam, BEAM_SETTINGS, TOWER, lighthouseWorldX } from "./lighthouse";
export type {
  BeamGeometry,
  BeamSettings,
  LighthouseOptions,
  ShoreAnchors,
} from "./lighthouse";
