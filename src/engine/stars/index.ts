/**
 * The Stars system — the night sky's field of stars.
 *
 * `StarField` is the picture: hundreds of one-, two- and three-pixel points,
 * each with its own brightness and its own slow rhythm. `Stars` is the switch:
 * it mounts the field into the sky and decides how visible it should be, from
 * the clock alone.
 *
 * Isolated by design — nothing else in the world knows it exists, and it
 * modifies nothing. Import from "@/engine/stars".
 */
export { Stars } from "./Stars";
export { StarField } from "./StarField";
export {
  STAR_SETTINGS,
  STAR_SIZES,
  STAR_TINTS,
  PHASE_VISIBILITY,
  MOUNT_BEFORE_LABEL,
} from "./StarConfig";
export type { StarSettings, StarSize, StarSizeClass, StarsOptions } from "./StarConfig";
export type { StarTimeSnapshot, StarTimeSource } from "./Stars";
