import type { LightPreset } from "./LightingConfig";
// Type only — erased at compile time. The lighting system has no runtime
// dependency on the clock and never reads from it; this is simply the union the
// day/night cycle labels its own state with.
import type { TimePhase } from "../time";

/**
 * How the world is lit, phase by phase.
 *
 * These sit alongside the colour presets in `dayNight/ColorPresets` and were
 * authored against them — the two describe the same six moments from different
 * sides, one saying what the sky *is* and this one saying what the light *does*.
 * Retune one and the other wants a look.
 *
 * Nothing here is a colour you will see directly. These are the numbers a
 * lantern, a lit window, a cast shadow or a rim highlight will multiply
 * themselves by once they exist.
 */

/**
 * Dawn — low, cool, and just beginning to warm.
 *
 * The tint is a muted rose even though the sky overhead is still blue: the
 * first direct light of the day is warm, and it is the *light* this describes,
 * not the air. Lamps are still worth something at this hour.
 */
const DAWN: LightPreset = {
  ambientIntensity: 0.42,
  ambientTint: 0xd99a8e,
  tintStrength: 0.3,
  shadowStrength: 0.4,
  highlightStrength: 0.45,
  bloomMultiplier: 0.6,
  localLightMultiplier: 0.55,
};

/** Morning — bright, clean and barely tinted. Shadows are back but still soft. */
const MORNING: LightPreset = {
  ambientIntensity: 0.88,
  ambientTint: 0xffe9c4,
  tintStrength: 0.16,
  shadowStrength: 0.55,
  highlightStrength: 0.6,
  bloomMultiplier: 0.25,
  localLightMultiplier: 0.12,
};

/**
 * Noon — full light, hard shadows, nothing to bloom.
 *
 * The tint is nearly neutral but not quite: a touch of cool keeps midday from
 * being the one hour of the day lit by nothing in particular.
 */
const NOON: LightPreset = {
  ambientIntensity: 1,
  ambientTint: 0xf2f6ff,
  tintStrength: 0.06,
  shadowStrength: 0.7,
  highlightStrength: 0.8,
  bloomMultiplier: 0.15,
  localLightMultiplier: 0,
};

/**
 * Sunset — the warmest light of the day, and the longest shadows.
 *
 * The hour the town starts to glow: lanterns come on and windows go warm
 * (ART_DIRECTION.md §Sunset), so local lights already carry real weight here
 * even though the ambient is still high.
 */
const SUNSET: LightPreset = {
  ambientIntensity: 0.66,
  ambientTint: 0xff9e5e,
  tintStrength: 0.34,
  shadowStrength: 0.62,
  highlightStrength: 0.75,
  bloomMultiplier: 0.55,
  localLightMultiplier: 0.45,
};

/**
 * Dusk — the light going violet and losing its direction.
 *
 * Shadows soften towards nothing because there is no longer a source casting
 * them, and everything artificial starts to take over.
 */
const DUSK: LightPreset = {
  ambientIntensity: 0.3,
  ambientTint: 0x8a6a9e,
  tintStrength: 0.32,
  shadowStrength: 0.28,
  highlightStrength: 0.3,
  bloomMultiplier: 0.8,
  localLightMultiplier: 0.85,
};

/**
 * Night — cool moonlight, and everything else doing the work.
 *
 * The lowest ambient and the strongest tint of the day, which together are what
 * make moonlight read as blue rather than as grey. Shadows are faint and
 * scattered; bloom and local lights are at full strength.
 */
const NIGHT: LightPreset = {
  ambientIntensity: 0.14,
  ambientTint: 0x7f9ad6,
  tintStrength: 0.38,
  shadowStrength: 0.16,
  highlightStrength: 0.35,
  bloomMultiplier: 1,
  localLightMultiplier: 1,
};

export const LIGHT_PRESETS: Record<TimePhase, LightPreset> = {
  dawn: DAWN,
  morning: MORNING,
  noon: NOON,
  sunset: SUNSET,
  dusk: DUSK,
  night: NIGHT,
};
