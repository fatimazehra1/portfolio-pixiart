/**
 * Every number the sound makes, in one file.
 *
 * The world has no audio assets and does not want any: three sounds at a few
 * hundred bytes of arithmetic beat three files at a few hundred kilobytes, and
 * a synthesised ocean loops without a seam because there is no seam. What that
 * costs is that the sounds are described here as frequencies and envelopes
 * rather than heard, so the constants carry the intent.
 */

/** How loud the whole world is when the speaker is on. Deliberately quiet. */
export const MASTER_GAIN = 0.34;

/** Seconds the master gain takes to come up, and to go back down. */
export const FADE_IN = 1.6;
export const FADE_OUT = 0.7;

/** The ocean: filtered noise, breathing. */
export const OCEAN = {
  /** Length of the noise buffer, in seconds. Long enough not to hear a period. */
  bufferSeconds: 6,
  /** Standing level of the surf bed. */
  gain: 0.5,
  /** Lowpass corner, in hertz. Surf is dull; anything brighter is static. */
  cutoff: 620,
  /** How far the corner wanders either side of that, in hertz. */
  cutoffSwing: 260,
  /** How far the level swells either side of `gain`, as a fraction of it. */
  gainSwing: 0.42,
  /** Seconds per swell. Slow: a wave set, not a tremolo. */
  swellSeconds: 11,
  /** The cutoff wanders on its own, longer cycle, so the two never lock. */
  cutoffSeconds: 17,
} as const;

/** The hover blip: a soft wooden tick, not a UI beep. */
export const HOVER = {
  frequency: 660,
  /** Drops to this over the decay, which is what makes it a tick. */
  endFrequency: 440,
  gain: 0.1,
  attack: 0.004,
  decay: 0.09,
  /** Two islands under the pointer inside this many seconds only tick once. */
  throttle: 0.08,
} as const;

/** The door: a low body, and air moving through the gap over the top of it. */
export const DOOR = {
  /** The thunk. A triangle falling through its own octave. */
  frequency: 148,
  endFrequency: 74,
  gain: 0.16,
  decay: 0.42,
  /** The air. Noise through a bandpass that opens as the door swings. */
  airGain: 0.09,
  airFrom: 380,
  airTo: 1500,
  airDecay: 0.55,
} as const;
