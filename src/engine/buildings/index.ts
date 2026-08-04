/**
 * The Buildings system — the landmarks of the journey, and the foundation every
 * one of them stands on.
 *
 * `Building` is the contract a landmark fulfils; `BuildingRenderer` is the
 * drawing plumbing it inherits; `InteractionZone` is the offer it makes and the
 * one floating prompt that shows it; and `BuildingManager` is the registry that
 * culls, compares and listens for the key.
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

export {
  InteractionZone,
  InteractionPrompt,
  INTERACT_KEY,
  INTERACT_LABEL,
  PROMPT,
  PROMPT_COLORS,
} from "./InteractionZone";
export type { InteractionZoneOptions } from "./InteractionZone";

// The landmarks themselves.
export { AptechBuilding, AptechRenderer, APTECH } from "./aptech";
