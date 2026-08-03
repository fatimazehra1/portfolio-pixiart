import { DayNightSystem } from "./DayNightSystem";
import type { DayNightListener, DayNightState } from "./DayNightSystem";
import { COLOR_PRESETS } from "./ColorPresets";
import { DAY_NIGHT_SETTINGS } from "./DayNightConfig";
import type { DayNightSettings, PhasePreset } from "./DayNightConfig";
import type { TimePhase, TimeSnapshot } from "../time";
import type { SkyPalette } from "../sky";
import type { OceanPalette } from "../ocean";
import type { GroundPalette } from "../ground";

/**
 * Anything that can be driven by the cycle.
 *
 * Structural rather than a concrete class, so the manager is coupled to a
 * three-line contract instead of to the sky, the sea and the land.
 */
export interface PaletteTarget<P> {
  setBlendedPalette(from: P, to: P, blend: number): void;
}

/** Something that hands out time and lets you listen to it. */
export interface TimeSource {
  subscribe(listener: (snapshot: TimeSnapshot) => void): () => void;
}

export interface DayNightManagerOptions {
  /** The clock. Read only — the cycle never moves it. */
  time: TimeSource;
  sky?: PaletteTarget<SkyPalette>;
  ocean?: PaletteTarget<OceanPalette>;
  ground?: PaletteTarget<GroundPalette>;
  /** Override any of the six presets. */
  presets?: Record<TimePhase, PhasePreset>;
  settings?: DayNightSettings;
  /** Notified on every change, after the systems have been updated. */
  onChange?: DayNightListener;
}

/**
 * Wires the cycle to the world.
 *
 * Subscribes to the clock, asks DayNightSystem what that moment looks like, and
 * pushes the result into whichever systems it was given. It has no update loop
 * of its own and never ticks anything — the clock is driven elsewhere, and this
 * simply answers when it moves.
 *
 * # Why nothing hard-switches
 * Every target is handed *both* endpoints and a blend, on every change, rather
 * than being told "you are now sunset". Between phases those endpoints differ
 * and the blend walks from 0 to 1; within a phase they are the same object and
 * the blend is 0. There is no code path that assigns a look — only one that
 * positions the world between two of them — so a visible jump would have to
 * come from the clock, not from here.
 *
 * # Usage
 * ```ts
 * const cycle = new DayNightManager({ time: timeManager.time, sky, ocean, ground });
 * cycle.destroy();
 * ```
 */
export class DayNightManager {
  /** The cycle itself. Subscribe here for anything else that wants the look. */
  readonly system: DayNightSystem;

  private readonly sky: PaletteTarget<SkyPalette> | undefined;
  private readonly ocean: PaletteTarget<OceanPalette> | undefined;
  private readonly ground: PaletteTarget<GroundPalette> | undefined;

  private unsubscribeTime: (() => void) | null = null;
  private unsubscribeChange: (() => void) | null = null;

  constructor(options: DayNightManagerOptions) {
    this.system = new DayNightSystem(
      options.presets ?? COLOR_PRESETS,
      options.settings ?? DAY_NIGHT_SETTINGS
    );

    this.sky = options.sky;
    this.ocean = options.ocean;
    this.ground = options.ground;

    if (options.onChange) this.unsubscribeChange = this.system.subscribe(options.onChange);

    // Fires immediately with the current time, so the first frame is already
    // the right colour rather than whatever the systems were built with.
    this.unsubscribeTime = options.time.subscribe((snapshot) => {
      this.push(this.system.apply(snapshot));
    });
  }

  /** The state currently applied, or null before the first tick. */
  get state(): DayNightState | null {
    return this.system.state;
  }

  /** Listen for changes. Returns an unsubscribe function. */
  subscribe(listener: DayNightListener): () => void {
    return this.system.subscribe(listener);
  }

  destroy(): void {
    this.unsubscribeTime?.();
    this.unsubscribeTime = null;
    this.unsubscribeChange?.();
    this.unsubscribeChange = null;
    this.system.destroy();
  }

  // --- Internal --------------------------------------------------------------

  private push(state: DayNightState): void {
    this.sky?.setBlendedPalette(state.from.sky, state.to.sky, state.blend);
    this.ocean?.setBlendedPalette(state.from.ocean, state.to.ocean, state.blend);
    this.ground?.setBlendedPalette(state.from.ground, state.to.ground, state.blend);
  }
}
