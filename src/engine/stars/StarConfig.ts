import type { TimePhase } from "../time";

/**
 * Star tuning — how many, how big, how bright, and when they are out.
 */

/** Stars are one, two or three pixels. Nothing is ever scaled to get there. */
export type StarSize = 1 | 2 | 3;

export interface StarSizeClass {
  size: StarSize;
  /** Relative share of the field. */
  weight: number;
  /** Base brightness range for this size, before twinkle and horizon fade. */
  brightness: [number, number];
}

/**
 * The size mix.
 *
 * Overwhelmingly one-pixel: a real sky is mostly faint points with a handful of
 * bright ones, and an even spread of sizes reads as confetti rather than as
 * stars. The three-pixel class is deliberately rare — those are the ones the
 * eye picks out and makes constellations from.
 */
export const STAR_SIZES: readonly StarSizeClass[] = [
  { size: 1, weight: 0.7, brightness: [0.28, 0.72] },
  { size: 2, weight: 0.24, brightness: [0.45, 0.9] },
  { size: 3, weight: 0.06, brightness: [0.65, 1] },
];

/**
 * Star colours.
 *
 * Barely different from each other on purpose — enough that the field isn't one
 * flat tone, not so much that anyone would call it colourful. The cool white
 * matches the moon's disc so the two read as the same night.
 */
export const STAR_TINTS: readonly { color: number; weight: number }[] = [
  { color: 0xdfe6f5, weight: 0.62 }, // cool white, as the moon
  { color: 0xf2e6d6, weight: 0.22 }, // faintly warm
  { color: 0xc3d4f2, weight: 0.16 }, // faintly blue
];

/**
 * How visible the field is in each phase.
 *
 * Zero everywhere except dusk and night, so the fade in and out happens across
 * the day/night blend at those two boundaries and nowhere else. Dusk is short
 * of full: the sky is still violet then, and stars that read at full strength
 * against it look like they were switched on rather than uncovered.
 */
export const PHASE_VISIBILITY: Record<TimePhase, number> = {
  dawn: 0,
  morning: 0,
  noon: 0,
  sunset: 0,
  dusk: 0.55,
  night: 1,
};

export interface StarSettings {
  /** How many stars. Hundreds — see the note on performance in StarField. */
  count: number;
  /** Seed for placement, size, brightness and twinkle. Same sky every reload. */
  seed: number;

  /**
   * How far down the sky stars may reach, as a fraction of its height.
   *
   * Should sit above the sky's own horizon (0.68 by default) — below that is
   * haze, and then water. Stars printed over the sea would give the game away.
   */
  horizon: number;
  /**
   * Where the horizon dimming begins, as a fraction of sky height. Between here
   * and `horizon` a star's brightness falls to nothing, which is the air
   * thickening rather than the stars ending.
   */
  fadeStart: number;

  /** Twinkle rate range, radians per second. Slow — this is a calm sky. */
  twinkleRate: [number, number];
  /**
   * How much of a star's brightness the twinkle takes, 0–1.
   *
   * Small by design. The brief says slight, and a field of hundreds of points
   * all breathing hard is a christmas tree, not a night.
   */
  twinkleDepth: [number, number];
}

export const STAR_SETTINGS: StarSettings = {
  count: 420,
  seed: 0x57a2,
  horizon: 0.66,
  fadeStart: 0.42,
  twinkleRate: [0.35, 1.4],
  twinkleDepth: [0.12, 0.3],
};

export interface StarsOptions {
  /** Overrides for any of the tuning values. */
  settings?: Partial<StarSettings>;
  /**
   * Global motion multiplier. 0 for `prefers-reduced-motion: reduce`: the
   * twinkle stops and every star holds its own brightness, so the sky is still
   * a sky rather than a frozen animation.
   */
  motionScale?: number;
}

/**
 * The label of the sky child the field is inserted in front of.
 *
 * Behind the clouds and behind the moon, which is exactly where the sun sits in
 * the sky's own draw order — so putting the stars immediately before it
 * satisfies both requirements at once, without the sky needing to know.
 */
export const MOUNT_BEFORE_LABEL = "sky:sun";
