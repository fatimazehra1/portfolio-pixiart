import { worldWidthFor } from "../scene/SceneRegistry";

/**
 * Camera tuning — the single place to edit how the world is explored.
 */

/**
 * The width of the whole world in CSS pixels, derived from the scenes in it.
 *
 * WORLD.md describes one long coastal waterfront running from the dock to the
 * lighthouse, ten locations deep, and this is the number that decides whether
 * that reads as a coast or as a high street. At 7200 the gaps between landmarks
 * came out around 170 pixels — you would leave one building and immediately be
 * standing at the next, which is the opposite of a journey. At the width the
 * ten current scenes produce, each gap is roughly 540.
 *
 * Derived rather than declared, and that is the important part: it used to be a
 * constant that every position in the world was expressed as a fraction of, so
 * changing it moved every building at once and adding an eleventh chapter meant
 * re-composing the ten already placed. Now the scenes state where they are in
 * absolute pixels and the coast is however long it needs to be to hold them.
 */
export const WORLD_WIDTH = worldWidthFor();

/**
 * The height of the whole world in CSS pixels, or 0 for "as tall as whatever
 * the viewport happens to be".
 *
 * The waterfront is a side view (DESIGN.md §Pixel Scale) and today every system
 * is drawn exactly one screen tall, so there is nothing above or below to look
 * at and the camera stays pinned vertically. The axis exists because the
 * lighthouse climb in Phase 6 is the first thing that will need it; set a real
 * height then and vertical movement comes alive without touching this system.
 */
export const WORLD_HEIGHT = 0;

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
  /**
   * The same, for a camera locked onto a follow target. Slacker than manual
   * panning on purpose: a camera welded to the player reads as a jitter, a
   * camera trailing half a step behind reads as a camera.
   */
  followSmoothing: number;
  /** Multiplier on horizontal wheel deltas. */
  wheelSensitivity: number;
  /**
   * Multiplier on vertical wheel deltas when the wheel is zooming.
   *
   * Small, and it has to be: wheel deltas arrive in the dozens or hundreds and
   * this is an exponent. What it buys is a map you approach by scrolling, which
   * is how "zoom toward a world" reads on a trackpad.
   */
  wheelZoomSensitivity: number;
  /** How hard zoom chases its target. Slower than panning; zoom is a statement. */
  zoomSmoothing: number;
  /**
   * How fast a held zoom key travels, as an exponential rate. Zoom is
   * multiplicative — 1 → 2 has to feel like 2 → 4 — so this is e^(rate·dt) per
   * second rather than a flat number of zoom units.
   */
  zoomSpeed: number;
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
  followSmoothing: 4.5,
  wheelSensitivity: 1,
  wheelZoomSensitivity: 0.0016,
  zoomSmoothing: 5,
  zoomSpeed: 1.1,
  /**
   * The floor is 0.5 rather than 1 now, and that is the overview's doing.
   *
   * A world you are inside should never be shown smaller than it was composed
   * to be seen, so the interior sets its own floor of 1 through
   * `setZoomRange`. The map is the opposite case: it has to be possible to
   * stand far enough back to see eight worlds at once, and that is below 1.
   */
  minZoom: 0.5,
  maxZoom: 3,
  publishThreshold: 0.5,
};

/**
 * Keys that drive the camera, by `KeyboardEvent.code`.
 *
 * Codes rather than `key`, so the left hand keeps working on layouts where the
 * letters have moved (AZERTY, Dvorak) — `KeyA` is the same physical key
 * everywhere (WORLD.md §Navigation lists keyboard as a first-class input).
 *
 * WASD and the arrows pan; `-` and `=` zoom out and in; R puts the camera back
 * where it started. The zoom and reset keys are development tooling — DESIGN.md
 * §Camera reserves zoom itself for interactions, and nothing in the finished
 * world will hand the visitor a zoom control.
 */
export const PAN_LEFT_KEYS: ReadonlySet<string> = new Set(["KeyA", "ArrowLeft"]);
export const PAN_RIGHT_KEYS: ReadonlySet<string> = new Set(["KeyD", "ArrowRight"]);
export const PAN_UP_KEYS: ReadonlySet<string> = new Set(["KeyW", "ArrowUp"]);
export const PAN_DOWN_KEYS: ReadonlySet<string> = new Set(["KeyS", "ArrowDown"]);
// `-` and `=` rather than Q and E. E is the world's interact key, and a key that
// both zooms the camera and opens a building is a key that does neither well.
export const ZOOM_OUT_KEYS: ReadonlySet<string> = new Set(["Minus", "NumpadSubtract"]);
export const ZOOM_IN_KEYS: ReadonlySet<string> = new Set(["Equal", "NumpadAdd"]);
export const RESET_KEYS: ReadonlySet<string> = new Set(["KeyR"]);

/** Every key the camera claims, so the controller can ignore the rest cheaply. */
export const CAMERA_KEYS: ReadonlySet<string> = new Set([
  ...PAN_LEFT_KEYS,
  ...PAN_RIGHT_KEYS,
  ...PAN_UP_KEYS,
  ...PAN_DOWN_KEYS,
  ...ZOOM_OUT_KEYS,
  ...ZOOM_IN_KEYS,
  ...RESET_KEYS,
]);
