import type { PhasePreset } from "./DayNightConfig";
import type { TimePhase } from "../time";

/**
 * The six phases of the day, painted.
 *
 * Every colour in the world comes from this file. Nothing here is generated and
 * nothing is shared between phases — each is authored as its own complete look,
 * so `dawn` is not "morning but darker" and `dusk` is not "sunset but bluer".
 * That was the whole point of building six presets rather than mapping six
 * phases onto four.
 *
 * Sunset is carried over unchanged from the hand-tuned palette the world
 * already shipped with, and is the quality bar the other five were authored
 * against (ART_DIRECTION.md §Sunset — the primary visual identity).
 *
 * Everything stays muted and sun-faded (§Color Philosophy). Nothing is neon,
 * and nothing — including night — reaches pure black.
 */

/**
 * Dawn — cool and hopeful.
 *
 * The blue hour giving way. Still mostly night overhead, with a restrained rose
 * creeping along the horizon and a low sun that hasn't warmed anything yet. The
 * trick is that the warmth is *only* at the horizon: let it climb the sky and
 * this stops being dawn and becomes a second sunset.
 */
const DAWN: PhasePreset = {
  sky: {
    top: 0x2f3f66,
    upper: 0x4a5580,
    middle: 0x7a7396,
    horizon: 0xd99a8e,
    glow: 0xf0c3a5,
    base: 0xcfa08d,
  },
  oceanReflection: 0xa9887e,
  oceanDeep: 0x16283f,
  hazeColor: 0xd7b3a2,
  hazeAlpha: 0.4,
  ambient: 0.52,
  cloudTint: 0x8d8099,
  cloudAlpha: 0.82,
  sun: {
    x: 0.22,
    y: 0.655,
    opacity: 0.8,
    color: 0xffdcb4,
    glow: 0xf0a583,
    glowOpacity: 0.32,
  },
  moon: {
    x: 0.78,
    y: 0.18,
    opacity: 0.35,
    color: 0xdfe4f2,
    glow: 0xb9c2dd,
    glowOpacity: 0.12,
  },
};

/**
 * Morning — bright and fresh.
 *
 * Soft blue overhead falling through pale turquoise into warm cream at the
 * horizon. The most optimistic light of the day and the least dramatic; it
 * should feel like the world has just been aired out.
 */
const MORNING: PhasePreset = {
  sky: {
    top: 0x5f92bb,
    upper: 0x84b2cf,
    middle: 0xa9cbd6,
    horizon: 0xe0dcc4,
    glow: 0xf4e6c4,
    base: 0xecd9b0,
  },
  oceanReflection: 0xcfc0a0,
  oceanDeep: 0x2a5473,
  hazeColor: 0xf3e4c4,
  hazeAlpha: 0.34,
  ambient: 0.92,
  cloudTint: 0xe7dbc8,
  cloudAlpha: 0.85,
  sun: {
    x: 0.19,
    y: 0.44,
    opacity: 1,
    color: 0xffeec2,
    glow: 0xffd894,
    glowOpacity: 0.3,
  },
  moon: {
    x: 0.82,
    y: 0.18,
    opacity: 0,
    color: 0xe8ecf4,
    glow: 0xbccbe4,
    glowOpacity: 0,
  },
};

/**
 * Noon — clear and vibrant.
 *
 * Bright but still desaturated (DESIGN.md §Color Palette). The high sun and the
 * near-white horizon do the work; pushing the blue any further would tip the
 * whole world into a saturation the rest of the day can't match.
 */
