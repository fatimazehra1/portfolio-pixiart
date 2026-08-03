import { LightingSystem } from "./LightingSystem";
import { LIGHT_PRESETS } from "./LightPresets";
import { LIGHTING_SETTINGS } from "./LightingConfig";
import type {
  LightPreset,
  LightingListener,
  LightingSettings,
  LightingState,
} from "./LightingConfig";
import type { DayNightState } from "../dayNight";
import type { TimePhase } from "../time"; // type only; see LightPresets

/**
 * Something that hands out the look of the world and lets you listen to it.
 *
 * Structural, and deliberately the *only* thing this system will accept as an
 * input. A `TimeSystem` publishes a `TimeSnapshot`, not a `DayNightState`, so
 * it will not fit here — the rule that lighting never reads the clock directly
 * is enforced by the type rather than by a comment asking nicely.
 */
export interface DayNightSource {
  subscribe(listener: (state: DayNightState) => void): () => void;
}

export interface LightingManagerOptions {
  /** The day/night cycle. Read only — lighting never drives it. */
  dayNight: DayNightSource;
  /** Override any of the six lighting presets. */
  presets?: Record<TimePhase, LightPreset>;
  settings?: LightingSettings;
  /** Notified whenever the light changes. */
  onChange?: LightingListener;
}

/**
 * Wires the lighting controller to the cycle.
 *
 * Subscribes, recalculates, forwards. It owns no update loop and ticks nothing
 * — the cycle publishes when the clock moves it, and this answers.
 *
 * # Usage
 * ```ts
 * const lighting = new LightingManager({ dayNight: cycle });
 * lighting.subscribe((light) => lamp.setIntensity(localIntensity(1, light)));
 * lighting.destroy();
 * ```
 */
export class LightingManager {
  /** The controller itself. Subscribe here for anything that needs the light. */
  readonly system: LightingSystem;

  private unsubscribeSource: (() => void) | null = null;
  private unsubscribeChange: (() => void) | null = null;

  constructor(options: LightingManagerOptions) {
    this.system = new LightingSystem(
      options.presets ?? LIGHT_PRESETS,
      options.settings ?? LIGHTING_SETTINGS
    );

    if (options.onChange) this.unsubscribeChange = this.system.subscribe(options.onChange);

    // Fires immediately with the cycle's current state, so the light is right
    // from the first frame rather than from the next phase change.
    this.unsubscribeSource = options.dayNight.subscribe((state) => {
      this.system.apply(state);
    });
  }

  /** The light as last calculated, or null before the first update. */
  get state(): LightingState | null {
    return this.system.state;
  }

  /** Listen for changes. Returns an unsubscribe function. */
  subscribe(listener: LightingListener): () => void {
    return this.system.subscribe(listener);
  }

  destroy(): void {
    this.unsubscribeSource?.();
    this.unsubscribeSource = null;
    this.unsubscribeChange?.();
    this.unsubscribeChange = null;
    this.system.destroy();
  }
}
