import type { PhaseSpan, TimePhase } from "./TimeTypes";
import type { TimeOfDay } from "../sky";

/**
 * Time tuning — the shape of a day and how fast it passes.
 */

/**
 * The day, carved into six phases.
 *
 * Starts are normalized (0 = midnight) and listed in order; each phase runs
 * until the next one begins, and `night` wraps back around through midnight.
 * In wall-clock terms:
 *
 * | phase   | from  | to    |
 * |---------|-------|-------|
 * | dawn    | 05:17 | 07:12 |
 * | morning | 07:12 | 10:34 |
 * | noon    | 10:34 | 17:17 |
 * | sunset  | 17:17 | 19:12 |
 * | dusk    | 19:12 | 21:07 |
 * | night   | 21:07 | 05:17 |
 *
 * The two long phases are `noon` and `night`, and the four short ones are all
 * transitions. That's on purpose: the interesting light is at the edges of the
 * day, and a world that spent equal time in each phase would spend most of it
 * somewhere unremarkable.
 */
export const PHASE_SPANS: readonly PhaseSpan[] = [
  { phase: "dawn", start: 0.22 },
  { phase: "morning", start: 0.3 },
  { phase: "noon", start: 0.44 },
  { phase: "sunset", start: 0.72 },
  { phase: "dusk", start: 0.8 },
  { phase: "night", start: 0.88 },
];

/** The phases in order, for cycling and for the dev shortcuts. */
export const PHASE_ORDER: readonly TimePhase[] = PHASE_SPANS.map((span) => span.phase);

export interface TimeSettings {
  /**
   * Real seconds for one full in-world day.
   *
   * Short by default because this is a development tool as much as a clock —
   * five minutes is long enough that a phase change reads as a change rather
   * than a flicker, and short enough that you can watch a whole day without
   * losing interest. A shipped world would want this far longer.
   */
  dayDuration: number;
  /** Where the clock starts, normalized. */
  startTime: number;
  /** Whether the clock begins paused. */
  startPaused: boolean;
  /**
   * How long the crossing into the next phase takes, in normalized day units.
   *
   * This is the width of the hand-over at the *end* of every phase. Smaller
   * values give longer settled stretches and quicker changes; larger values
   * give a day that is always gently in motion. Clamped per phase so it can
   * never be wider than the phase it belongs to.
   */
  transitionWidth: number;
  /**
   * How far the clock has to move before subscribers are told, in normalized
   * day units. Phase and pause changes always report regardless.
   */
  publishThreshold: number;
}

export const TIME_SETTINGS: TimeSettings = {
  dayDuration: 300,
  // Sunset: the project's visual identity, and where the world currently opens.
  startTime: 0.75,
  startPaused: false,
  // ~0.7 of an hour. Comfortably inside the shortest phase (dawn, at 0.08).
  transitionWidth: 0.03,
  publishThreshold: 0.001,
};

/**
 * Development keyboard shortcuts, by `KeyboardEvent.code`.
 *
 * Chosen to stay clear of the camera's A / D / arrows, and of anything a
 * future interaction key is likely to want.
 */
export interface TimeKeyBindings {
  /** Jump to the start of a phase. Positionally matched to `PHASE_ORDER`. */
  phaseDigits: readonly string[];
  /** Scrub time backwards / forwards. */
  scrubBack: string;
  scrubForward: string;
  /** Pause and resume. */
  togglePause: string;
}

export const TIME_KEYS: TimeKeyBindings = {
  phaseDigits: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6"],
  scrubBack: "BracketLeft",
  scrubForward: "BracketRight",
  togglePause: "KeyP",
};

/** How far one scrub press moves the clock, in normalized day units. */
export const SCRUB_STEP = 0.01;
/** Multiplier when scrubbing with shift held. */
export const SCRUB_FAST = 5;

/**
 * A suggested mapping from the six phases onto the four looks the world is
 * currently painted in.
 *
 * **Nothing uses this yet, and wiring it is a visual decision, not a clock
 * one.** It is here because the mismatch is the first thing anyone connecting
 * this system will hit, and it is better stated than discovered: `dawn` and
 * `dusk` have no palette of their own, so they currently have to borrow one.
 * The honest fix is two new sky presets rather than this table.
 */
export const PHASE_TO_TIME_OF_DAY: Record<TimePhase, TimeOfDay> = {
  dawn: "morning",
  morning: "morning",
  noon: "day",
  sunset: "sunset",
  dusk: "sunset",
  night: "night",
};