const NOON: PhasePreset = {
  sky: {
    top: 0x3f7fb5,
    upper: 0x5f9dcd,
    middle: 0x7ec0ee, // --sky-day
    horizon: 0xbcdcea,
    glow: 0xd6ebf0,
    base: 0xc3dde3,
  },
  oceanReflection: 0xa8ccd8,
  oceanDeep: 0x1d4a63,
  hazeColor: 0xdbe9ee,
  hazeAlpha: 0.26,
  ambient: 1,
  cloudTint: 0xdeeaf0,
  cloudAlpha: 0.9,
  sun: {
    x: 0.71,
    y: 0.15,
    opacity: 1,
    color: 0xfff5d4,
    glow: 0xffe9b0,
    glowOpacity: 0.22,
  },
  moon: {
    x: 0.2,
    y: 0.3,
    opacity: 0,
    color: 0xe8ecf4,
    glow: 0xbccbe4,
    glowOpacity: 0,
  },
};

/**
 * Sunset — warm and cinematic. The project's visual identity.
 *
 * Carried over verbatim from the palette the world already had, anchors chosen
 * to reproduce its nine hand-tuned gradient stops: deep blue overhead falling
 * through plum and dusty pink to peach at the horizon.
 */
const SUNSET: PhasePreset = {
  sky: {
    top: 0x2b3a63,
    upper: 0x6b5480,
    middle: 0xb87a76,
    horizon: 0xf4a259, // --sky-dusk
    glow: 0xf3c191,
    base: 0xe3a274,
  },
  oceanReflection: 0xd4a67e,
  oceanDeep: 0x173347,
  hazeColor: 0xf0b07f,
  hazeAlpha: 0.38,
  ambient: 0.75,
  cloudTint: 0xc98d92,
  cloudAlpha: 0.92,
  sun: {
    x: 0.66,
    y: 0.61,
    opacity: 1,
    color: 0xffd7a0,
    glow: 0xff9e5e,
    glowOpacity: 0.42,
  },
  moon: {
    x: 0.15,
    y: 0.14,
    opacity: 0.5,
    color: 0xeceaf6,
    glow: 0xb3aed4,
    glowOpacity: 0.16,
  },
};

/**
 * Dusk — purple and peaceful.
 *
 * The sun is gone and the warmth with it; what's left is the sky's own colour,
 * which is violet. The last plum-rose sits low and the moon has taken over.
 * This is the quietest phase of the day and should feel like the world exhaling.
 */
const DUSK: PhasePreset = {
  sky: {
    top: 0x1d2547,
    upper: 0x33305e,
    middle: 0x5a4374,
    horizon: 0x8a5878,
    glow: 0xb4738a,
    base: 0x7d5570,
  },
  oceanReflection: 0x7c5c72,
  oceanDeep: 0x131f37,
  hazeColor: 0x8a6480,
  hazeAlpha: 0.4,
  ambient: 0.48,
  cloudTint: 0x6b5878,
  cloudAlpha: 0.8,
  sun: {
    // Sinking out of sight. A sliver still catching the water.
    x: 0.8,
    y: 0.7,
    opacity: 0.15,
    color: 0xffc79a,
    glow: 0xd97a63,
    glowOpacity: 0.2,
  },
  moon: {
    x: 0.3,
    y: 0.24,
    opacity: 0.75,
    color: 0xe4e2f4,
    glow: 0xa9a2cf,
    glowOpacity: 0.24,
  },
};

/**
 * Night — deep blue with moonlight.
 *
 * Navy, indigo and violet, never black (ART_DIRECTION.md §Night). The moon is
 * the only light source, so it carries the whole scene and everything else
 * takes its cast from it.
 */
const NIGHT: PhasePreset = {
  // Lifted a stop and a half off where it was. The old night was dark enough
  // that the islands stopped existing in it, which is the one thing a phase
  // is not allowed to do — the archipelago is the picture. What reads as
  // night now is the *hue* (indigo and violet, cool all the way up) and the
  // fact that every artificial light is doing the work, not an absence of
  // exposure.
  sky: {
    top: 0x152a52, // --sky-night, lifted
    upper: 0x21315d,
    middle: 0x333f70,
    horizon: 0x4e5484,
    glow: 0x5b5b8c,
    base: 0x4e4877,
  },
  oceanReflection: 0x4a4f75,
  oceanDeep: 0x14314a,
  hazeColor: 0x3a4a76,
  hazeAlpha: 0.32,
  ambient: 0.62,
  cloudTint: 0x555f8e,
  cloudAlpha: 0.7,
  sun: {
    x: 0.3,
    y: 0.78,
    opacity: 0,
    color: 0xffd7a0,
    glow: 0xff9e5e,
    glowOpacity: 0,
  },
  moon: {
    x: 0.7,
    y: 0.19,
    opacity: 1,
    color: 0xeaf0ff,
    glow: 0xa8c0ee,
    glowOpacity: 0.42,
  },
};

