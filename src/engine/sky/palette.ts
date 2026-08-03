import type { CelestialState, GradientStop, SkyPalette, TimeOfDay } from "./types";

/**
 * The sky's colour source of truth.
 *
 * CLAUDE.md forbids scattering hex through components; WebGL can't read CSS
 * custom properties, so every sky colour is centralised *here* instead — one
 * file to edit, nothing hardcoded downstream. The anchors mirror the tokens in
 * `globals.css`: --sky-day #7ec0ee, --sky-dusk #f4a259, --sky-night #0b1e3f.
 *
 * Everything is muted and sun-faded (ART_DIRECTION.md §Color Philosophy).
 * Nothing is neon. Nothing is pure black.
 *
 * Gradient stops run top (t = 0) → bottom (t = 1). Warm colours sit low, near
 * the horizon, matching art/references/lighting-and-atmosphere/02.jpg — the
 * references are the visual source of truth (CLAUDE.md §Art References).
 */

/** Morning — fresh, hopeful, soft: soft blue into turquoise into warm cream. */
const MORNING: SkyPalette = {
  bands: 18,
  gradient: [
    { t: 0.0, color: 0x5f92bb },
    { t: 0.22, color: 0x84b2cf },
    { t: 0.44, color: 0xa9cbd6 },
    { t: 0.6, color: 0xc4dcd4 },
    { t: 0.76, color: 0xe6dfc2 },
    { t: 0.9, color: 0xf4e6c4 },
    { t: 1.0, color: 0xecd9b0 },
  ],
  cloud: { highlight: 0xfff3dc, mid: 0xe7dbc8, shadow: 0xb4b1c1 },
  cloudAlpha: 0.85,
  bird: { color: 0x3f5f78, alpha: 0.72 },
  hazeColor: 0xf3e4c4,
  hazeAlpha: 0.34,
  sun: {
    x: 0.19,
    y: 0.44,
    color: 0xffeec2,
    detailColor: 0xfff8e2,
    glowColor: 0xffd894,
    alpha: 1,
    glowAlpha: 0.3,
  },
  moon: {
    // Off duty. A barely-there daytime moon reads as a smudge, not a moon.
    x: 0.82,
    y: 0.18,
    color: 0xe8ecf4,
    detailColor: 0xc6cddd,
    glowColor: 0xbccbe4,
    alpha: 0,
    glowAlpha: 0,
  },
};

/** Day — bright but desaturated. Working hours, comfortable, never garish. */
const DAY: SkyPalette = {
  bands: 16,
  gradient: [
    { t: 0.0, color: 0x548cbe },
    { t: 0.25, color: 0x6fa4cd },
    { t: 0.5, color: 0x7ec0ee }, // --sky-day
    { t: 0.72, color: 0xa8cfe0 },
    { t: 0.88, color: 0xcbdfe4 },
    { t: 1.0, color: 0xc0d6dc },
  ],
  cloud: { highlight: 0xf9fcfd, mid: 0xdeeaf0, shadow: 0xafc4d3 },
  cloudAlpha: 0.9,
  bird: { color: 0x36566f, alpha: 0.8 },
  hazeColor: 0xdbe9ee,
  hazeAlpha: 0.26,
  sun: {
    x: 0.71,
    y: 0.15,
    color: 0xfff5d4,
    detailColor: 0xfffbec,
    glowColor: 0xffe9b0,
    alpha: 1,
    glowAlpha: 0.22,
  },
  moon: {
    x: 0.2,
    y: 0.3,
    color: 0xe8ecf4,
    detailColor: 0xc6cddd,
    glowColor: 0xbccbe4,
    alpha: 0,
    glowAlpha: 0,
  },
};

/**
 * Sunset — the primary visual identity (ART_DIRECTION.md §Sunset).
 * Deep blue overhead falling through lavender, dusty pink and muted orange to
 * peach at the horizon. This is the most beautiful time; give it the most bands.
 */
const SUNSET: SkyPalette = {
  bands: 24,
  gradient: [
    { t: 0.0, color: 0x2b3a63 },
    { t: 0.16, color: 0x424670 },
    { t: 0.32, color: 0x6b5480 },
    { t: 0.46, color: 0x94657f },
    { t: 0.58, color: 0xb87a76 },
    { t: 0.7, color: 0xd9926a },
    { t: 0.82, color: 0xf4a259 }, // --sky-dusk
    { t: 0.92, color: 0xf3c191 },
    { t: 1.0, color: 0xe3a274 },
  ],
  cloud: { highlight: 0xffd9b0, mid: 0xc98d92, shadow: 0x7a5c7c },
  cloudAlpha: 0.92,
  bird: { color: 0x4a3450, alpha: 0.85 },
  hazeColor: 0xf0b07f,
  hazeAlpha: 0.38,
  sun: {
    x: 0.66,
    y: 0.61,
    color: 0xffd7a0,
    detailColor: 0xffeccb,
    glowColor: 0xff9e5e,
    alpha: 1,
    glowAlpha: 0.42,
  },
  moon: {
    // The early moon, already up while the sun goes down. Cozy, not decorative.
    // Bright enough to read as the moon even when a cloud drifts across it —
    // faint enough and it just looks like a bruise on the sky.
    x: 0.15,
    y: 0.14,
    color: 0xeceaf6,
    detailColor: 0xc3c2da,
    glowColor: 0xb3aed4,
    alpha: 0.5,
    glowAlpha: 0.16,
  },
};

