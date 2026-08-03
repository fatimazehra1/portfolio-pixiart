import { PHASE_SPANS, TIME_SETTINGS } from "./TimeConfig";
import type { TimeSettings } from "./TimeConfig";
import type { PhaseSpan, TimeListener, TimePhase, TimeSnapshot } from "./TimeTypes";

/**
 * Wrap any number into [0, 1).
 *
 * Written the long way on purpose. The usual one-liner — `((v % 1) + 1) % 1` —
 * adds 1 to a value that is already in range and then takes it away again, and
 * float64 does not survive the round trip: 0.22 comes back as
 * 0.2199999999999999733. That is invisible almost everywhere, and then it lands
 * exactly on a phase boundary and puts the world in the wrong phase.
 */
const wrap01 = (v: number) => {
  const r = v % 1;
  return r < 0 ? r + 1 : r;
};

/** Forward distance from `a` to `b` around a circle of circumference 1. */
const forward = (a: number, b: number) => wrap01(b - a);

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * The world clock.
 *
 * A single normalized number that advances, wraps at midnight, and reports
 * which phase of the day it is in and how far it has come towards the next one.
 * That is the whole of it — the clock has no opinion about light, colour or
 * weather, and nothing here imports anything that draws.
 *
 * # Why it is deliberately dumb
 * Every system that will eventually care about the time of day — sky, ocean,
 * ground, lanterns, windows, weather, NPCs — needs to agree on *when* it is.
 * The only way that stays true is if the thing they agree on knows nothing
 * about any of them. So this holds a number and hands it out; interpreting it
 * is each system's own business.
 *
 * # Subscribing
 * ```ts
 * const clock = new TimeSystem({ dayDuration: 120 });
 * const off = clock.subscribe(({ phase, blend }) => { ... });
 * clock.update(deltaSeconds);   // drive from the ticker
 * off();
 * ```
 *
 * Subscribers are called whenever the clock has moved meaningfully, and always
 * on a phase change or a pause — so a listener can rely on never missing the
 * moment a phase turns over, however coarse the publish threshold is.
 *
 * Pure: no DOM, no Pixi, no React. TimeManager is what connects it to those.
 */
export class TimeSystem {
  private readonly spans: readonly PhaseSpan[];
  private settings: TimeSettings;

  private timeValue: number;
  private dayValue = 0;
  private pausedValue: boolean;

  private readonly listeners = new Set<TimeListener>();

  /** What was last handed to subscribers, so we only report real movement. */
  private lastPublishedTime = Number.NaN;
  private lastPublishedPhase: TimePhase | null = null;
  private lastPublishedPaused: boolean | null = null;

  constructor(settings: Partial<TimeSettings> = {}, spans: readonly PhaseSpan[] = PHASE_SPANS) {
    this.settings = { ...TIME_SETTINGS, ...settings };
    this.spans = spans;

    this.timeValue = wrap01(this.settings.startTime);
    this.pausedValue = this.settings.startPaused;
  }

  // --- Queries ---------------------------------------------------------------

  /** Normalized time of day, 0–1. */
  get time(): number {
    return this.timeValue;
  }

  get phase(): TimePhase {
    return this.resolve().phase;
  }

  get paused(): boolean {
    return this.pausedValue;
  }

  /** Whole days elapsed since the clock started. */
  get day(): number {
    return this.dayValue;
  }

  /** Real seconds per in-world day. */
  get dayDuration(): number {
    return this.settings.dayDuration;
  }

  /** Everything the clock knows, right now. */
  get snapshot(): TimeSnapshot {
    const { phase, nextPhase, blend } = this.resolve();
    return {
      time: this.timeValue,
      phase,
      nextPhase,
      blend,
      day: this.dayValue,
      paused: this.pausedValue,
    };
  }

