import { TimeSystem } from "./TimeSystem";
import { PHASE_ORDER, SCRUB_FAST, SCRUB_STEP, TIME_KEYS } from "./TimeConfig";
import type { TimeSettings } from "./TimeConfig";
import type { TimeListener, TimeSnapshot } from "./TimeTypes";

export interface TimeManagerOptions {
  /** Overrides for any of the clock's settings. */
  settings?: Partial<TimeSettings>;
  /**
   * Attach the development keyboard shortcuts.
   *
   * Defaults to on outside production. These are a debugging tool, not a
   * feature — nobody visiting the finished world should be able to seize
   * control of the sun.
   */
  devShortcuts?: boolean;
  /** Notified whenever the clock moves. Shorthand for `time.subscribe`. */
  onChange?: TimeListener;
}

/**
 * The clock, connected to the outside world.
 *
 * `TimeSystem` is deliberately pure — it has no idea a keyboard or a browser
 * exists. This is the piece that gives it hands: it owns a clock, drives the
 * development shortcuts, and hands changes on to whoever asked. Everything with
 * a side effect lives here, which is what keeps the clock itself testable and
 * portable.
 *
 * # Development shortcuts
 * | keys        | effect                          |
 * |-------------|---------------------------------|
 * | `1`–`6`     | jump to dawn … night            |
 * | `[` / `]`   | scrub back / forward (shift ×5) |
 * | `P`         | pause and resume                |
 *
 * # Usage
 * ```ts
 * const time = new TimeManager({ onChange: (t) => store.setTime(t) });
 * app.ticker.add((t) => time.update(t.deltaMS / 1000));
 * time.destroy();
 * ```
 */
export class TimeManager {
  /** The clock itself. Subscribe here, or read it directly. */
  readonly time: TimeSystem;

  private readonly devShortcuts: boolean;
  private unsubscribe: (() => void) | null = null;
  private attached = false;

  constructor(options: TimeManagerOptions = {}) {
    this.time = new TimeSystem(options.settings);
    this.devShortcuts = options.devShortcuts ?? process.env.NODE_ENV !== "production";

    if (options.onChange) this.unsubscribe = this.time.subscribe(options.onChange);
    if (this.devShortcuts) this.attach();
  }

  // --- Queries ---------------------------------------------------------------

  get snapshot(): TimeSnapshot {
    return this.time.snapshot;
  }

  /** Whether the development shortcuts are live. */
  get shortcutsEnabled(): boolean {
    return this.attached;
  }

  // --- Commands --------------------------------------------------------------

  /** Advance the clock. `delta` is real seconds. */
  update(delta: number): void {
    this.time.update(delta);
  }

  /** Listen for changes. Returns an unsubscribe function. */
  subscribe(listener: TimeListener): () => void {
    return this.time.subscribe(listener);
  }

  /** Detach listeners and drop subscribers. Safe to call twice. */
  destroy(): void {
    if (this.attached) {
      this.attached = false;
      window.removeEventListener("keydown", this.onKeyDown);
    }

    this.unsubscribe?.();
    this.unsubscribe = null;
    this.time.destroy();
  }

  // --- Internal --------------------------------------------------------------

  private attach(): void {
    if (this.attached || typeof window === "undefined") return;
    this.attached = true;
    window.addEventListener("keydown", this.onKeyDown);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    // Never steal keys from someone who is typing.
    if (isTextEntry(event.target)) return;
    // Leave browser and OS shortcuts alone.
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const digit = PHASE_ORDER[TIME_KEYS.phaseDigits.indexOf(event.code)];
    if (digit) {
      this.time.setPhase(digit);
      event.preventDefault();
      return;
    }

    switch (event.code) {
      case TIME_KEYS.scrubBack:
        this.time.advance(-SCRUB_STEP * (event.shiftKey ? SCRUB_FAST : 1));
        event.preventDefault();
        break;

      case TIME_KEYS.scrubForward:
        this.time.advance(SCRUB_STEP * (event.shiftKey ? SCRUB_FAST : 1));
        event.preventDefault();
        break;

      case TIME_KEYS.togglePause:
        this.time.togglePause();
        event.preventDefault();
        break;

      default:
        break;
    }
  };
}

/** True if the event landed in something the user is typing into. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
