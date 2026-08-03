import { SKY_PRESETS, lerpColor, sampleGradient } from "../sky";
import type { TimeOfDay } from "../sky";

/**
 * Ocean tuning and colour derivation — the single place to edit how the water
 * looks and moves.
 *
 * Nothing here invents a palette. The water's colours are *derived from the
 * sky's own gradient* every time, which is what keeps the two systems feeling
 * like one place rather than two assets that happen to share a screen. Change
 * the sunset in the sky and the sea follows it automatically.
 *
 * The only literals are the project's two water tokens from `globals.css`.
 */

/** `--ocean`. */
const OCEAN_BASE = 0x1f6f8b;
/** `--ocean-foam`. */
const OCEAN_FOAM = 0xcfe8ef;

/** Steps in the baked water ramp. Few enough to stay visibly banded. */
export const WATER_RAMP_STEPS = 18;

/** One term of a wave layer's silhouette. `freq` must be a whole number so the
 *  profile closes on itself and the tile repeats without a seam. */
export interface Harmonic {
  freq: number;
  amp: number;
  phase: number;
}

export interface WaveLayerConfig {
  name: string;
  /** Where the crest sits: 0 at the horizon, 1 at the bottom of the ocean. */
  depth: number;
  /** How far the band reaches below its crest, as a fraction of ocean height. */
  band: number;
  /** Peak-to-trough of the silhouette, in sky pixels. */
  amplitude: number;
  /** Thickness of the lit lip along the crest, in sky pixels. */
  crest: number;
  /** Horizontal period. The silhouette repeats exactly at this width. */
  tileWidth: number;
  /** Scroll speed in sky pixels per second. */
  speed: number;
  /** Which way this swell rolls. Counter-drift on one layer reads as current. */
  direction: 1 | -1;
  /** Vertical bob in sky pixels. One pixel is plenty. */
  bob: number;
  /** Bob rate, radians per second. */
  bobRate: number;
  /** Band opacity. */
  alpha: number;
  /** Opacity of the lit lip, relative to the band. Keeps highlights gentle. */
  crestAlpha: number;
  /** Parallax depth against camera movement. */
  parallax: number;
  /** The harmonic mix that gives this layer its own silhouette. */
  harmonics: Harmonic[];
  /** Per-column noise, in pixels, that breaks the maths into something drawn. */
  jitter: number;
}

/**
 * Five swells, horizon to shore.
 *
 * Read the list as distance. The far layers are shallow, slow and barely
 * textured — near the horizon a swell is a line, not a wave. The near layers
 * are taller, faster and rougher. That gradient of scale *is* the depth; it's
 * also what keeps the sea reading as endless (ART_DIRECTION.md §World Scale).
 *
 * Every layer carries a different harmonic mix, so no two silhouettes repeat.
 * `swell` counter-drifts to suggest a crossing current, which stops the whole
 * sea from sliding one way like a conveyor belt.
 */
