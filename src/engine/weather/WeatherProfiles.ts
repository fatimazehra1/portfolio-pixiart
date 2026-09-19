import type { WeatherKind } from "../scene";

/**
 * Every weather effect in the world, as data.
 *
 * There is exactly one emitter (`WeatherLayer`) and it can draw all of these.
 * That is the constraint the brief set — "one implementation, N configs, no
 * per-building special cases" — and it is worth stating why it is worth
 * keeping: the moment rain gets its own class, rain and fog stop being
 * comparable, and the language of "weather encodes status" quietly becomes nine
 * bespoke effects that happen to be named after weather.
 *
 * A new effect is an entry in this table. It is never a new file.
 *
 * All sizes and speeds are in **art pixels**, on the shared grid, so an effect
 * looks the same density at every viewport size.
 */
export interface WeatherProfile {
  /**
   * Particles per 10,000 square art pixels, at full intensity.
   *
   * Per unit area rather than a flat count, so the field is as busy on an
   * ultrawide monitor as on a laptop instead of thinning out across it.
   */
  density: number;

  /** Particle size in art pixels, as a [min, max] range. */
  size: [number, number];
  /** How many times taller than wide. 1 is a dot; higher is a streak of rain. */
  streak: number;

  color: number;
  alpha: [number, number];

  /** Drift, in art pixels per second, as [min, max] ranges. */
  vx: [number, number];
  vy: [number, number];

  /** Side-to-side wander: how far, and how fast. */
  sway: { amount: [number, number]; rate: [number, number] };

  /**
   * The band of the view the effect lives in, 0–1 from the top.
   *
   * Fog sits low and rain fills everything. Confining an effect to a band is
   * most of what makes it read as being *somewhere* rather than as a filter
   * laid over the picture.
   */
  band: [number, number];

  /**
   * A wash laid over the whole field, under the particles.
   *
   * This is what actually does the work for fog and haze — the particles are
   * texture on top of it. Alpha 0 means no wash at all, which is what "clear"
   * is made of.
   */
  veil: { color: number; alpha: number };

  /**
   * Whether the effect makes its own light.
   *
   * Emissive effects are driven by the *local light multiplier* rather than
   * dimmed by the ambient — welding sparks are as bright at noon as at midnight
   * and only look brighter at night because everything around them is darker.
   */
  emissive: boolean;

  /**
   * Turns the veil into an intermittent flash instead of a steady wash.
   *
   * The one behaviour a particle field cannot express, and the reason it is a
   * property rather than a second class: lightning is a veil whose alpha is a
   * function of time rather than a constant. Everything else about it — colour,
   * band, how it blends between scenes — is already what a veil does.
   *
   * Omit for steady weather.
   */
  flash?: {
    /** Average seconds between strikes. */
    period: number;
    /** How long one strike lasts, in seconds. Short; a flash is not a fade. */
    duration: number;
    /** Peak veil alpha at the top of a strike. */
    peak: number;
    /**
     * How many flickers within one strike.
     *
     * A single clean ramp reads as a light being switched on. Real lightning
     * stutters, and two or three beats inside the same strike is the whole
     * difference between a flash and a lamp.
     */
    beats: number;
  };
}

/**
 * Clear is a real profile, not the absence of one.
 *
 * Giving "no weather" an entry means the blend between an active scene and a
 * foggy one is a blend between two profiles rather than a special case for the
 * missing side — which is how you avoid a fog bank that pops on at a boundary.
 */
