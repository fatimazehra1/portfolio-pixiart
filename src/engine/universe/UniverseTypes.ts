/**
 * The career universe, as data.
 *
 * One entry per *chapter world* — a small, self-contained pixel-art place that
 * stands for one era. This replaces the assumption the world was built on: that
 * every chapter is a plot on one horizontal coastline, laid out west to east.
 * It is not. Each chapter is its own world with its own position in the
 * overview, its own bounds, its own identity, its own framing and its own
 * interior.
 *
 * # Two coordinate spaces, and nothing in between
 * There are exactly two, and keeping them apart is the whole of this module:
 *
 *  - **Universe space.** Where the worlds sit relative to each other at
 *    overview scale. `ChapterOverview.x/y/radius` live here. Nothing is drawn
 *    in detail here; a world is a mark on a map.
 *  - **Interior space.** Each world's own local coordinates, starting at its
 *    own origin. A chapter's scenes, ground, buildings and weather live here
 *    and know nothing of the universe around them.
 *
 * A chapter never expresses itself in the other's units, which is what lets a
 * world be moved on the map without a single thing inside it changing.
 */

import type { SceneStatus } from "../scene";

/**
 * When the chapter ran. Years, so the overview can order and label them without
 * parsing prose.
 *
 * `to` omitted means "and still going" — the `2022+` and `2026–` of a CV.
 */
export interface ChapterEra {
  from: number;
  to?: number;
}

/**
 * How a chapter world reads at a glance.
 *
 * Deliberately three colours and a terrain word rather than a texture set. The
 * art is hand-plotted and always will be (CLAUDE.md §Art References); this is
 * only enough for the overview to tell eight worlds apart and for an interior
 * to know what family it belongs to.
 */
export interface ChapterIdentity {
  /** The world's dominant colour. What you pick it out by from the overview. */
  primary: number;
  /** Its secondary — atmosphere, rim, ring. */
  secondary: number;
  /** The light this world's own lamps and windows burn. */
  accent: number;
  /** What the place is made of, in one word. A hint to its interior builder. */
  terrain: ChapterTerrain;
  /**
   * What stands on it, back to front.
   *
   * Deliberately a small list of *silhouettes*, not an environment. Used as
   * the hub's fallback for a chapter with no dedicated building renderer; the
   * detailed environment is the interior's job and is a different problem
   * entirely.
   */
  landmarks: readonly LandmarkSpec[];
}

/**
 * One structure standing on a world, as a hand-plotted silhouette.
 *
 * `bitmap` names a drawing in `LandmarkFactory`; everything else is where it
 * stands. Kept as *data on the chapter* rather than inside the factory so a
 * world's composition — what is on it and where — is readable in one place
 * alongside its colours and its era.
 */
export interface LandmarkSpec {
  /** Which drawing. See `LANDMARKS` in `LandmarkFactory`. */
  bitmap: string;
  /**
   * Where it stands across the island, -1 (west edge) to 1 (east edge).
   *
   * A fraction rather than a pixel count, because an island's width depends on
   * the pixel grid the viewport earned and a landmark has to stand in the same
   * *place* on it at every scale.
   */
  at: number;
  /** Drawn at this many art pixels per bitmap pixel. Whole numbers only. */
  scale?: number;
  /** Mirror it. Free variety at nearest-neighbour. */
  flip?: boolean;
  /**
   * The detail tier this appears at. See `DetailTier`.
   *
   * The whole of progressive disclosure, per structure. A world's tallest
   * landmark is `far` — it is the thing you recognise the world by. Everything
   * that only makes sense once you are close is `near`, and at overview scale
   * it costs nothing because it is never built.
   */
  tier?: DetailTier;
}

/**
 * How resolved the view is.
 *
 * Three tiers rather than a continuous ramp, and deliberately: a sprite either
 * exists this frame or it does not, and a continuous value would only ever be
 * thresholded into these three anyway. Naming them makes the thresholds one
 * decision in one file instead of a magic number at every call site.
 */
export type DetailTier =
  /** The whole map at once. Silhouette and primary landmark only. */
  | "far"
  /** One region of the map. Secondary structures, planting. */
  | "mid"
  /** One world filling the frame. Everything it has. */
  | "near";

export type ChapterTerrain =
  | "shore"
  | "campus"
  | "city"
  | "vault"
  | "forge"
  | "spire"
  | "workshop"
  | "meadow";

/** Where a world sits in the overview, and how big it looks there. */
export interface ChapterOverview {
  /** Centre, in universe pixels. */
  x: number;
  y: number;
  /** Apparent radius at overview scale, in universe pixels. */
  radius: number;
  /**
   * Zoom at which this world starts resolving into detail, and the zoom by
   * which it is fully resolved.
   *
   * The "hover/zoom toward a world → world becomes more detailed" half of the
   * interaction, as two numbers rather than as a special case in a renderer.
   */
  detailFrom?: number;
  detailTo?: number;
}

/**
 * How the camera treats this world.
 *
 * Three separate numbers because the brief asks for three separate things: a
 * world has its own camera focus, its own zoom level, and its own approach.
 */
export interface ChapterCamera {
  /** Zoom the camera settles at once you are inside. */
  zoom: number;
  /** Where inside its bounds the camera lands on entry, 0–1 across the world. */
  entry: number;
  /**
   * Zoom the overview camera pushes to on the way in, before the swap.
   *
   * The overview never renders the interior, so the fly-in is a zoom towards a
   * mark on the map that is cut, at its peak, for the interior itself. This is
   * how far it gets before that cut.
   */
  approachZoom: number;
}

/**
 * How a chapter's interior is built.
 *
 * `kind` names a builder, exactly as `SceneConfig.rendererId` names a hand-
 * plotted renderer — and for the same reason. There is one kind today, `coast`,
 * which is the existing waterfront assembly run over one chapter's scenes
 * instead of over all ten. New kinds are new worlds, and adding one is a
 * builder plus this string; it is never a change here.
 */
export interface ChapterInterior {
  kind: InteriorKind;
  /**
   * Scene ids, from the scene registry, that live inside this world.
   *
   * The migration seam. The scenes are still authored on one coastline, and
   * this is the statement that they will not stay there — a chapter's interior
   * is built from *its own* scenes, rebased onto its own origin, and knows
   * nothing about the nine other chapters' scenes sitting either side of it in
   * the registry file.
   */
  scenes: readonly string[];
  /** Open ground kept either side of the outermost scene, in world pixels. */
  margin?: number;
}

export type InteriorKind = "coast";

/** One world in the career universe. */
export interface ChapterConfig {
  /** Stable key. */
  id: string;
  /** What it is called. */
  name: string;
  /** One line, for a label. Never rendered as prose in the world. */
  tagline?: string;
  era: ChapterEra;
  /** Where the chapter stands in the story. Same vocabulary the scenes use. */
  status: SceneStatus;
  identity: ChapterIdentity;
  overview: ChapterOverview;
  interior: ChapterInterior;
  /** How the camera treats it. Falls back to the universe default. */
  camera?: Partial<ChapterCamera>;
  /** A note to the next person reading the layout. Never rendered. */
  note?: string;
}

/** A chapter with every optional field resolved. What the systems read. */
export interface ResolvedChapter {
  id: string;
  name: string;
  tagline: string;
  era: ChapterEra;
  status: SceneStatus;
  identity: ChapterIdentity;
  overview: Required<ChapterOverview>;
  interior: Required<ChapterInterior>;
  camera: ChapterCamera;
  note: string;
}
