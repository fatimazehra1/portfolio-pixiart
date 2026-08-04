/**
 * The pixel grid, for the whole engine.
 *
 * Every system in this world draws into an internal grid and is scaled up by a
 * *whole number* — that shared integer is the single most important value in the
 * renderer. Get it wrong in one system and that system's art lands between the
 * others' pixels, which is exactly the shimmer CLAUDE.md forbids.
 *
 * Five systems each declared their own copy of this constant and their own copy
 * of the rule. They agreed, which was luck rather than design: nothing stopped
 * one of them drifting to 180 and quietly putting the shore on a different grid
 * from the sea.
 */

/**
 * Target height of the viewport in internal pixels.
 *
 * The number that decides how chunky the world looks. At 200, a 738px-tall
 * window renders at scale 3 and a character is a few dozen pixels tall — medium
 * resolution, the density ART_DIRECTION.md §Pixel Style asks for. Lower it and
 * the world gets blockier; raise it and it drifts toward HD illustration.
 */
export const DEFAULT_PIXEL_HEIGHT = 200;

/**
 * The scale rule: how many screen pixels one world pixel occupies.
 *
 * Floored to a whole number and never below 1. Non-integer scaling is what
 * blurs pixel art, so a viewport that doesn't divide evenly gets a slightly
 * coarser world rather than a slightly soft one.
 */
export function pixelScaleFor(
  viewportHeight: number,
  targetPixelHeight = DEFAULT_PIXEL_HEIGHT
): number {
  return Math.max(1, Math.floor(viewportHeight / targetPixelHeight));
}
