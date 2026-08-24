import type { DetailTier } from "./UniverseTypes";

/**
 * How much of a world is built, and when.
 *
 * # Why this is one file
 * Progressive detail is the difference between a map that feels like
 * *discovering* and a map that feels like a diagram being scaled. It works only
 * if every system agrees on where the thresholds are — a world whose planting
 * appears at one zoom and whose second tower appears at a slightly different
 * one reads as popping, not as resolving. So the thresholds live here, once,
 * and everything reads `tierFor`.
 *
 * # It is a build decision, not a fade
 * A sprite either exists this frame or it does not. Below its tier a landmark
 * is not dimmed — it is never constructed, never in the display list, never
 * costing a draw call. That is what keeps the far view cheap with nine worlds
 * on screen, and it is why the tiers are three named steps rather than a
 * continuous ramp: a continuous value would only ever be thresholded into these
 * three anyway, and naming them puts the decision in one place.
 */

/**
 * Where each tier begins, as rendered camera zoom.
 *
 * The camera quantises zoom to whole screen pixels per art pixel, so the values
 * that actually occur are a short ladder (⅓, ⅔, 1, 1⅓, …at pixel scale 3).
 * These sit *between* rungs on purpose: a threshold landing exactly on a
 * reachable zoom would flicker as the easing settled across it.
 */
export const TIER_THRESHOLDS = {
  /** Below this, the whole map is in frame. Outline and one landmark. */
  mid: 0.85,
  /** Above this, one world fills the frame. Everything it has. */
  near: 1.6,
} as const;

/** Which tier a given rendered zoom is in. */
export function tierFor(zoom: number): DetailTier {
  if (zoom >= TIER_THRESHOLDS.near) return "near";
  if (zoom >= TIER_THRESHOLDS.mid) return "mid";
  return "far";
}

/** Rank, so tiers can be compared. `far` < `mid` < `near`. */
const RANK: Record<DetailTier, number> = { far: 0, mid: 1, near: 2 };

/**
 * Whether something authored for `required` should exist at `current`.
 *
 * Inclusive upward: a `far` landmark is present at every tier, because the
 * thing you recognise a world by does not stop being that thing when you get
 * closer. Only the reverse is gated.
 */
export function visibleAt(required: DetailTier, current: DetailTier): boolean {
  return RANK[required] <= RANK[current];
}
