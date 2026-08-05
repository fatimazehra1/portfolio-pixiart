/**
 * The near foreground — what stands between you and the town.
 *
 * A side view drawn in one plane reads as a diorama: everything is the same
 * distance away, and the eye has nothing to measure depth against. WORLD.md
 * asks for background layers with independent parallax, and this is the layer
 * on the *near* side of the subject — the one that overtakes the town as you
 * pan, which is the single strongest depth cue a 2D scene has.
 *
 * # Silhouettes only
 * Nothing here is lit, detailed or coloured. These are near-black shapes with a
 * little of the sky's colour mixed in, because that is what anything close and
 * unlit actually looks like against a bright background. Detail in the
 * foreground would compete with the buildings, which are the thing worth
 * looking at (ART_DIRECTION.md §Buildings).
 */

export type SilhouetteKind = "grass" | "reed" | "branch" | "post" | "rock";

export interface SilhouetteConfig {
  /** Average gap between instances, in world pixels. */
  spacing: number;
  /** Never closer than this. */
  minGap: number;
  /** Size range in art pixels, as [min, max] for width and height. */
  width: [number, number];
  height: [number, number];
  /** How many drawings exist. */
  variants: number;
  /** Sway travel in art pixels, and rate, as [min, max]. 0 for things that don't move. */
  sway: { amount: [number, number]; rate: [number, number] };
  /** How far the shape's foot sits below the bottom edge of the view, 0–1. */
  rooting: [number, number];
}

/**
 * How much of the camera's movement this layer answers.
 *
 * Above 1, so it travels *faster* than the town and overtakes it. The number is
 * deliberately modest: at 2 the foreground streaks past fast enough to be
 * distracting, and at 1.1 you cannot tell it is a separate plane at all. This
 * is roughly where it reads as "close" without asking for attention.
 *
 * Kept here rather than only in the layer table because it is an art decision
 * about this content, not a fact about the stack.
 */
export const FOREGROUND_PARALLAX = 1.35;

export const SILHOUETTES: Record<SilhouetteKind, SilhouetteConfig> = {
  /** Tufts of tall grass along the very bottom. The commonest thing here. */
  grass: {
    spacing: 46,
    minGap: 14,
    width: [5, 11],
    height: [7, 15],
    variants: 4,
    sway: { amount: [1, 2], rate: [0.5, 1.1] },
    rooting: [0.05, 0.3],
  },

  /** Taller, thinner, and stiffer than grass. Breaks up the run. */
  reed: {
    spacing: 210,
    minGap: 40,
    width: [3, 5],
    height: [16, 30],
    variants: 3,
    sway: { amount: [1, 3], rate: [0.3, 0.7] },
    rooting: [0.1, 0.35],
  },

  /**
   * A branch reaching in from off-screen, rooted below the frame.
   *
   * Rare on purpose. One of these across the top of a shot is a composition;
   * three is a hedge.
   */
  branch: {
    spacing: 1400,
    minGap: 700,
    width: [26, 54],
    height: [14, 26],
    variants: 3,
    sway: { amount: [1, 2], rate: [0.18, 0.34] },
    rooting: [0.55, 0.85],
  },

  /** Fence posts and mooring bollards. Solid, still, and vertical. */
  post: {
    spacing: 620,
    minGap: 260,
    width: [4, 7],
    height: [18, 30],
    variants: 2,
    sway: { amount: [0, 0], rate: [0, 0] },
    rooting: [0.15, 0.4],
  },

  /** Low humps of rock at the bottom edge. Anchors the frame. */
  rock: {
    spacing: 760,
    minGap: 300,
    width: [14, 34],
    height: [6, 13],
    variants: 3,
    sway: { amount: [0, 0], rate: [0, 0] },
    rooting: [0.02, 0.2],
  },
};

export const SILHOUETTE_KINDS = Object.keys(SILHOUETTES) as SilhouetteKind[];

/**
 * The silhouette colour, before the sky gets mixed into it.
 *
 * Not black. Pure black in a pixel scene reads as a hole rather than as a
 * shape, and ART_DIRECTION.md §Shadows is explicit that nothing is ever pure
 * black — even the nearest, darkest thing in the frame is still lit by
 * something.
 */
export const SILHOUETTE_BASE = 0x1d2430;

/**
 * How much of the ambient light colour is mixed into the silhouette, 0–1.
 *
 * Low, but not zero. This is what stops the foreground looking pasted on: a
 * shape this close to the viewer catches a little of whatever the sky is doing,
 * so it goes faintly warm at sunset along with everything else.
 */
export const SILHOUETTE_TINT = 0.22;

/** How far past the view silhouettes are kept alive, in CSS pixels. */
export const DEFAULT_CULL_MARGIN = 220;

export const DEFAULT_SEED = 0xf0e9;
export { DEFAULT_PIXEL_HEIGHT } from "../shared";