  /** Where a phase begins, normalized. */
  phaseStart(phase: TimePhase): number {
    return this.spans.find((span) => span.phase === phase)?.start ?? 0;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Advance the clock. `delta` is real seconds — pass `ticker.deltaMS / 1000`.
   *
   * A no-op while paused, so it is safe to call unconditionally every frame.
   */
  update(delta: number): void {
    if (this.pausedValue || delta <= 0) return;
    this.shift(delta / this.settings.dayDuration);
  }

  /** Jump to a normalized time. Values outside 0–1 wrap. */
  setTime(time: number): void {
    this.timeValue = wrap01(time);
    this.publish();
  }

  /** Move the clock by a normalized amount, forwards or backwards. */
  advance(amount: number): void {
    this.shift(amount);
  }

  /** Jump to the start of a phase, where it sits settled rather than crossing. */
  setPhase(phase: TimePhase): void {
    this.setTime(this.phaseStart(phase));
  }

  setPaused(paused: boolean): void {
    if (this.pausedValue === paused) return;
    this.pausedValue = paused;
    this.publish(true);
  }

  pause(): void {
    this.setPaused(true);
  }

  resume(): void {
    this.setPaused(false);
  }

  togglePause(): void {
    this.setPaused(!this.pausedValue);
  }

  /** Change how long a day takes, in real seconds. */
  setDayDuration(seconds: number): void {
    this.settings = { ...this.settings, dayDuration: Math.max(0.001, seconds) };
  }

  /** Adjust any setting. Merged over the current ones. */
  configure(settings: Partial<TimeSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Listen for changes. Returns an unsubscribe function.
   *
   * The listener is called immediately with the current snapshot, so a system
   * that subscribes halfway through a day is correct from its first frame
   * rather than from the next tick.
   */
  subscribe(listener: TimeListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Drop every subscriber. */
  destroy(): void {
    this.listeners.clear();
  }

  // --- Internal --------------------------------------------------------------

  /** Move by a normalized amount, counting days as it crosses midnight. */
  private shift(amount: number): void {
    if (amount === 0) return;

    const raw = this.timeValue + amount;
    // Math.floor handles both directions: winding backwards past midnight
    // decrements the day count, which keeps scrubbing symmetric.
    this.dayValue += Math.floor(raw);
    this.timeValue = wrap01(raw);

    this.publish();
  }

  /**
   * Work out which phase the clock is in, and how far into the hand-over.
   *
   * The phase itself is found by a plain comparison on the linear axis rather
   * than by modular arithmetic: spans are in ascending order and cover the
   * whole circle, so the current phase is simply the last one that has started,
   * and anything before the first start is still in the final span, which
   * wrapped through midnight.
   *
   * That matters more than it looks. Doing the lookup modularly puts a `%` and
   * an addition between a boundary value and the comparison, and a time landing
   * exactly on a boundary then falls to whichever side a few ULPs of floating
   * point send it. Comparing starts directly makes a boundary belong to the
   * phase it opens, every time. Only the blend, where a rounding error is
   * invisible, is computed modularly.
   */
  private resolve(): { phase: TimePhase; nextPhase: TimePhase; blend: number } {
    const count = this.spans.length;
    const t = this.timeValue;

    let index = count - 1;
    for (let i = 0; i < count; i++) {
      if (this.spans[i].start <= t) index = i;
      else break;
    }

    const span = this.spans[index];
    const next = this.spans[(index + 1) % count];

    const length = forward(span.start, next.start) || 1;
    const elapsed = forward(span.start, t);

    // Never let the hand-over be wider than the phase it belongs to, or a short
    // phase would begin already half-way into the following one.
    const width = Math.min(this.settings.transitionWidth, length * 0.9);
    const remaining = Math.max(0, length - elapsed);

    const blend = remaining >= width ? 0 : smoothstep(clamp01((width - remaining) / width));

    return {
      phase: span.phase,
      nextPhase: blend > 0 ? next.phase : span.phase,
      blend,
    };
  }

  /**
   * Tell subscribers, if there is anything worth telling them.
   *
   * A phase turning over or the clock pausing always reports, however small the
   * movement — those are the edges a listener would be most upset to miss.
   */
  private publish(force = false): void {
    if (this.listeners.size === 0) {
      this.lastPublishedTime = this.timeValue;
      return;
    }

    const snapshot = this.snapshot;

    const movedFar =
      Number.isNaN(this.lastPublishedTime) ||
      forward(this.lastPublishedTime, snapshot.time) >= this.settings.publishThreshold ||
      forward(snapshot.time, this.lastPublishedTime) >= this.settings.publishThreshold;

    const changedPhase = snapshot.phase !== this.lastPublishedPhase;
    const changedPause = snapshot.paused !== this.lastPublishedPaused;

    if (!force && !movedFar && !changedPhase && !changedPause) return;

    this.lastPublishedTime = snapshot.time;
    this.lastPublishedPhase = snapshot.phase;
    this.lastPublishedPaused = snapshot.paused;

    for (const listener of this.listeners) listener(snapshot);
  }
}
