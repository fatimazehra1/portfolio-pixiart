// Public surface of the rendering engine. Import from "@/engine".
export { Engine } from "./core/Engine";

// Camera (see ./camera for the full system).
export { Camera, CameraController, WORLD_WIDTH, CAMERA_SETTINGS } from "./camera";
export type { CameraControllerOptions, CameraSettings } from "./camera";

// Time (see ./time for the full system).
export { TimeSystem, TimeManager, PHASE_SPANS, PHASE_ORDER, TIME_SETTINGS } from "./time";
export type { TimeListener, TimePhase, TimeSettings, TimeSnapshot } from "./time";
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
