/**
 * Camera tuning — the single place to edit how the world is explored.
 */

/**
 * The width of the whole world in CSS pixels.
 *
 * WORLD.md describes one long coastal waterfront running from the dock to the
 * lighthouse, ten locations deep. At this width a 1600px viewport sees a little
 * under a quarter of it at a time, which leaves each building room to be
 * approached and left rather than simply appearing.
 */
export const WORLD_WIDTH = 7200;

export interface CameraSettings {
  /** How fast a held key pushes the camera, in CSS pixels per second. */
  panSpeed: number;
  /**
   * How hard the camera chases its target. Higher is tighter and more
   * immediate; lower trails further behind and feels heavier.
   *
   * This single number is the whole feel of the camera. It's an exponential
   * rate rather than a fraction-per-frame, so the motion is identical at 30 and
   * 144 FPS (DESIGN.md §Camera — smooth panning, slight cinematic easing).
   */
  smoothing: number;
  /** Multiplier on horizontal wheel deltas. */
  wheelSensitivity: number;
  /** How hard zoom chases its target. Slower than panning; zoom is a statement. */
  zoomSmoothing: number;
  minZoom: number;
  maxZoom: number;
  /**
   * Below this, a change in position isn't worth telling anyone about. Keeps
   * the camera from publishing sub-pixel noise every frame.
   */
  publishThreshold: number;
}

export const CAMERA_SETTINGS: CameraSettings = {
  panSpeed: 880,
  smoothing: 7.5,
  wheelSensitivity: 1,
  zoomSmoothing: 5,
  minZoom: 1,
  maxZoom: 3,
  publishThreshold: 0.5,
};

/**
 * Keys that pan the camera, by `KeyboardEvent.code`.
 *
 * Codes rather than `key`, so the left hand keeps working on layouts where the
 * letters have moved (AZERTY, Dvorak) — `KeyA` is the same physical key
 * everywhere (WORLD.md §Navigation lists keyboard as a first-class input).
 */
export const PAN_LEFT_KEYS: ReadonlySet<string> = new Set(["KeyA", "ArrowLeft"]);
export const PAN_RIGHT_KEYS: ReadonlySet<string> = new Set(["KeyD", "ArrowRight"]);
