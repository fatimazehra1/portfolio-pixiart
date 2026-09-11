/**
 * Day/night tuning — the shape of a preset, and the rules for expanding one
 * into the palettes the sky, sea and land actually render with.
 */

/** The vertical structure of the sky at one phase. */
export interface SkyAnchors {
  /** Overhead. */
  top: number;
  /** Halfway down — the body of the sky, and the phase's dominant colour. */
  middle: number;
  /** At the horizon line. The strongest statement of the phase. */
  horizon: number;

  /**
   * Optional shaping between top and middle. Three anchors alone interpolate
   * straight through the midpoint, which walks a sunset's plum band out of
   * existence; this puts it back. Defaults to the midpoint.
   */
  upper?: number;
  /** Optional band just below the horizon, where the light pools. */
  glow?: number;
  /** Optional colour at the very bottom of the sky. Defaults to a shade of `horizon`. */
  base?: number;
}

/** Where a celestial body sits and how strongly it reads. */
export interface BodyAnchors {
  /** Horizontal position, 0–1 across the sky. */
  x: number;
  /** Vertical position, 0–1 down the sky. */
  y: number;
  /** Opacity. 0 takes the body off duty entirely. */
  opacity: number;
  /** Disc colour. */
  color: number;
  /** Halo colour. */
  glow: number;
  /** Halo opacity. */
  glowOpacity: number;
}

/**
 * One phase's complete visual identity.
 *
 * This is the only place a colour decision is made. Everything the three
 * systems render — every cloud tone, every step of the water ramp, every
 * material on the land — is expanded from these fields by PaletteInterpolator,
 * so a phase can be retuned here without touching anything that draws.
 */
export interface PhasePreset {
  sky: SkyAnchors;

  /** Water at the horizon, where it is nearly a mirror of the sky. */
  oceanReflection: number;
  /** Water at the viewer's feet, where it is mostly sea. */
  oceanDeep: number;

  hazeColor: number;
  hazeAlpha: number;

  /**
   * How much light is falling on the world, 0–1.
   *
   * Drives the land's exposure directly, and the strength of the colour cast
   * everything picks up from the horizon — the darker the phase, the more the
   * tint has to carry the mood, which is what makes moonlight read as blue.
   */
  ambient: number;

  /** The body tone of a cloud. Its lit and shadowed faces are derived from it. */
  cloudTint: number;
  /** Cloud opacity. */
  cloudAlpha: number;

  sun: BodyAnchors;
  moon: BodyAnchors;
}

/**
 * Where the six sky anchors land down the gradient.
 *
 * Weighted towards the bottom of the sky on purpose: the interesting light is
 * near the horizon, and spending three of six stops in the lower third is what
 * lets a sunset hold peach, gold and plum at once instead of averaging them.
 */
export const SKY_STOP_POSITIONS = {
  top: 0,
  upper: 0.3,
  middle: 0.56,
  horizon: 0.78,
  glow: 0.92,
  base: 1,
} as const;

export interface DayNightSettings {
  /** Quantisation of the sky gradient. More bands = smoother, less graphic. */
  skyBands: number;

  /** How far a cloud's lit face is pushed towards the horizon light, 0–1. */
  cloudHighlightMix: number;
  /** Extra brightening on top of that. */
  cloudHighlightGain: number;
  /** How far a cloud's shadowed face is pushed towards the sky overhead, 0–1. */
  cloudShadowMix: number;
  /** Darkening on top of that. */
  cloudShadowGain: number;

  /**
   * Curve of the water ramp from horizon to viewer. Above 1 holds the
   * reflected colour longer before sinking into the deep tone, which is what
   * keeps a bright horizon from turning to mud two pixels down.
   */
  waterCurve: number;

  /** How far foam is tinted by the light at the horizon, 0–1. */
  foamMix: number;
  foamAlpha: number;

  /** The colour cast the land takes from the horizon, at full dark and full light. */
  groundWarmthDark: number;
  groundWarmthLight: number;
  /** Floor on the land's exposure. Nothing on this shore goes to black. */
  groundExposureFloor: number;
  /**
   * Curve on the land's response to ambient light. Above 1 darkens the low end
   * faster than the high end — without it, a purple dusk sky sits over a beach
   * that still looks like late afternoon.
   */
  groundExposureCurve: number;

  /** Ambient below which birds stop flying, and above which they are at full strength. */
  birdAmbientFloor: number;
  birdAmbientCeiling: number;
}

export const DAY_NIGHT_SETTINGS: DayNightSettings = {
  skyBands: 22,

  cloudHighlightMix: 0.6,
  cloudHighlightGain: 1.12,
  cloudShadowMix: 0.6,
  cloudShadowGain: 0.92,

  waterCurve: 1.2,

  foamMix: 0.4,
  foamAlpha: 0.7,

  groundWarmthDark: 0.45,
  groundWarmthLight: 0.14,
  // Raised from 0.32. This is the number that decides whether a night island
  // still has grass, sand and rock on it or is one silhouette; below about
  // 0.4 the material differences stop being legible at all.
  groundExposureFloor: 0.44,
  // Softened from 1.4 along with it: a steep curve spends its whole budget
  // crushing the low end, which is exactly the end that was broken.
  groundExposureCurve: 1.2,

  birdAmbientFloor: 0.5,
  birdAmbientCeiling: 0.95,
};