/** Night — navy, indigo, violet. Never black. Moonlight tints everything blue. */
const NIGHT: SkyPalette = {
  bands: 15,
  gradient: [
    { t: 0.0, color: 0x0b1e3f }, // --sky-night
    { t: 0.24, color: 0x172549 },
    { t: 0.46, color: 0x26305c },
    { t: 0.66, color: 0x383a68 },
    { t: 0.85, color: 0x474170 },
    { t: 1.0, color: 0x3f3963 },
  ],
  cloud: { highlight: 0x6b77a9, mid: 0x454f7e, shadow: 0x2b3257 },
  cloudAlpha: 0.7,
  // Grounded. A silhouette against a navy sky is noise, and the birds would
  // have roosted hours ago. BirdFlock reads alpha 0 as "no flights tonight".
  bird: { color: 0x2b3257, alpha: 0 },
  hazeColor: 0x2c3a63,
  hazeAlpha: 0.36,
  sun: {
    x: 0.3,
    y: 0.75,
    color: 0xffd7a0,
    detailColor: 0xffeccb,
    glowColor: 0xff9e5e,
    alpha: 0,
    glowAlpha: 0,
  },
  moon: {
    x: 0.7,
    y: 0.19,
    color: 0xdfe6f5,
    detailColor: 0xbfc9e2,
    glowColor: 0x9fb4e0,
    alpha: 1,
    glowAlpha: 0.3,
  },
};

export const SKY_PRESETS: Record<TimeOfDay, SkyPalette> = {
  morning: MORNING,
  day: DAY,
  sunset: SUNSET,
  night: NIGHT,
};

export const DEFAULT_TIME_OF_DAY: TimeOfDay = "sunset";

// --- Interpolation -----------------------------------------------------------

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Blend two packed 0xRRGGBB colours channel-wise. */
export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;

  return (
    (Math.round(lerp(ar, br, t)) << 16) |
    (Math.round(lerp(ag, bg, t)) << 8) |
    Math.round(lerp(ab, bb, t))
  );
}

function lerpCelestial(a: CelestialState, b: CelestialState, t: number): CelestialState {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    color: lerpColor(a.color, b.color, t),
    detailColor: lerpColor(a.detailColor, b.detailColor, t),
    glowColor: lerpColor(a.glowColor, b.glowColor, t),
    alpha: lerp(a.alpha, b.alpha, t),
    glowAlpha: lerp(a.glowAlpha, b.glowAlpha, t),
  };
}

/**
 * Blend the *dynamic* half of two palettes — tints, alphas and celestial
 * positions, all of which are cheap to push at 60 FPS. The gradient itself is a
 * baked texture and cross-fades separately, so it isn't interpolated here.
 */
export function lerpPalette(a: SkyPalette, b: SkyPalette, t: number): SkyPalette {
  return {
    // Not interpolated — the target's ramp is already baked into a texture.
    gradient: b.gradient,
    bands: b.bands,
    cloud: {
      highlight: lerpColor(a.cloud.highlight, b.cloud.highlight, t),
      mid: lerpColor(a.cloud.mid, b.cloud.mid, t),
      shadow: lerpColor(a.cloud.shadow, b.cloud.shadow, t),
    },
    cloudAlpha: lerp(a.cloudAlpha, b.cloudAlpha, t),
    bird: {
      color: lerpColor(a.bird.color, b.bird.color, t),
      alpha: lerp(a.bird.alpha, b.bird.alpha, t),
    },
    hazeColor: lerpColor(a.hazeColor, b.hazeColor, t),
    hazeAlpha: lerp(a.hazeAlpha, b.hazeAlpha, t),
    sun: lerpCelestial(a.sun, b.sun, t),
    moon: lerpCelestial(a.moon, b.moon, t),
  };
}

/**
 * Blend two gradient ramps into a new one by resampling both at even intervals.
 *
 * Used when the time of day is changed again *while* a cross-fade is still
 * running: the ramp currently on screen is a blend of two presets, and this
 * reconstructs it as a single set of stops so the new fade can start from what
 * the viewer is actually looking at rather than snapping backwards.
 */
export function blendGradientStops(
  a: readonly GradientStop[],
  b: readonly GradientStop[],
  t: number,
  samples = 16
): GradientStop[] {
  const count = Math.max(2, samples);
  return Array.from({ length: count }, (_, i) => {
    const u = i / (count - 1);
    return { t: u, color: lerpColor(sampleGradient(a, u), sampleGradient(b, u), t) };
  });
}

/** Sample a gradient ramp at `t` (0–1), interpolating between its stops. */
export function sampleGradient(stops: readonly { t: number; color: number }[], t: number): number {
  if (stops.length === 0) return 0x000000;
  if (t <= stops[0].t) return stops[0].color;

  const last = stops[stops.length - 1];
  if (t >= last.t) return last.color;

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t <= b.t) {
      const span = b.t - a.t;
      return lerpColor(a.color, b.color, span === 0 ? 0 : (t - a.t) / span);
    }
  }

  return last.color;
}
