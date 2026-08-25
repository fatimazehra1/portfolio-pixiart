/**
 * The universe — the level above the world.
 *
 * The overview is a cluster of isometric islands, one per chapter world; each
 * world is its own place with its own bounds, identity, framing and interior.
 * This module owns the map, the model of a world, the trip between the two,
 * and the one world that is alive at a time.
 *
 * Import from "@/engine/universe".
 */
export {
  CHAPTERS,
  RESOLVED_CHAPTERS,
  UNIVERSE_MARGIN,
  DEFAULT_CHAPTER_CAMERA,
  chapterById,
  resolveChapter,
  universeBounds,
  universeCentre,
} from "./UniverseRegistry";
export type {
  ChapterCamera,
  ChapterConfig,
  ChapterEra,
  ChapterIdentity,
  ChapterInterior,
  ChapterOverview,
  ChapterTerrain,
  DetailTier,
  LandmarkSpec,
  InteriorKind,
  ResolvedChapter,
} from "./UniverseTypes";
export type {
  ChapterBuilder,
  ChapterClock,
  ChapterContext,
  ChapterWorld,
} from "./ChapterWorld";
export { ChapterHost } from "./ChapterHost";
export type { ChapterHostOptions } from "./ChapterHost";
export { UniverseDirector } from "./UniverseDirector";
export type {
  UniverseDirectorOptions,
  UniverseListener,
  UniverseState,
  ViewMode,
} from "./UniverseDirector";
export { OverviewLayer } from "./OverviewLayer";
export { LandmarkFactory, LANDMARKS } from "./LandmarkFactory";
export type { LandmarkTextures } from "./LandmarkFactory";
export { generateIsoIsland, seedFrom } from "./IsoIslandFactory";
export type { IsoIsland, IsoIslandParams } from "./IsoIslandFactory";
export { ISO_THEME, DEFAULT_ISO_THEME } from "./IsoTheme";
export type { IsoThemeEntry } from "./IsoTheme";
export type { OverviewLayerOptions } from "./OverviewLayer";
