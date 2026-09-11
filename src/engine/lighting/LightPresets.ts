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
  ambientIntensity: 0.5,
  // Soft pink rather than the old dusty rose: dawn and dusk are the two
  // phases most easily mistaken for each other, and the difference between
  // them is that one is pink going gold and the other is orange going purple.
  ambientTint: 0xe89aa6,
  tintStrength: 0.3,
  shadowStrength: 0.4,
  highlightStrength: 0.45,
  bloomMultiplier: 0.6,
  localLightMultiplier: 0.55,
};

/** Morning — bright, clean and barely tinted. Shadows are back but still soft. */
const MORNING: LightPreset = {
  ambientIntensity: 0.9,
  // Pale gold, on its way to the blue of noon.
  ambientTint: 0xffe6b4,
  tintStrength: 0.15,
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
 * Sunset — late afternoon: warm yellow-gold, and the longest shadows.
 *
 * Gold rather than orange, and that is the whole of what separates this from
 * `DUSK`. The two used to sit within a hue of each other, which collapsed the
 * evening into one long orange smear; the light now goes gold, *then* orange,
 * *then* coral, and there are three looks in the descent instead of one.
 *
 * The hour the town starts to glow, so local lights already carry real weight
 * here even though the ambient is still high (ART_DIRECTION.md §Sunset).
 */
const SUNSET: LightPreset = {
  ambientIntensity: 0.78,
  ambientTint: 0xffc978,
  tintStrength: 0.3,
  shadowStrength: 0.62,
  highlightStrength: 0.75,
  bloomMultiplier: 0.5,
  localLightMultiplier: 0.32,
};

/**
 * Dusk — orange going deep coral, and the light losing its direction.
 *
 * Warm rather than violet. The violet belongs to the *sky* at this hour, and
 * the sky has it; the last direct light on the ground is the reddest of the
 * day, and a world lit violet under an orange sky reads as two unrelated
 * pictures. Shadows soften towards nothing because there is no longer much of
 * a source casting them, and everything artificial starts to take over.
 */
const DUSK: LightPreset = {
  ambientIntensity: 0.44,
  ambientTint: 0xef7a4c,
  tintStrength: 0.36,
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
  // Raised from 0.14, and the tint raised with it. Moonlight is *coloured*
  // light, not less light: at 0.14 the surfaces went to a flat near-black and
  // the blue had nothing left to sit on, so the phase read as a failure to
  // render rather than as a night. The exposure now clears the floor and the
  // strong cool cast is what says which hour it is.
  ambientIntensity: 0.34,
  ambientTint: 0x8fb2ee,
  tintStrength: 0.46,
  shadowStrength: 0.2,
  highlightStrength: 0.42,
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
