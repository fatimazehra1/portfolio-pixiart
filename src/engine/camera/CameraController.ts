import type { Camera } from "./Camera";
import {
  CAMERA_SETTINGS,
  PAN_LEFT_KEYS,
  PAN_RIGHT_KEYS,
  WORLD_WIDTH,
  type CameraSettings,
} from "./CameraConfig";

export interface CameraControllerOptions {
  /** The camera to drive. */
  camera: Camera;
  /** Element that receives wheel events. Keys are listened for on the window. */
  host: HTMLElement;
  /** Total width of the world in CSS pixels. Defaults to `WORLD_WIDTH`. */
  worldWidth?: number;
  /** Overrides for any of the tuning values. */
  settings?: Partial<CameraSettings>;
  /**
   * Called whenever the view has moved far enough to be worth reporting.
   * `viewLeft` is the world x at the left edge, which is what backdrops want.
   */
  onMove?: (viewLeft: number, zoom: number) => void;
}

/**
 * Turns input into camera movement.
 *
 * Deliberately knows nothing about what it is moving *over*. It reads the
 * keyboard and the wheel, pushes the camera's target, and reports where the
 * view ended up through `onMove` — whoever wired it decides what listens. That
 * separation is what lets the same controller drive a player-following camera
 * later without being rewritten (WORLD.md §Camera Rules).
 *
 * # Feel
 * Held keys move the *target*, not the camera; the camera eases after it. So a
 * tap nudges and drifts to a stop, a hold accelerates smoothly to full speed,
 * and releasing coasts rather than stopping dead. Wheel input pushes the same
 * target, which is why a flick of a trackpad glides instead of jumping.
 *
 * # Usage
 * ```ts
 * const controller = new CameraController({ camera, host, onMove });
 * controller.resize(viewport);         // sets the world bounds
 * app.ticker.add((t) => controller.update(t.deltaMS / 1000));
 * controller.destroy();                // detaches every listener
 * ```
 */
export class CameraController {
  private readonly camera: Camera;
  private readonly host: HTMLElement;
  private readonly settings: CameraSettings;
  private readonly onMove: ((viewLeft: number, zoom: number) => void) | undefined;

  private worldWidth: number;
  private readonly held = new Set<string>();

  /** Last value handed to `onMove`, so we only report real movement. */
  private lastReported = Number.NaN;
  private lastZoom = Number.NaN;
  /** Tracks the moment the camera comes to rest. */
  private wasSettled = false;

  private attached = false;

  constructor(options: CameraControllerOptions) {
    this.camera = options.camera;
    this.host = options.host;
    this.worldWidth = options.worldWidth ?? WORLD_WIDTH;
    this.settings = { ...CAMERA_SETTINGS, ...options.settings };
    this.onMove = options.onMove;

    this.camera.setSmoothing(this.settings.smoothing, this.settings.zoomSmoothing);
    this.camera.setZoomRange(this.settings.minZoom, this.settings.maxZoom);

    this.attach();
  }

  // --- Queries ---------------------------------------------------------------

  /** World x at the left edge of the view. */
  get viewLeft(): number {
    return this.camera.getViewLeft();
  }

  get zoom(): number {
    return this.camera.getZoom();
  }

  /** How far the camera can travel, in CSS pixels. Zero if the world fits. */
  get travel(): number {
    return Math.max(0, this.worldWidth - this.camera.getViewport().width);
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Re-fit the world bounds to a new viewport.
   *
   * The bounds are the whole world by width and exactly one viewport tall, so
   * the camera is free horizontally and pinned vertically — this is a side
   * view, and nothing good comes of letting it drift up and down.
   */
  resize(width: number, height: number): void {
    this.camera.setViewport({ width, height });
    this.camera.setBounds({ x: 0, y: 0, width: this.worldWidth, height });
  }

  /** Change how wide the world is. Re-clamps immediately. */
  setWorldWidth(worldWidth: number): void {
    this.worldWidth = worldWidth;
    const viewport = this.camera.getViewport();
    this.resize(viewport.width, viewport.height);
  }

  /** Put the camera at the west end of the world, with no easing. */
  snapToStart(): void {
    this.camera.snapTo(0, 0);
    this.wasSettled = true;
    this.report(true);
  }

  /** Advance input and easing. `delta` is in seconds. */
  update(delta: number): void {
    const direction = this.direction();

    if (direction !== 0) {
      // Push the target, not the camera. Scaled by zoom so a zoomed-in view
      // travels the same apparent distance per second as a wide one.
      this.camera.panBy((direction * this.settings.panSpeed * delta) / this.camera.getZoom());
    }

    this.camera.update(delta);

    // The publish threshold means the last fraction of a pixel of a settle can
    // go unreported, leaving the published position slightly stale for as long
    // as the camera sits still. Forcing one report the moment it comes to rest
    // costs a single extra call and makes the resting value exact.
    const settled = this.camera.isSettled();
    this.report(settled && !this.wasSettled);
    this.wasSettled = settled;
  }

  /** Detach every listener. Safe to call twice. */
  destroy(): void {
    if (!this.attached) return;
    this.attached = false;

    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.host.removeEventListener("wheel", this.onWheel);

    this.held.clear();
  }

  // --- Internal --------------------------------------------------------------

  private attach(): void {
    if (this.attached) return;
    this.attached = true;

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    // A key held while the window loses focus never sends its keyup, and the
    // camera would drift forever on return.
    window.addEventListener("blur", this.onBlur);
    this.host.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private direction(): number {
    let direction = 0;
    for (const code of this.held) {
      if (PAN_LEFT_KEYS.has(code)) direction -= 1;
      if (PAN_RIGHT_KEYS.has(code)) direction += 1;
    }
    // Both directions held cancel out rather than fighting.
    return Math.sign(direction);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!PAN_LEFT_KEYS.has(event.code) && !PAN_RIGHT_KEYS.has(event.code)) return;
    // Let the browser have the keys while someone is typing.
    if (isTextEntry(event.target)) return;

    this.held.add(event.code);
    // Arrows would otherwise scroll the page under the canvas.
    event.preventDefault();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.held.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.held.clear();
  };

  private readonly onWheel = (event: WheelEvent): void => {
    // Trackpads send horizontal deltas directly; mice usually only have a
    // vertical wheel, so shift-scroll is the conventional stand-in.
    const horizontal = event.deltaX !== 0 ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (horizontal === 0) return;

    this.camera.panBy((horizontal * this.settings.wheelSensitivity) / this.camera.getZoom());
    event.preventDefault();
  };

  /** Tell the listener where the view is, if it has actually moved. */
  private report(force: boolean): void {
    if (!this.onMove) return;

    const viewLeft = this.camera.getViewLeft();
    const zoom = this.camera.getZoom();

    const moved = !(Math.abs(viewLeft - this.lastReported) < this.settings.publishThreshold);
    const zoomed = !(Math.abs(zoom - this.lastZoom) < 0.001);
    if (!force && !moved && !zoomed) return;

    this.lastReported = viewLeft;
    this.lastZoom = zoom;
    this.onMove(viewLeft, zoom);
  }
}

/** True if the event landed in something the user is typing into. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
