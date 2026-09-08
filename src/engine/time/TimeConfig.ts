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
 * | phase   | share | what it is                  |
 * |---------|-------|-----------------------------|
 * | dawn    | 15%   | the morning transition      |
 * | morning | 15%   | full colour                 |
 * | noon    | 40%   | full colour                 |
 * | sunset  | 7.5%  | the evening transition      |
 * | dusk    | 7.5%  | the evening transition      |
 * | night   | 15%   | lit windows, never black    |
 *
 * Which is: **day 55%, the two transitions 30% between them, night 15%.**
 *
 * # Why it is weighted this way and not evenly
 * This is a portfolio, and the work on these islands is drawn in full colour.
 * An even six-way split would spend nearly half of every loop in states that
 * hide it. Day dominates because day is when the world is legible; the
 * transitions get nearly a third between them because they are the best the
 * world looks; and night is short and bright, because night is the only phase
 * that can make a visitor think the page failed to load.
 *
 * Dawn is one phase and dusk is two (`sunset` into `dusk`), which is not an
 * asymmetry — evening light *is* two looks where morning light is one, and
 * both sides get the same 15% of the loop.
 */
export const PHASE_SPANS: readonly PhaseSpan[] = [
  { phase: "dawn", start: 0.075 },
  { phase: "morning", start: 0.225 },
  { phase: "noon", start: 0.375 },
  { phase: "sunset", start: 0.775 },
  { phase: "dusk", start: 0.85 },
  { phase: "night", start: 0.925 },
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
  // Sunset: the project's visual identity, and where the world currently opens.
  // The top of the evening transition. Most visitors stay under three
  // minutes, so the opening state is the one they will actually see, and it
  // opens on the best-looking stretch of the loop rather than in the middle of
  // a flat noon. From here the loop runs sunset, dusk, night, dawn, day.
  startTime: 0.775,
  startPaused: false,
  // Nine seconds of the three-minute loop, and comfortably inside the
  // shortest phase (sunset and dusk, at 0.075). Wide enough that a hand-over
  // is a change you watch rather than one you catch out of the corner of your
  // eye, which is the whole of "dawn and dusk must not flash past".
  transitionWidth: 0.05,
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
