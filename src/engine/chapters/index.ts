/**
 * Chapter interiors — how each kind of world is built.
 *
 * One builder per `ChapterInterior.kind`. A chapter names a kind, the host
 * looks it up here, and the world is constructed. This is the seam a new *kind*
 * of world arrives at: a spire you climb or a workshop you stand inside is a
 * new file here and one string in the universe registry, and nothing else in
 * the engine changes.
 *
 * Import from "@/engine/chapters".
 */
import { CoastChapter } from "./CoastChapter";
import type { ChapterBuilder, InteriorKind } from "../universe";

export { CoastChapter } from "./CoastChapter";

/** Which builder makes which kind of interior. The whole table. */
export const CHAPTER_BUILDERS: Readonly<Record<InteriorKind, ChapterBuilder>> = {
  coast: (context) => new CoastChapter(context),
};
