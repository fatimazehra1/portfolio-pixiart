import type { PhaseSpan, TimePhase } from "./TimeTypes";
import type { TimeOfDay } from "../sky";

/**
 * Time tuning — the shape of a day and how fast it passes.
 */

/**
 * The day, carved into six phases, weighted for a visitor rather than for a
 * planet.
 *
 * Starts are normalized (0 = midnight) and listed in order; each phase runs
 * until the next one begins, and `night` wraps back around through midnight.
 *
 * | phase   | share |  at 180s | what it looks like            |
 * |---------|-------|----------|-------------------------------|
 * | dawn    |  8%   |   14.4s  | soft pink                     |
 * | morning |  8%   |   14.4s  | pale gold climbing into blue  |
 * | noon    | 55%   |   99.0s  | clear saturated blue          |
 * | sunset  |  9%   |   16.2s  | warm yellow-gold              |
 * | dusk    |  8%   |   14.4s  | orange into deep coral        |
 * | night   | 12%   |   21.6s  | deep blue-purple, lit windows |
 *
 * Which is: **blue day 55%, the two transitions 33% between them, night 12%.**
 *
 * # Why `noon` alone carries the 55%
 * An earlier pass spent the 55% on `morning` *plus* `noon` and left the blue
 * itself at 40%. In a three-minute loop that is the difference between a world
 * whose ordinary state is a clear blue sky and one that is always on its way
 * somewhere — and the ordinary state is the one the work is drawn to be seen
 * in. `morning` is a transition and is now weighted like one.
 *
 * # Why night is short
 * Night is the only phase that can make a visitor think the page failed to
 * load. It gets long enough to be a phase and no longer.
 *
 * Dawn is one phase and dusk is two (`sunset` into `dusk`), which is not an
 * asymmetry — evening light *is* two looks where morning light is one, and the
 * two sides come out within a percent of each other.
 */
export const PHASE_SPANS: readonly PhaseSpan[] = [
  { phase: "dawn", start: 0.06 },
  { phase: "morning", start: 0.14 },
  { phase: "noon", start: 0.22 },
  { phase: "sunset", start: 0.77 },
  { phase: "dusk", start: 0.86 },
  { phase: "night", start: 0.94 },
];

/** The phases in order, for cycling and for the dev shortcuts. */
export const PHASE_ORDER: readonly TimePhase[] = PHASE_SPANS.map((span) => span.phase);

export interface TimeSettings {
  /**
   * Real seconds for one full loop of the day.
   *
   * Three minutes, and it is an accelerated loop rather than a clock: this
   * world has never read the visitor's real time of day and does not start
   * doing so here. A page that opens in the dark because the visitor happens
   * to be up late is a page that hides the work for the length of the visit,
   * and the visitor cannot tell that from a bug.
   *
   * Three minutes is chosen against how long anyone actually stays. Much
   * shorter and the sky is visibly racing, which reads as a screensaver; much
   * longer and most visitors would see one phase and leave.
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
  dayDuration: 180,
  // Early in the blue day, and that is a correction. Opening at the top of the
  // evening put night twenty-seven seconds after load and the blue day nearly
  // two minutes after it — so the state most visitors actually saw was the
  // dark one, and the sky they never reached was the one the islands are
  // painted for. From here the loop runs day, gold, coral, night, dawn, day,
  // and every one of them lands inside three minutes.
  startTime: 0.3,
  startPaused: false,
  // Seven seconds of the three-minute loop, and inside the shortest phase
  // (dawn, morning and dusk, at 0.08) with room to spare. Wide enough that a
  // hand-over is a change you watch rather than one you catch out of the
  // corner of your eye; narrow enough that each phase still has a settled
  // stretch of its own to be looked at in.
  transitionWidth: 0.04,
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
