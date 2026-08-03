import { COLOR_PRESETS } from "./ColorPresets";
import { DAY_NIGHT_SETTINGS } from "./DayNightConfig";
import type { DayNightSettings, PhasePreset } from "./DayNightConfig";
import { toPalettes } from "./PaletteInterpolator";
import type { PhasePalettes } from "./PaletteInterpolator";
import type { TimePhase, TimeSnapshot } from "../time";

/**
 * What the world should look like right now, expressed as a crossing between
 * two phases.
 *
 * Deliberately *not* a single blended palette. The sky's gradient and the sea's
 * body are baked textures, and they cross-fade by drawing both and varying the
 * alpha between them — which is far cheaper than re-baking a blend every frame,
 * and is the machinery those systems already have. So the two endpoints are
 * handed over intact and the blend along with them.
 *
 * The palette objects are stable across frames: a system can compare them by
 * identity to know whether it needs to re-bake, and it only ever will at a
 * phase boundary.
 */
export interface DayNightState {
  from: PhasePalettes;
  to: PhasePalettes;
  /** 0 sits in `from`, 1 has arrived at `to`. Already eased by the clock. */
  blend: number;
  fromPhase: TimePhase;
  toPhase: TimePhase;
}

export type DayNightListener = (state: DayNightState) => void;

/**
 * The day/night cycle.
 *
 * Turns a moment in time into a look. It reads a `TimeSnapshot` and reports
 * which two phases the world is between and how far across — nothing more. It
 * owns no Pixi objects, subscribes to nothing, and cannot move the clock.
 *
 * That one-way relationship is the whole design: the Time System is the single
 * source of truth, and this only ever reacts to it. DayNightManager is what
 * connects the two.
 *
 * Every phase's palettes are expanded once, on construction, and then reused
 * forever — the per-frame cost of the cycle is a comparison and a callback.
 */
export class DayNightSystem {
  private readonly presets: Record<TimePhase, PhasePreset>;
  private readonly palettes: Record<TimePhase, PhasePalettes>;
  private readonly listeners = new Set<DayNightListener>();

  private current: DayNightState | null = null;

  constructor(
    presets: Record<TimePhase, PhasePreset> = COLOR_PRESETS,
    settings: DayNightSettings = DAY_NIGHT_SETTINGS
  ) {
    this.presets = presets;

    // Expanded once. Six phases, three palettes each, and never again.
    this.palettes = Object.fromEntries(
      (Object.keys(presets) as TimePhase[]).map((phase) => [
        phase,
        toPalettes(presets[phase], settings),
      ])
    ) as Record<TimePhase, PhasePalettes>;
  }

  // --- Queries ---------------------------------------------------------------

  /** The authored preset for a phase. */
  preset(phase: TimePhase): PhasePreset {
    return this.presets[phase];
  }

  /** The expanded palettes for a phase. Stable across calls. */
  palettesFor(phase: TimePhase): PhasePalettes {
    return this.palettes[phase];
  }

  /** The last state resolved, or null if nothing has been applied yet. */
  get state(): DayNightState | null {
    return this.current;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * React to the clock.
   *
   * Outside a transition the snapshot's `nextPhase` equals its `phase`, so both
   * endpoints are the same object and the blend is zero — which is exactly what
   * a settled phase should be, with no special case needed for it.
   */
  apply(snapshot: TimeSnapshot): DayNightState {
    const state: DayNightState = {
      from: this.palettes[snapshot.phase],
      to: this.palettes[snapshot.nextPhase],
      blend: snapshot.blend,
      fromPhase: snapshot.phase,
      toPhase: snapshot.nextPhase,
    };

    this.current = state;
    for (const listener of this.listeners) listener(state);
    return state;
  }

  /**
   * Listen for changes. Returns an unsubscribe function.
   *
   * Called immediately with the current state if there is one, so a system that
   * joins late is correct from its first frame.
   */
  subscribe(listener: DayNightListener): () => void {
    this.listeners.add(listener);
    if (this.current) listener(this.current);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    this.listeners.clear();
    this.current = null;
  }
}
