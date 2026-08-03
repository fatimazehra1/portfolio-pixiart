import { LIGHT_PRESETS } from "./LightPresets";
import { LIGHTING_SETTINGS } from "./LightingConfig";
import type {
  LightPreset,
  LightingListener,
  LightingSettings,
  LightingState,
} from "./LightingConfig";
import { lerpColor } from "../sky";
import type { DayNightState } from "../dayNight";
import type { TimePhase } from "../time"; // type only; see LightPresets

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The global lighting controller.
 *
 * Turns "the world is 40% of the way from sunset into dusk" into a set of
 * numbers describing what the light is doing: how much of it there is, what
 * colour it is, how hard it casts, and how much room it leaves for anything
 * that makes its own.
 *
 * # What it does not do
 * It lights nothing. There is no lantern, no window, no beam and no overlay
 * here, and it does not touch the sky, the sea or the land — those are already
 * lit by the day/night cycle, and darkening them again would be counting the
 * same sun twice. This is the *reading*, and every future light source is a
 * consumer of it.
 *
 * # Where its input comes from
 * Only from the day/night cycle, and only ever pushed. It cannot see the clock,
 * has no update loop and no way to advance anything — the arrow runs
 * clock → cycle → lighting and never back. Wire it to a `TimeSystem` and the
 * types will refuse you.
 *
 * # Usage
 * ```ts
 * const lighting = new LightingSystem();
 * const off = lighting.subscribe(({ localLightMultiplier }) => { ... });
 * lighting.apply(dayNightState);          // LightingManager does this for you
 * ```
 */
export class LightingSystem {
  private readonly presets: Record<TimePhase, LightPreset>;
  private readonly settings: LightingSettings;
  private readonly listeners = new Set<LightingListener>();
  /** Used when a phase arrives that has no preset. See `apply`. */
  private readonly fallback: LightPreset;

  private current: LightingState | null = null;

  constructor(
    presets: Record<TimePhase, LightPreset> = LIGHT_PRESETS,
    settings: LightingSettings = LIGHTING_SETTINGS
  ) {
    this.presets = presets;
    this.settings = settings;
    this.fallback = presets.noon ?? Object.values(presets)[0];
  }

  // --- Queries ---------------------------------------------------------------

  /** The light as last calculated, or null before the first update. */
  get state(): LightingState | null {
    return this.current;
  }

  /** The authored preset for a phase. */
  preset(phase: TimePhase): LightPreset {
    return this.presets[phase];
  }

  // --- Commands --------------------------------------------------------------

  /**
   * React to the day/night cycle.
   *
   * Interpolates between the two phases' presets by the cycle's own blend. That
   * blend is already eased and already continuous, so re-easing it here would
   * only put a second curve on top of a good one — every value out of this is
   * as smooth as the cycle that fed it.
   */
  apply(dayNight: DayNightState): LightingState {
    // Fall back rather than throw. If the clock ever grows a seventh phase and
    // nobody adds a light preset for it, the world should carry on lit by
    // something reasonable — losing the whole render to an undefined lookup is
    // a far worse failure than one phase looking like the wrong hour.
    const from = this.presets[dayNight.fromPhase] ?? this.fallback;
    const to = this.presets[dayNight.toPhase] ?? from;
    const t = clamp01(dayNight.blend);

    const state: LightingState = {
      ambientIntensity: Math.max(
        this.settings.minAmbient,
        lerp(from.ambientIntensity, to.ambientIntensity, t)
      ),
      ambientTint: lerpColor(from.ambientTint, to.ambientTint, t),
      tintStrength: Math.min(
        this.settings.maxTintStrength,
        lerp(from.tintStrength, to.tintStrength, t)
      ),
      shadowStrength: lerp(from.shadowStrength, to.shadowStrength, t),
      highlightStrength: lerp(from.highlightStrength, to.highlightStrength, t),
      bloomMultiplier: lerp(from.bloomMultiplier, to.bloomMultiplier, t),
      localLightMultiplier: lerp(from.localLightMultiplier, to.localLightMultiplier, t),

      fromPhase: dayNight.fromPhase,
      toPhase: dayNight.toPhase,
      blend: t,
    };

    this.current = state;
    for (const listener of this.listeners) listener(state);
    return state;
  }

  /**
   * Listen for changes. Returns an unsubscribe function.
   *
   * Called immediately with the current state if there is one, so a light that
   * is switched on halfway through the evening is correct from its first frame.
   */
  subscribe(listener: LightingListener): () => void {
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

/**
 * Light a colour by the ambient.
 *
 * The contract for what the published numbers *mean*, written once so that
 * every future consumer agrees rather than each inventing its own reading:
 * scale by how much light there is, then pull towards the colour that light is.
 *
 * Nothing calls this yet. It is here so that when a street lamp and a lit window
 * and a character sprite all need to sit in the same evening, they do.
 */
export function applyAmbient(base: number, state: LightingState): number {
  const r = Math.min(255, Math.round(((base >> 16) & 0xff) * state.ambientIntensity));
  const g = Math.min(255, Math.round(((base >> 8) & 0xff) * state.ambientIntensity));
  const b = Math.min(255, Math.round((base & 0xff) * state.ambientIntensity));

  return lerpColor((r << 16) | (g << 8) | b, state.ambientTint, state.tintStrength);
}

/**
 * How brightly a local light should burn right now.
 *
 * A lantern declares its own intensity once and passes it through here; the
 * result is nothing at noon and everything at midnight. This is the seam local
 * light sources plug into — see `localLightMultiplier`.
 */
export function localIntensity(base: number, state: LightingState): number {
  return base * state.localLightMultiplier;
}
