import { lerpColor } from "../sky";
import { LIGHTING_SETTINGS } from "../lighting";
import type { LightingSettings, LightingState } from "../lighting";
import { NEUTRAL_PALETTE } from "../scene";
import type { PaletteDelta } from "../scene";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Rec. 709 relative luminance, 0–1. The same weighting the ground uses. */
function luminance(color: number): number {
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Pull a colour towards its own grey, keeping its brightness. */
export function desaturate(color: number, amount: number): number {
  const t = clamp01(amount);
  if (t <= 0) return color;
  const grey = Math.round(luminance(color) * 255);
  return lerpColor(color, (grey << 16) | (grey << 8) | grey, t);
}

/**
 * The composition rule: local climate over global hour.
 *
 * This is the single place the two halves of the lighting model meet, and the
 * order is the whole point.
 *
 * The **global** day/night cycle decides what time it is. That answer is not
 * negotiable and no scene may overrule it — midnight over an abandoned plot is
 * still midnight, and if a scene could set its own absolute light then the
 * world would stop having a time of day at all and become nine unrelated
 * dioramas.
 *
 * The **local** climate then says how this stretch of shore differs from that
 * hour: a little brighter, a little colder, a little greyer, windows burning
 * harder or barely at all. Always a modifier, never a value.
 *
 * So: take the hour, then bend it. Never the other way round.
 *
 * The same rails that guard the global state guard the result — the ambient
 * floor and the tint ceiling from `LIGHTING_SETTINGS` — because a scene delta
 * multiplied into an already-dark night is exactly where a palette would
 * otherwise quietly reach zero and a chapter would go to black.
 */
export function gradeLighting(
  global: LightingState,
  local: PaletteDelta = NEUTRAL_PALETTE,
  settings: LightingSettings = LIGHTING_SETTINGS
): LightingState {
  // The scene's tint is laid over the hour's, by the scene's own strength. The
  // hour still chooses the colour of the light; the scene tells it which way to
  // lean.
  const tint = local.tintStrength > 0
    ? lerpColor(global.ambientTint, local.tint, clamp01(local.tintStrength))
    : global.ambientTint;

  const ambientTint = desaturate(tint, local.desaturation);

  return {
    ...global,

    ambientIntensity: Math.max(settings.minAmbient, global.ambientIntensity * local.exposure),
    ambientTint,
    // The scene's own tint strength is added to the hour's rather than
    // replacing it: a foggy scene at sunset should be *more* strongly coloured
    // than a clear one, not have the sunset argued away.
    tintStrength: Math.min(
      settings.maxTintStrength,
      global.tintStrength + local.tintStrength * (1 - global.tintStrength)
    ),

    // Colour drains out of a place before its brightness does, so desaturation
    // reaches the highlights and the bloom too — a grey scene should not still
    // be throwing coloured glow.
    highlightStrength: global.highlightStrength * (1 - 0.5 * local.desaturation),
    bloomMultiplier: global.bloomMultiplier * (1 - 0.35 * local.desaturation),

    // The one number every lamp, window, sign and beam multiplies itself by.
    // This is where "the lights are on here and off there" actually happens.
    localLightMultiplier: global.localLightMultiplier * local.localLight,
  };
}

/**
 * Grade a material colour for a scene, for anything not going through the
 * lighting state — the ground's baked palette, a prop's tint.
 *
 * Same rule, applied to one colour: exposure, then tint, then the colour drain.
 */
export function gradeColor(base: number, local: PaletteDelta = NEUTRAL_PALETTE): number {
  const r = Math.min(255, Math.round(((base >> 16) & 0xff) * local.exposure));
  const g = Math.min(255, Math.round(((base >> 8) & 0xff) * local.exposure));
  const b = Math.min(255, Math.round((base & 0xff) * local.exposure));

  const lit = lerpColor((r << 16) | (g << 8) | b, local.tint, clamp01(local.tintStrength));
  return desaturate(lit, local.desaturation);
}

/** True when a delta would change nothing, so callers can skip the work. */
export function isNeutral(local: PaletteDelta): boolean {
  return (
    local.exposure === 1 &&
    local.tintStrength === 0 &&
    local.desaturation === 0 &&
    local.localLight === 1
  );
}
