/**
 * The Buildings system — the landmarks of the journey, and the foundation every
 * one of them stands on.
 *
 * `Building` is the contract a landmark fulfils; `BuildingRenderer` is the
 * drawing plumbing it inherits; `InteractionZone` is the offer it makes; and
 * `BuildingManager` is the registry that culls, compares, and wires up the
 * hover, the click and the optional key.
 *
 * Adding a landmark is a definition, a renderer and one `manager.add(...)`.
 * Nothing in this folder changes.
 *
 * Import from "@/engine/buildings".
 */
export { Building } from "./Building";
export type {
  BuildingAnchors,
  BuildingContext,
  BuildingDefinition,
} from "./Building";

export { BuildingManager } from "./BuildingManager";
export type { BuildingManagerOptions, LightingSource } from "./BuildingManager";

export {
  BuildingRenderer,
  Pixels,
  maskToTexture,
  measureText,
  plotText,
  GLYPH_WIDTH,
  GLYPH_HEIGHT,
  GLYPH_TRACKING,
} from "./BuildingRenderer";
export type { LayerMaterial } from "./BuildingRenderer";

export { InteractionZone, INTERACT_KEY } from "./InteractionZone";
export type { InteractionZoneOptions } from "./InteractionZone";

// The landmarks themselves.
export { AptechBuilding, AptechRenderer, APTECH } from "./aptech";
export { CottageBuilding, CottageRenderer, COTTAGE } from "./cottage";
export { Planet01Building, Planet01Renderer, PLANET01 } from "./planet01";
export { VaultsysBuilding, VaultsysRenderer, VAULTSYS } from "./vaultsys";
export { NatureTechBuilding, NatureTechRenderer, NATURETECH } from "./naturetech";
export { WorkshopBuilding, WorkshopRenderer, WORKSHOP } from "./workshop";
