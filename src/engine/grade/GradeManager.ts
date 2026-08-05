import { gradeLighting } from "./Grade";
import { NEUTRAL_PALETTE } from "../scene";
import type { PaletteDelta, SceneDirector } from "../scene";
import type { LightingManager, LightingState } from "../lighting";

export type GradeListener = (state: LightingState) => void;

export interface GradeManagerOptions {
  /** The global light. Where the hour comes from. */
  lighting: LightingManager;
  /** Where the local climate comes from. */
  scenes: SceneDirector;
  /**
   * How fast the grade chases the scene, as an exponential rate per second.
   *
   * The director's own falloff already makes the climate change gradually as
   * you walk. This is a second, much shorter smoothing on top, and it exists
   * for the case walking does not cover: the focus jumping — a camera reset, a
   * scene being selected, eventually a character being placed. Without it those
   * land as a one-frame colour cut across the whole world.
   */
  smoothing?: number;
}

const DEFAULT_SMOOTHING = 3.2;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Joins the global hour to the local climate, and publishes the answer.
 *
 * Sits exactly where `LightingManager` used to be in the chain:
 *
 *   clock → dayNight → lighting → **grade** → lamps, windows, beams, weather
 *
 * Everything that used to read `LightingState` off the lighting system reads it
 * off here instead and needs no other change — the type is the same, the
 * meaning is the same, and the only difference is that the numbers now know
 * where you are standing. That is deliberate: local weather should not have
 * been a new interface for every consumer to learn.
 *
 * It draws nothing and owns no Pixi objects.
 */
export class GradeManager {
  private readonly scenes: SceneDirector;
  private readonly listeners = new Set<GradeListener>();
  private readonly smoothing: number;

  private unbindLighting: (() => void) | null = null;
  private unbindScenes: (() => void) | null = null;

  /** The last global reading, ungraded. */
  private global: LightingState | null = null;
  /** Where the local climate is heading. */
  private target: PaletteDelta = { ...NEUTRAL_PALETTE };
  /** Where it actually is, chasing the target. */
  private local: PaletteDelta = { ...NEUTRAL_PALETTE };

  private current: LightingState | null = null;

  constructor(options: GradeManagerOptions) {
    this.scenes = options.scenes;
    this.smoothing = options.smoothing ?? DEFAULT_SMOOTHING;

    this.unbindLighting = options.lighting.subscribe((state) => {
      this.global = state;
      this.publish();
    });

    this.unbindScenes = this.scenes.subscribe((state) => {
      this.target = state.palette;
      // Nothing has been anywhere yet, so the first scene is arrived at rather
      // than eased into — otherwise the world opens by fading in from neutral.
      if (!this.current) this.local = { ...state.palette };
      this.publish();
    });
  }

  // --- Queries ---------------------------------------------------------------

  /** The graded light, or null before both inputs have reported. */
  get state(): LightingState | null {
    return this.current;
  }

  /** The local delta actually in effect this frame. */
  get delta(): PaletteDelta {
    return this.local;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Advance the chase. `delta` is in seconds.
   *
   * Frame-rate independent for the same reason the camera's easing is: a fade
   * that is twice as fast on a 120Hz screen is a bug you only find on the one
   * machine you don't own.
   */
  update(delta: number): void {
    if (delta <= 0 || !this.current) return;

    const t = 1 - Math.exp(-this.smoothing * delta);
    const before = this.local;

    this.local = {
      exposure: lerp(before.exposure, this.target.exposure, t),
      tint: this.target.tint,
      tintStrength: lerp(before.tintStrength, this.target.tintStrength, t),
      desaturation: lerp(before.desaturation, this.target.desaturation, t),
      localLight: lerp(before.localLight, this.target.localLight, t),
    };

    this.publish();
  }

  /** Listen for the graded light. Called immediately if there is a state. */
  subscribe(listener: GradeListener): () => void {
    this.listeners.add(listener);
    if (this.current) listener(this.current);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    this.unbindLighting?.();
    this.unbindLighting = null;
    this.unbindScenes?.();
    this.unbindScenes = null;
    this.listeners.clear();
    this.current = null;
  }

  // --- Internal --------------------------------------------------------------

  private publish(): void {
    if (!this.global) return;
    const state = gradeLighting(this.global, this.local);
    this.current = state;
    for (const listener of this.listeners) listener(state);
  }
}
