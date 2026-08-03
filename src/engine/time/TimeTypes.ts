/**
 * Public types for the Time system. Framework-agnostic — no React, no Pixi,
 * no rendering.
 */

/**
 * The six phases of a day in The Waterfront.
 *
 * Note that this is a *longer* vocabulary than the four looks the world is
 * currently painted in (morning / day / sunset / night). `dawn` and `dusk` are
 * new here and have no palette of their own yet — see the note on
 * `PHASE_TO_TIME_OF_DAY` in TimeConfig.
 */
export type TimePhase = "dawn" | "morning" | "noon" | "sunset" | "dusk" | "night";

/** Where a phase begins on the day, as a normalized 0–1 value. */
export interface PhaseSpan {
  phase: TimePhase;
  /** Start of the phase. The phase runs until the next span's start. */
  start: number;
}

/**
 * Everything the clock knows, at one instant.
 *
 * Handed to every subscriber and mirrored into the store. Deliberately a plain
 * value object: a subscriber can keep it, compare it, or throw it away without
 * having to reach back into the clock.
 */
export interface TimeSnapshot {
  /**
   * Normalized time of day. 0 is midnight, 0.5 is midday, and it wraps at 1.
   *
   * Normalized rather than hours because nothing downstream cares what o'clock
   * it is — the sky wants a number to interpolate along, and a value that wraps
   * cleanly at 1 is far easier to reason about than 24 or 1440.
   */
  time: number;
  /** The phase the clock is currently in. */
  phase: TimePhase;
  /** The phase it is heading into. Equal to `phase` outside a transition. */
  nextPhase: TimePhase;
  /**
   * How far the crossing into `nextPhase` has come, 0–1, already eased.
   *
   * 0 for the settled body of a phase, rising to 1 as the next one takes over.
   * A consumer that lerps its own look by this value gets a phase that holds
   * steady and then hands over, rather than one that never stops changing.
   */
  blend: number;
  /** Whole days elapsed since the clock started. */
  day: number;
  paused: boolean;
}

/** Notified whenever the clock moves. Returned unsubscribe stops it. */
export type TimeListener = (snapshot: TimeSnapshot) => void;