export const WEATHER_PROFILES: Record<WeatherKind, WeatherProfile> = {
  clear: {
    density: 0,
    size: [1, 1],
    streak: 1,
    color: 0xffffff,
    alpha: [0, 0],
    vx: [0, 0],
    vy: [0, 0],
    sway: { amount: [0, 0], rate: [0, 0] },
    band: [0, 1],
    veil: { color: 0xffffff, alpha: 0 },
    emissive: false,
  },

  /** Distance, not weather. A thin cool wash low down, and almost nothing in it. */
  haze: {
    density: 6,
    size: [2, 5],
    streak: 1,
    color: 0xdfe9f2,
    alpha: [0.06, 0.16],
    vx: [2, 6],
    vy: [-1, 1],
    sway: { amount: [1, 3], rate: [0.1, 0.25] },
    band: [0.45, 0.85],
    veil: { color: 0xc8d8e6, alpha: 0.2 },
    emissive: false,
  },

  /** Thick enough to soften a silhouette. Slow, wide, low, and mostly wash. */
  fog: {
    density: 14,
    size: [6, 16],
    streak: 1,
    color: 0xd8e2ea,
    alpha: [0.07, 0.16],
    vx: [3, 9],
    vy: [-2, 2],
    sway: { amount: [2, 5], rate: [0.08, 0.2] },
    band: [0.4, 1],
    veil: { color: 0xb9c9d6, alpha: 0.42 },
    emissive: false,
  },

  /** Not a storm. Fine, close-set, near-vertical, and quiet. */
  drizzle: {
    density: 70,
    size: [1, 1],
    streak: 4,
    color: 0xa9c2d4,
    alpha: [0.2, 0.42],
    vx: [-14, -6],
    vy: [110, 165],
    sway: { amount: [0, 1], rate: [0.4, 0.9] },
    band: [0, 1],
    veil: { color: 0x8fa6b8, alpha: 0.26 },
    emissive: false,
  },

  /**
   * Proper rain. Not assigned to any scene — nothing on the shore is sad
   * enough to be rained on by default — it is what the visitor asks for from
   * the sky controls. Long, fast, slanted streaks and a darker wash than
   * drizzle, so it reads as weather arriving rather than a filter.
   */
  rain: {
    density: 150,
    size: [1, 1],
    streak: 7,
    color: 0xbcd3e4,
    alpha: [0.3, 0.6],
    vx: [-48, -30],
    vy: [260, 340],
    sway: { amount: [0, 1], rate: [0.4, 0.9] },
    band: [0, 1],
    veil: { color: 0x51677c, alpha: 0.34 },
    emissive: false,
  },

  /** Construction dust: warm, heavy, drifting sideways more than falling. */
  dust: {
    density: 26,
    size: [1, 3],
    streak: 1,
    color: 0xd8c39a,
    alpha: [0.1, 0.26],
    vx: [8, 22],
    vy: [-6, 10],
    sway: { amount: [2, 6], rate: [0.3, 0.7] },
    band: [0.5, 0.95],
    veil: { color: 0xc4ae87, alpha: 0.16 },
    emissive: false,
  },

  /** Welding sparks. Few, small, bright, and rising before they die. */
  embers: {
    density: 7,
    size: [1, 2],
    streak: 1,
    color: 0xffcf7a,
    alpha: [0.4, 0.95],
    vx: [-6, 6],
    vy: [-34, -12],
    sway: { amount: [1, 3], rate: [0.8, 1.8] },
    band: [0.55, 0.92],
    veil: { color: 0xffb45c, alpha: 0 },
    emissive: true,
  },

  /**
   * Ideas striking. Not a storm — no rain, no cloud, no threat.
   *
   * A wide silent flash over otherwise clear air, and nothing between strikes.
   * The whole point is the gap: something arrives, the sky lights up, and then
   * it is an ordinary afternoon again until the next one.
   */
  lightning: {
    density: 0,
    size: [1, 1],
    streak: 1,
    color: 0xffffff,
    alpha: [0, 0],
    vx: [0, 0],
    vy: [0, 0],
    sway: { amount: [0, 0], rate: [0, 0] },
    band: [0, 0.7],
    veil: { color: 0xdfe4ff, alpha: 1 },
    emissive: true,
    flash: { period: 6.5, duration: 0.42, peak: 0.5, beats: 3 },
  },
};

/** Draw order, back to front. Washes first, sparks last. */
export const WEATHER_ORDER: readonly WeatherKind[] = [
  "clear",
  "haze",
  "fog",
  "drizzle",
  "rain",
  "dust",
  "embers",
  "lightning",
];

/**
 * How fast a weather layer fades in and out, as an exponential rate per second.
 *
 * Slower than the palette grade on purpose. Light changes as you walk into a
 * place; weather takes a moment to arrive, and rain that switched on the
 * instant you crossed a line would announce the boundary the falloff exists to
 * hide.
 */
export const WEATHER_SMOOTHING = 1.4;

/**
 * How much bigger than the viewport the particle field is baked, per side.
 *
 * Particles have to exist outside the view or they visibly enter from the
 * edges. It also buys headroom for zoom, since the field is screen-space and a
 * zoomed view would otherwise see past it.
 */
export const FIELD_MARGIN = 0.25;
