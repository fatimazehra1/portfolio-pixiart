/**
 * Ordered dithering, for the whole engine.
 *
 * The single technique that makes every soft thing in this world read as pixel
 * art rather than as a gradient someone pasted over it: quantise a smooth
 * falloff to a handful of levels, and break the resulting bands with an ordered
 * threshold matrix. A continuous ramp over a pixel-art sea is the fastest way to
 * give away that the pixel art is a costume (CLAUDE.md §Pixel Art Rules).
 *
 * Used by the sky's glows, the sea's ramp, the shore's mottling, the
 * lighthouse's beam and the environment's props — five copies of this table,
 * verified identical, collapsed into one.
 */

/**
 * The 8×8 Bayer matrix.
 *
 * Ordered rather than random on purpose. Random dithering produces a different
 * result on every re-bake and reads as film grain; ordered dithering produces a
 * stable woven texture, which is what a hand-dithered sprite actually looks
 * like.
 */
const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60,
  28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47,
  7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** The threshold for a pixel, in [0, 1). Tiles every 8 pixels in both axes. */
export function bayer(x: number, y: number): number {
  return (BAYER_8[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
}

/**
 * Quantise `value` to one of `steps` levels, dithered — returns the level index.
 *
 * For callers that want the band number rather than an alpha, typically to look
 * up a colour ramp.
 */
export function ditherIndex(value: number, steps: number, x: number, y: number): number {
  const p = clamp01(value) * (steps - 1);
  const floor = Math.floor(p);
  return Math.min(steps - 1, p - floor > bayer(x, y) ? floor + 1 : floor);
}

/** The same, expressed as an 0–255 alpha byte. */
export function ditherAlpha(value: number, steps: number, x: number, y: number): number {
  return Math.round((ditherIndex(value, steps, x, y) / (steps - 1)) * 255);
}
