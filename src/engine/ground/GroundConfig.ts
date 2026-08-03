import { SKY_PRESETS, lerpColor, sampleGradient } from "../sky";
import type { TimeOfDay } from "../sky";

/**
 * Ground tuning and colour derivation — the single place to edit the land's
 * materials, its horizontal bands and how it is lit.
 *
 * Materials are declared once here as their own colours (sand is sand, stone is
 * stone), then *lit by the sky* at whatever time of day it is: darkened by how
 * much light there is, and tinted towards the colour coming off the horizon.
 * That's what makes the beach go gold at sunset and blue under the moon without
 * anyone authoring four sets of everything, and it keeps the land tied to the
 * same sky the water already answers to.
 */

// --- Materials ---------------------------------------------------------------

/**
 * Base material colours, as they would look under flat daylight.
 *
 * Muted and sun-faded throughout (ART_DIRECTION.md §Color Philosophy) — nothing
 * here is saturated, because the lighting pass only ever pushes colour further,
 * never pulls it back.
 */
export const MATERIALS = {
  sandDry: 0xd6c39c,
  sandDryLight: 0xe6d6b4,
  sandDryDark: 0xb9a480,
  // Wet sand is a long way darker than dry, not a shade of it. Shallow water
  // near the shore is pale, so if the tidal band doesn't separate hard from the
  // dry beach there is nothing to tell the eye where the sea stops.
  sandWet: 0x8f7757,
  sandWetDark: 0x74603f,

  grass: 0x6f8f5a,
  grassLight: 0x87a468,
  grassDark: 0x53703f,

  stone: 0x8f8c83,
  stoneLight: 0xa9a69c,
  stoneDark: 0x6b6960,

  rock: 0x7e7b75,
  rockLight: 0x98958e,
  rockDark: 0x5d5b56,

  wood: 0x8a6a48,
  woodLight: 0xa5835e,
  woodDark: 0x604631,

  driftwood: 0xa89880,
  driftwoodLight: 0xc0b29b,
  driftwoodDark: 0x7d7060,

  /** Flower heads. Three quiet accents, never neon. */
  flowerCream: 0xe8dcae,
  flowerRose: 0xd08f96,
  /** `--accent`, the project's brass. */
  flowerBrass: 0xe0a458,

  /** `--ocean-foam`, for the surf line at the waterline. */
  foam: 0xcfe8ef,
} as const;

export type MaterialName = keyof typeof MATERIALS;

// --- Bands -------------------------------------------------------------------

/**
 * Where things sit down the land, as fractions of the ground's height.
 *
 * Read top to bottom as *coming towards the viewer*: the waterline is furthest
 * away, the foreground verge is at your feet. Buildings will stand on
 * `backVerge`, behind the path, so they rise up over the water without the path
 * ever running through them.
 */
export const BANDS = {
  /**
   * The waterline, set a little way down rather than hard against the top edge
   * — the surf needs room to break above it, and clipping it at zero is what
   * makes a shore look like a rectangle that starts.
   */
  waterline: 0.06,
  /** Wet sand gives way to dry. */
  sandSplit: 0.22,
  /** Sand gives way to grass. */
  grassEdge: 0.43,
  /** The stone path. Wide enough to walk down. */
  pathTop: 0.56,
  pathBottom: 0.78,
} as const;

/** Baselines props stand on, as fractions of the ground's height. */
export const PROP_BASELINES = {
  wetSand: 0.16,
  sand: 0.34,
  backVerge: 0.52,
  path: 0.68,
  frontVerge: 0.88,
  foreground: 1,
} as const;

export type GroundBand = keyof typeof PROP_BASELINES;

// --- Lighting ----------------------------------------------------------------

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

/** Rec. 709 relative luminance, 0–1. */
function luminance(color: number): number {
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Every material, lit for one time of day. */
export type GroundPalette = Record<MaterialName, number>;

/**
 * Light the whole material set from the sky.
 *
 * Two numbers do all the work, and both come out of the sky itself:
 *
 *  - **exposure**, from how bright the sky overhead is. Noon land is nearly its
 *    own colour; night land is roughly half of it. Nothing goes to black.
 *  - **warmth**, a pull towards the colour sitting on the horizon. That single
 *    tint is what turns sand gold at sunset and blue at night, and it's the
 *    reason the land never looks pasted onto a sky it wasn't painted for.
 */
export function deriveGroundPalette(timeOfDay: TimeOfDay): GroundPalette {
  const sky = SKY_PRESETS[timeOfDay];

  // The light falling on the land comes off the sky near the horizon; the
  // ambient fill is the sky overhead.
  const horizonLight = sampleGradient(sky.gradient, 0.88);
  const ambient = sampleGradient(sky.gradient, 0.2);

  const exposure = 0.4 + 0.8 * clamp01(luminance(ambient)) ** 0.7;
  // Low light means the tint has to carry more of the mood, so it strengthens
  // as the sky darkens — that's what makes moonlight read as blue.
  const warmth = lerp(0.34, 0.16, clamp01(luminance(ambient)));

  const lit = (base: number) => lerpColor(shade(base, exposure), horizonLight, warmth);

  const palette = {} as GroundPalette;
  for (const name of Object.keys(MATERIALS) as MaterialName[]) {
    palette[name] = lit(MATERIALS[name]);
  }
  return palette;
}

/** Blend two lit palettes, for the time-of-day cross-fade. */
export function lerpGroundPalette(
  a: GroundPalette,
  b: GroundPalette,
  t: number
): GroundPalette {
  const palette = {} as GroundPalette;
  for (const name of Object.keys(a) as MaterialName[]) {
    palette[name] = lerpColor(a[name], b[name], t);
  }
  return palette;
}

// --- Options -----------------------------------------------------------------

export interface GroundOptions {
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
  /**
   * Total width of the world in CSS pixels, if it is wider than the viewport.
   *
   * The land is the one system that is genuinely world-space rather than a
   * backdrop — it scrolls one-to-one with the camera, so it has to be baked at
   * the width of the whole world rather than the width of the screen. The
   * authored layout is in fractions of this, so the composition stretches to
   * whatever width it is given. Defaults to the viewport width.
   */
  worldWidth?: number;
  /** Starting time of day. Defaults to the sky's own default. */
  timeOfDay?: TimeOfDay;
  /**
   * Where the waterline sits, 0–1 down the viewport. Everything below it is
   * land. Defaults to leaving a band of open water between the sky's horizon
   * and the shore.
   */
  shoreline?: number;
  /**
   * Target internal height of the *whole viewport* in ground pixels. Only used
   * when `pixelScale` is not given. Matches the sky's default.
   */
  pixelHeight?: number;
  /**
   * Explicit scale. Pass the sky's `pixelScale` so all three systems share one
   * pixel grid — a mismatch is what makes seams visible.
   */
  pixelScale?: number;
  /** Seed for terrain mottling, cobbles and bush shapes. */
  seed?: number;
  /** Global motion multiplier. 0 for `prefers-reduced-motion: reduce`. */
  motionScale?: number;
}

/**
 * The shore sits below the sky's horizon, leaving a band of open water between
 * the two. Everything below this is land, and the whole town has to fit in it,
 * so it is the single most consequential number in the file.
 */
export const DEFAULT_SHORELINE = 0.78;
export const DEFAULT_PIXEL_HEIGHT = 200;
export const DEFAULT_SEED = 0x6a17;
export const DEFAULT_TRANSITION_SECONDS = 2.5;
