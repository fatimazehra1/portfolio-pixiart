import type { PaletteDelta, SceneCamera, SceneStatus, WeatherLayerSpec } from "./SceneTypes";

/**
 * The one table where status becomes weather.
 *
 * "Weather encodes status" is the whole conceit of the world: you should be
 * able to tell what a chapter *means* from across the bay, before you can read
 * a sign or press a key. Clear air and lit windows say someone is still here.
 * Haze says the lights went off a while ago. Drizzle says nobody is coming back.
 *
 * Keeping that mapping in one table is what makes it a language rather than
 * decoration. If each scene picked its own climate, the fog over one building
 * and the fog over another would mean two different things — which is to say
 * they would mean nothing. A scene may still depart from its status, but it has
 * to say why (`SceneConfig.overrides.reason`), and the departure is then
 * visible as a departure instead of disappearing into the noise.
 *
 * Every value is a *delta on the global hour*, never an absolute. Midnight at
 * an abandoned plot and midnight at an active one are both midnight.
 */
export interface StatusClimate {
  weather: readonly WeatherLayerSpec[];
  palette: PaletteDelta;
}

/** No change at all. The identity element — what "clear" grades to. */
export const NEUTRAL_PALETTE: PaletteDelta = {
  exposure: 1,
  tint: 0xffffff,
  tintStrength: 0,
  desaturation: 0,
  localLight: 1,
};

export const STATUS_CLIMATE: Record<SceneStatus, StatusClimate> = {
  /**
   * Work is happening here. The air is clear, the light is a touch warmer than
   * the hour, and the windows burn harder than anywhere else on the shore —
   * this is where somebody still is.
   */
  active: {
    weather: [{ kind: "clear", intensity: 1 }],
    palette: {
      exposure: 1.06,
      tint: 0xffd9a8,
      tintStrength: 0.1,
      desaturation: 0,
      localLight: 1.15,
    },
  },

  /**
   * Finished, and finished well. Bright, but the warmth has gone out of it —
   * the light of a place remembered rather than occupied. A little haze for
   * distance, because that is what memory does to a view.
   */
  past: {
    weather: [{ kind: "haze", intensity: 0.35 }],
    palette: {
      exposure: 0.98,
      tint: 0xbcd0e8,
      tintStrength: 0.14,
      desaturation: 0.12,
      localLight: 0.85,
    },
  },

  /**
   * Still standing, nobody home. Fog thick enough to soften the silhouette,
   * cooler, and the windows mostly dark.
   */
  dormant: {
    weather: [
      { kind: "fog", intensity: 0.55 },
      { kind: "haze", intensity: 0.3 },
    ],
    palette: {
      exposure: 0.86,
      tint: 0x9fb4c6,
      tintStrength: 0.24,
      desaturation: 0.3,
      localLight: 0.45,
    },
  },

  /**
   * Given up on. Drizzle, colour draining out, and almost nothing lit. The
   * darkest and coldest the grade goes — anything further and the scene stops
   * reading as a place and starts reading as a rendering fault.
   */
  abandoned: {
    weather: [
      { kind: "drizzle", intensity: 0.7 },
      { kind: "fog", intensity: 0.4 },
    ],
    palette: {
      exposure: 0.74,
      tint: 0x7d8ea0,
      tintStrength: 0.32,
      desaturation: 0.52,
      localLight: 0.18,
    },
  },
};

/** How the camera sits over a scene that doesn't ask for anything particular. */
export const DEFAULT_SCENE_CAMERA: SceneCamera = {
  zoom: 1,
  offsetX: 0,
};

/**
 * How far the influence of a scene reaches past its own ground, in world pixels.
 *
 * The climate is not a box you step into. It falls off, so walking from an
 * active chapter to an abandoned one is a slow souring of the light rather than
 * a switch being thrown at a boundary — DESIGN.md asks for no sudden jumps, and
 * a hard edge on a fog bank is the most obviously artificial thing a 2D world
 * can do. Wide enough that neighbouring scenes overlap and blend into each
 * other; the open shore between them is a genuine mixture of the two.
 */
export const CLIMATE_FALLOFF = 620;

/**
 * How sharply that falloff bites. 1 is linear; higher holds the scene's own
 * climate closer to home and then lets go faster.
 */
export const CLIMATE_FALLOFF_POWER = 1.6;