export const OCEAN_LAYERS: readonly WaveLayerConfig[] = [
  {
    name: "horizon",
    depth: 0.05,
    band: 0.16,
    amplitude: 2,
    crest: 1,
    tileWidth: 96,
    speed: 1.1,
    direction: -1,
    bob: 1,
    bobRate: 0.32,
    alpha: 0.5,
    crestAlpha: 0.62,
    parallax: 0.04,
    harmonics: [
      { freq: 3, amp: 1, phase: 0.4 },
      { freq: 7, amp: 0.35, phase: 2.1 },
    ],
    jitter: 0,
  },
  {
    name: "distant",
    depth: 0.2,
    band: 0.22,
    amplitude: 3,
    crest: 1,
    tileWidth: 112,
    speed: 1.9,
    direction: -1,
    bob: 1,
    bobRate: 0.41,
    alpha: 0.58,
    crestAlpha: 0.68,
    parallax: 0.07,
    harmonics: [
      { freq: 2, amp: 1, phase: 1.7 },
      { freq: 5, amp: 0.45, phase: 0.3 },
      { freq: 9, amp: 0.2, phase: 2.8 },
    ],
    jitter: 1,
  },
  {
    name: "swell",
    depth: 0.38,
    band: 0.26,
    amplitude: 4,
    crest: 1,
    tileWidth: 152,
    speed: 2.6,
    // Against the others: a cross-current, so the sea isn't a conveyor belt.
    direction: 1,
    bob: 1,
    bobRate: 0.29,
    alpha: 0.62,
    crestAlpha: 0.74,
    parallax: 0.11,
    harmonics: [
      { freq: 2, amp: 1, phase: 0.9 },
      { freq: 3, amp: 0.6, phase: 2.4 },
      { freq: 6, amp: 0.28, phase: 1.2 },
    ],
    jitter: 1,
  },
  {
    name: "near",
    depth: 0.58,
    band: 0.3,
    amplitude: 5,
    crest: 2,
    tileWidth: 184,
    speed: 3.6,
    direction: -1,
    bob: 1,
    bobRate: 0.37,
    alpha: 0.68,
    crestAlpha: 0.78,
    parallax: 0.16,
    harmonics: [
      { freq: 1, amp: 1, phase: 2.2 },
      { freq: 3, amp: 0.55, phase: 0.6 },
      { freq: 5, amp: 0.3, phase: 3.0 },
      { freq: 11, amp: 0.12, phase: 1.5 },
    ],
    jitter: 1,
  },
  {
    name: "shore",
    depth: 0.78,
    band: 0.34,
    amplitude: 6,
    crest: 2,
    // The nearest swell gets the longest period: it carries the most visible
    // ripple detail, so a short tile is where a repeat would be spotted first.
    tileWidth: 216,
    speed: 4.8,
    direction: -1,
    bob: 1,
    bobRate: 0.44,
    alpha: 0.74,
    crestAlpha: 0.82,
    parallax: 0.22,
    harmonics: [
      { freq: 1, amp: 1, phase: 0.2 },
      { freq: 2, amp: 0.7, phase: 1.9 },
      { freq: 4, amp: 0.34, phase: 2.6 },
      { freq: 8, amp: 0.16, phase: 0.8 },
    ],
    jitter: 1,
  },
];

/** Where the sun's reflection falls, and how strongly it glitters. */
export interface ShimmerTone {
  /** Horizontal position, 0–1 across the ocean — taken from the sky's sun. */
  x: number;
  /** The broad reflected path on the water. */
  pathColor: number;
  /** The winking highlights riding on it. */
  glintColor: number;
  /** 0 switches the whole reflection off, as at night. */
  intensity: number;
}

