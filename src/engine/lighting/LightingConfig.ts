/**
 * Lighting tuning — what a phase's light is made of, and what the world is
 * told about it.
 */

/**
 * How the world is lit at one phase.
 *
 * Authored per phase in LightPresets and interpolated between two of them by
 * the day/night blend, so every value here is continuous across a whole day.
 */
export interface LightPreset {
  /**
   * How lit the world feels, 0–1.
   *
   * Its own scale, not the day/night preset's `ambient`. That one is an
   * exposure for the land and has a floor under it so the beach never goes
   * black; this is the honest global level and is free to fall much further,
   * because the things that will read it — a lamp, a lit window — get *more*
   * important as it drops.
   */
  ambientIntensity: number;

  /**
   * The colour of the light itself.
   *
   * Never neutral, at any hour (ART_DIRECTION.md §Lighting Philosophy — no
   * generic white lighting). Warm at sunrise and sunset, cool under the moon.
   */
  ambientTint: number;
  /** How much of that colour to apply, 0–1. */
  tintStrength: number;

  /**
   * How hard shadows fall, 0–1.
   *
   * Highest under a high sun and lowest under the moon, where the light is all
   * scattered and nothing casts cleanly. Shadows take their colour from
   * `ambientTint`, which is what makes them blue at night rather than grey
   * (§Shadows — soft, long during sunset, blue at night, never pure black).
   */
  shadowStrength: number;

  /** How strongly lit edges and rims catch, 0–1. */
  highlightStrength: number;

  /**
   * How much glow a light source should be given. Future.
   *
   * Rises as ambient falls: the same lantern that is barely visible at noon
   * should bloom against a night sky.
   */
  bloomMultiplier: number;

  /**
   * How strongly a local light reads against the ambient. Future.
   *
   * Zero at noon — a lit window in full daylight shows nothing — and full at
   * night. This is the number a lantern, a window or a forge multiplies its own
   * intensity by, and the whole of what "supporting local light sources" means
   * before any of them exist.
   */
  localLightMultiplier: number;
}

/**
 * Everything the lighting controller publishes.
 *
 * A plain value object, so a consumer can keep it, compare it, or ignore it.
 * Carries its own provenance so anything reacting can tell *why* the light
 * changed without going back to the cycle to ask.
 */
export interface LightingState extends LightPreset {
  /** The phase being lit from. */
  fromPhase: string;
  /** The phase being lit towards. Equal to `fromPhase` outside a transition. */
  toPhase: string;
  /** How far between the two, 0–1. Straight from the day/night cycle. */
  blend: number;
}

export type LightingListener = (state: LightingState) => void;

export interface LightingSettings {
  /**
   * Floor under the published ambient intensity.
   *
   * Not the same as saying the world never goes dark — it is that a consumer
   * multiplying by this should never end up with literally nothing. Deep night
   * is still a place you can see.
   */
  minAmbient: number;

  /**
   * Ceiling on how far a tint can pull a colour, whatever a preset asks for.
   * A safety rail against a retune quietly turning the whole world one hue.
   */
  maxTintStrength: number;
}

export const LIGHTING_SETTINGS: LightingSettings = {
  minAmbient: 0.08,
  maxTintStrength: 0.55,
};
