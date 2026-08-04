/**
 * Shared primitives — the handful of things every rendering system in this
 * world needs and none of them should own.
 *
 * Seeded randomness, ordered dithering, texture baking and the pixel grid. All
 * four existed as between five and nine identical copies scattered across the
 * engine; each set was verified byte-identical before being collapsed here.
 *
 * Nothing in this folder draws, holds state, or knows what a building is.
 * Import from "@/engine/shared".
 */
export { createRandom, range, rangeInt } from "./random";
export { bayer, ditherIndex, ditherAlpha } from "./dither";
export { toTexture, maskToTexture } from "./pixels";
export { DEFAULT_PIXEL_HEIGHT, pixelScaleFor } from "./pixelScale";
