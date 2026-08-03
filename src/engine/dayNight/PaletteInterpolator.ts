import { lerpColor } from "../sky";
import type { GradientStop, SkyPalette } from "../sky";
import { WATER_RAMP_STEPS } from "../ocean";
import type { OceanPalette } from "../ocean";
import { MATERIALS } from "../ground";
import type { GroundPalette, MaterialName } from "../ground";
import { DAY_NIGHT_SETTINGS, SKY_STOP_POSITIONS } from "./DayNightConfig";
import type { DayNightSettings, PhasePreset } from "./DayNightConfig";

/**
 * Expands one authored phase preset into the three palettes the sky, the sea
 * and the land actually render with.
 *
 * The presets are written in the vocabulary of a painter — twelve decisions per
 * phase. The renderers want far more than that: nine cloud tones, an
 * eighteen-step water ramp, twenty-odd lit materials. Everything in between is
 * derived here, by rules rather than by hand, which is what keeps six phases
 * consistent with each other instead of six independent piles of hex.
 *
 * Nothing here draws, and nothing here knows what time it is.
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Multiply a colour's channels, clamping at white. */
function scale(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

// --- Sky ---------------------------------------------------------------------

/**
 * Build the sky's gradient from the preset's anchors.
 *
 * `upper`, `glow` and `base` are optional; where a preset leaves them out they
 * fall back to interpolations of the three required anchors, which is enough
 * for a simple sky and not enough for a sunset.
 */
function buildSkyStops(preset: PhasePreset): GradientStop[] {
  const { top, middle, horizon, upper, glow, base } = preset.sky;

  return [
    { t: SKY_STOP_POSITIONS.top, color: top },
    { t: SKY_STOP_POSITIONS.upper, color: upper ?? lerpColor(top, middle, 0.5) },
    { t: SKY_STOP_POSITIONS.middle, color: middle },
    { t: SKY_STOP_POSITIONS.horizon, color: horizon },
    { t: SKY_STOP_POSITIONS.glow, color: glow ?? lerpColor(horizon, middle, 0.2) },
    { t: SKY_STOP_POSITIONS.base, color: base ?? scale(horizon, 0.92) },
  ];
}

/**
 * The light coming off the horizon — the strongest colour in the phase, and the
 * cast that everything not directly lit picks up.
 */
function horizonLight(preset: PhasePreset): number {
  return preset.sky.glow ?? preset.sky.horizon;
}

export function toSkyPalette(
  preset: PhasePreset,
  settings: DayNightSettings = DAY_NIGHT_SETTINGS
): SkyPalette {
  const light = horizonLight(preset);
  const { cloudTint } = preset;

  // A cloud's lit face leans towards the light at the horizon; its underside
  // leans towards the sky overhead. Deriving both from one authored tint is
  // what keeps every cloud in the world agreeing about where the sun is.
  const highlight = scale(
    lerpColor(cloudTint, light, settings.cloudHighlightMix),
    settings.cloudHighlightGain
  );
  const shadow = scale(
    lerpColor(cloudTint, preset.sky.top, settings.cloudShadowMix),
    settings.cloudShadowGain
  );

  // Birds are silhouettes, so they need the sky behind them to be bright enough
  // to read against. They thin out at dawn and dusk and stop entirely at night.
  const birdStrength = clamp01(
    (preset.ambient - settings.birdAmbientFloor) /
      Math.max(0.001, settings.birdAmbientCeiling - settings.birdAmbientFloor)
  );

  return {
    gradient: buildSkyStops(preset),
    bands: settings.skyBands,
    cloud: { highlight, mid: cloudTint, shadow },
    cloudAlpha: preset.cloudAlpha,
    bird: {
      color: lerpColor(preset.sky.top, 0x101820, 0.45), // --ink; never pure black
      alpha: birdStrength * 0.85,
    },
    hazeColor: preset.hazeColor,
    hazeAlpha: preset.hazeAlpha,
    sun: {
      x: preset.sun.x,
      y: preset.sun.y,
      color: preset.sun.color,
      detailColor: scale(preset.sun.color, 1.08),
      glowColor: preset.sun.glow,
      alpha: preset.sun.opacity,
      glowAlpha: preset.sun.glowOpacity,
    },
    moon: {
      x: preset.moon.x,
      y: preset.moon.y,
      color: preset.moon.color,
      detailColor: scale(preset.moon.color, 0.86),
      glowColor: preset.moon.glow,
      alpha: preset.moon.opacity,
      glowAlpha: preset.moon.glowOpacity,
    },
  };
}

// --- Ocean -------------------------------------------------------------------

export function toOceanPalette(
  preset: PhasePreset,
  settings: DayNightSettings = DAY_NIGHT_SETTINGS
): OceanPalette {
  const water: number[] = [];
  for (let i = 0; i < WATER_RAMP_STEPS; i++) {
    const t = i / (WATER_RAMP_STEPS - 1);
    // Curved rather than linear, so the reflected colour holds near the horizon
    // instead of sinking into the deep tone within a few pixels of it.
    water.push(lerpColor(preset.oceanReflection, preset.oceanDeep, t ** settings.waterCurve));
  }

  return {
    water,
    // Foam picks up the light at the horizon, so it never reads as a white line
    // pasted over a coloured sky.
    foam: lerpColor(0xcfe8ef, horizonLight(preset), settings.foamMix), // --ocean-foam
    foamAlpha: settings.foamAlpha,
    shimmer: {
      x: preset.sun.x,
      pathColor: preset.sun.glow,
      glintColor: preset.sun.color,
      // The reflection is the sun's, so it leaves with the sun.
      intensity: preset.sun.opacity,
    },
  };
}

// --- Ground ------------------------------------------------------------------

export function toGroundPalette(
  preset: PhasePreset,
  settings: DayNightSettings = DAY_NIGHT_SETTINGS
): GroundPalette {
  const light = horizonLight(preset);
  const ambient = clamp01(preset.ambient);

  const exposure =
    settings.groundExposureFloor +
    (1 - settings.groundExposureFloor) * ambient ** settings.groundExposureCurve;
  // The darker the phase, the more of the mood the tint has to carry — which is
  // exactly why moonlight reads as blue rather than as grey.
  const warmth = lerp(settings.groundWarmthDark, settings.groundWarmthLight, ambient);

  const palette = {} as GroundPalette;
  for (const name of Object.keys(MATERIALS) as MaterialName[]) {
    palette[name] = lerpColor(scale(MATERIALS[name], exposure), light, warmth);
  }
  return palette;
}

/** Everything one phase looks like, across all three systems. */
export interface PhasePalettes {
  sky: SkyPalette;
  ocean: OceanPalette;
  ground: GroundPalette;
}

export function toPalettes(
  preset: PhasePreset,
  settings: DayNightSettings = DAY_NIGHT_SETTINGS
): PhasePalettes {
  return {
    sky: toSkyPalette(preset, settings),
    ocean: toOceanPalette(preset, settings),
    ground: toGroundPalette(preset, settings),
  };
}
