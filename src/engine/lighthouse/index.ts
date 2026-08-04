/**
 * The Lighthouse system — the end of the shore, and the light on it.
 *
 * `Lighthouse` is the tower and where it stands; `LighthouseBeam` is the light
 * it turns. The tower is lit by the world's ambient and the beam by what that
 * ambient leaves over for local sources, so the light puts itself out at dawn
 * and comes back at dusk without this system ever reading the clock.
 *
 * Import from "@/engine/lighthouse".
 */
export { Lighthouse } from "./Lighthouse";
export type { LightingSource } from "./Lighthouse";
export { LighthouseBeam } from "./LighthouseBeam";
export type { BeamGeometry } from "./LighthouseBeam";
export {
  TOWER,
  MATERIALS,
  EMISSIVE,
  BEAM_SETTINGS,
  BASE_BAND,
  PLOT_NAME,
  PLOT_POSITION,
  lighthouseWorldX,
} from "./LighthouseConfig";
export type {
  BeamSettings,
  LighthouseOptions,
  MaterialName,
  ShoreAnchors,
} from "./LighthouseConfig";