/**
 * The grade laid over every authored phase.
 *
 * The presets above are painted at full strength on purpose — it is easier to
 * author a colour you can see than one already pulled halfway to grey — and
 * this is the single pass that takes them down to the muted, sun-faded range
 * the world is meant to sit in (ART_DIRECTION.md §Color Philosophy). One
 * number here moves the whole day, which is the only way six phases stay in
 * the same film stock.
 *
 * `warmth` is the second half of the same idea: desaturation alone leaves the
 * mid-tones papery, so the middle of the range leans a little towards a dusty
 * amber. Only the middle — the highlights stay clean and the shadows stay
 * blue, and a warm cast across all three would just be sepia.
 */
const GRADE = {
  /** How far every authored colour is pulled towards its own grey, 0–1. */
  saturation: 0.3,
  /** How far mid-luminance colours lean towards `warmTone`, 0–1. */
  warmth: 0.09,
  warmTone: 0xc9a883,
} as const;

const clampUnit = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function mixColor(from: number, to: number, t: number): number {
  const k = clampUnit(t);
  const ch = (shift: number) => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * k);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Rec. 709 relative luminance, 0–1. */
function luma(color: number): number {
  return (
    (0.2126 * ((color >> 16) & 0xff) +
      0.7152 * ((color >> 8) & 0xff) +
      0.0722 * (color & 0xff)) /
    255
  );
}

/** Desaturate, then warm the mid-range. The whole grade, one colour. */
function graded(color: number): number {
  const grey = Math.round(luma(color) * 255);
  const muted = mixColor(color, (grey << 16) | (grey << 8) | grey, GRADE.saturation);

  // A hump centred on mid-grey: nothing at black, nothing at white, most in
  // the middle, so the warmth lands on the body of the picture and not its ends.
  const mid = 1 - Math.abs(luma(muted) - 0.5) * 2;
  return mixColor(muted, GRADE.warmTone, GRADE.warmth * mid * mid);
}

/**
 * Run one authored preset through the grade.
 *
 * Every colour a renderer will ever see passes through here — sky anchors, the
 * two water tones, haze, cloud and both bodies — so no phase can quietly opt
 * out of the film stock. Alphas, ambient and positions are untouched.
 */
function grade(preset: PhasePreset): PhasePreset {
  const { top, middle, horizon, upper, glow, base } = preset.sky;
  const sky: PhasePreset["sky"] = {
    top: graded(top),
    middle: graded(middle),
    horizon: graded(horizon),
    ...(upper === undefined ? {} : { upper: graded(upper) }),
    ...(glow === undefined ? {} : { glow: graded(glow) }),
    ...(base === undefined ? {} : { base: graded(base) }),
  };

  const body = (b: PhasePreset["sun"]) => ({ ...b, color: graded(b.color), glow: graded(b.glow) });

  return {
    ...preset,
    sky,
    oceanReflection: graded(preset.oceanReflection),
    oceanDeep: graded(preset.oceanDeep),
    hazeColor: graded(preset.hazeColor),
    cloudTint: graded(preset.cloudTint),
    sun: body(preset.sun),
    moon: body(preset.moon),
  };
}

export const COLOR_PRESETS: Record<TimePhase, PhasePreset> = {
  dawn: grade(DAWN),
  morning: grade(MORNING),
  noon: grade(NOON),
  sunset: grade(SUNSET),
  dusk: grade(DUSK),
  night: grade(NIGHT),
};