export interface OceanPalette {
  /** Baked water ramp, horizon (index 0) → nearest (last). */
  water: number[];
  foam: number;
  foamAlpha: number;
  shimmer: ShimmerTone;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Multiply a colour's channels — used to sink the water away from the sky. */
function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

/**
 * Derive the water ramp by *mirroring* the sky.
 *
 * This is the whole trick, and it's worth stating plainly: water at the horizon
 * reflects the sky just above the horizon, and water at your feet reflects the
 * sky overhead. So the ramp reads the sky gradient backwards — t=0 samples the
 * sky at 0.95, t=1 samples it at 0.05.
 *
 * Doing it that way means the sunset sea runs warm peach at the horizon into
 * deep blue up close, all on its own. The naive alternative — blending the
 * horizon's peach towards a teal for depth — walks the ramp straight through
 * grey and turns the sea to mud.
 *
 * On top of the mirror, water is pulled towards `--ocean` and darkened, both
 * increasingly with nearness: distant water is nearly a mirror, near water is
 * mostly sea.
 */
export function deriveOceanPalette(timeOfDay: TimeOfDay): OceanPalette {
  const sky = SKY_PRESETS[timeOfDay];

  const water: number[] = [];
  for (let i = 0; i < WATER_RAMP_STEPS; i++) {
    const t = i / (WATER_RAMP_STEPS - 1);

    const reflected = sampleGradient(sky.gradient, 0.95 - t * 0.9);
    // Both curves stay flat near the horizon on purpose. Distant water is very
    // nearly a mirror; pulling it towards teal and darkening it too early is
    // what turns a golden horizon into a strip of wet sand.
    // The sea blend stays modest even at its deepest. Pulled much further than
    // this, `--ocean`'s green swamps whatever hue the sky had, and the night
    // water turns teal under an indigo sky — two systems again, not one place.
    const seaMix = lerp(0.06, 0.4, t ** 1.2);
    const darkness = lerp(0.94, 0.58, t ** 1.35);

    water.push(shade(lerpColor(reflected, OCEAN_BASE, seaMix), darkness));
  }

  // Foam picks up the light at the horizon, so it never reads as a white line
  // pasted over a sunset.
  const horizonSky = sampleGradient(sky.gradient, 0.95);

  return {
    water,
    foam: lerpColor(OCEAN_FOAM, horizonSky, 0.4),
    foamAlpha: 0.7,
    shimmer: {
      x: sky.sun.x,
      pathColor: sky.sun.glowColor,
      glintColor: sky.sun.color,
      // The sky already fades the sun out at night; the reflection follows it,
      // which leaves the night sea calm and unglittered. Wiring this to the
      // moon instead is how moon reflections get added later.
      intensity: sky.sun.alpha,
    },
  };
}

/** Blend two derived palettes, for the time-of-day cross-fade. */
export function lerpOceanPalette(a: OceanPalette, b: OceanPalette, t: number): OceanPalette {
  return {
    water: a.water.map((color, i) => lerpColor(color, b.water[i], t)),
    foam: lerpColor(a.foam, b.foam, t),
    foamAlpha: lerp(a.foamAlpha, b.foamAlpha, t),
    shimmer: {
      x: lerp(a.shimmer.x, b.shimmer.x, t),
      pathColor: lerpColor(a.shimmer.pathColor, b.shimmer.pathColor, t),
      glintColor: lerpColor(a.shimmer.glintColor, b.shimmer.glintColor, t),
      intensity: lerp(a.shimmer.intensity, b.shimmer.intensity, t),
    },
  };
}

/** Sample the water ramp at `t` (0 = horizon, 1 = nearest). */
export function waterAt(palette: OceanPalette, t: number): number {
  const i = Math.round(clamp01(t) * (WATER_RAMP_STEPS - 1));
  return palette.water[i];
}

/**
 * Runtime multipliers, all 1 by default.
 *
 * This is the seam a future weather system drives — a storm winds `waveSpeed`
 * and `foam` up and `shimmer` down; fog pulls `waveAlpha` towards nothing.
 * Everything here is a cheap per-frame multiplier, so weather never has to
 * re-bake a texture. Silhouette changes (genuinely storm-shaped swells) belong
 * in a second `OCEAN_LAYERS` set rather than here.
 */
export interface OceanModifiers {
  waveSpeed: number;
  waveAlpha: number;
  foam: number;
  shimmer: number;
}

export const DEFAULT_MODIFIERS: OceanModifiers = {
  waveSpeed: 1,
  waveAlpha: 1,
  foam: 1,
  shimmer: 1,
};

export interface OceanOptions {
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
  /** Starting time of day. Defaults to the sky's own default. */
  timeOfDay?: TimeOfDay;
  /** Fraction of the viewport the ocean fills, measured up from the bottom. */
  coverage?: number;
  /**
   * Target internal height of the *whole viewport* in sky pixels. Only used
   * when `pixelScale` is not given. Matches the sky's default so the two
   * systems land on the same grid.
   */
  pixelHeight?: number;
  /**
   * Explicit sky-pixels-to-screen-pixels scale. Pass the sky's `pixelScale` to
   * guarantee both systems share one pixel grid — a mismatch here is the one
   * thing that would make the seam at the horizon obvious.
   */
  pixelScale?: number;
  /** Seed for wave jitter and foam. Same seed, same sea, every reload. */
  seed?: number;
  /** Global motion multiplier. 0 for `prefers-reduced-motion: reduce`. */
  motionScale?: number;
}

/** Ocean fills the bottom 30% of the viewport unless told otherwise. */
export const DEFAULT_COVERAGE = 0.3;
export const DEFAULT_PIXEL_HEIGHT = 200;
export const DEFAULT_SEED = 0x0cea;
export const DEFAULT_TRANSITION_SECONDS = 2.5;
