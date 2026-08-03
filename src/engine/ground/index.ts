/**
 * The Ground system — the shore the town will stand on.
 *
 * Drop `Ground` in front of the ocean: it owns the shoreline, the sand, the
 * grass, the stone path and everything planted on it, and takes nothing from
 * the rest of the world but a time of day. Import from "@/engine/ground".
 */
export { Ground } from "./Ground";
export { Shoreline } from "./Shoreline";
export { TerrainLayer } from "./TerrainLayer";
export { PathLayer } from "./PathLayer";
export { PropLayer } from "./PropLayer";
export {
  MATERIALS,
  BANDS,
  PROP_BASELINES,
  DEFAULT_SHORELINE,
  deriveGroundPalette,
  lerpGroundPalette,
} from "./GroundConfig";
export type {
  GroundBand,
  GroundOptions,
  GroundPalette,
  MaterialName,
} from "./GroundConfig";
export {
  BUILDING_PLOTS,
  PLOT_RESERVED_BANDS,
  PROP_PLACEMENTS,
  FENCE_RUNS,
} from "./GroundLayout";
export type { FenceRun, PlotArea, PropKind, PropPlacement } from "./GroundLayout";
