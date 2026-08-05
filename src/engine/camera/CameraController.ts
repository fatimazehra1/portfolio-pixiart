import type { Camera, FollowOptions, FollowTarget } from "./Camera";
import {
  CAMERA_KEYS,
  CAMERA_SETTINGS,
  PAN_DOWN_KEYS,
  PAN_LEFT_KEYS,
  PAN_RIGHT_KEYS,
  PAN_UP_KEYS,
  RESET_KEYS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  ZOOM_IN_KEYS,
  ZOOM_OUT_KEYS,
  type CameraSettings,
} from "./CameraConfig";

export interface CameraControllerOptions {
  /** The camera to drive. */
  camera: Camera;
  /** Element that receives wheel events. Keys are listened for on the window. */
  host: HTMLElement;
  /** Total width of the world in CSS pixels. Defaults to `WORLD_WIDTH`. */
  worldWidth?: number;
  /**
   * Total height of the world in CSS pixels. Defaults to `WORLD_HEIGHT`; 0 (or
   * anything shorter than the viewport) pins the camera vertically.
   */
  worldHeight?: number;
  /** Overrides for any of the tuning values. */
  settings?: Partial<CameraSettings>;
  /**
   * Called whenever the view has moved far enough to be worth reporting.
   * `viewLeft` / `viewTop` are the world coordinates of the view's top-left
   * corner, which is what backdrops want.
   */
  onMove?: (viewLeft: number, zoom: number, viewTop: number) => void;
}

/**
 * Turns input into camera movement.
 *
 * Deliberately knows nothing about what it is moving *over*. It reads the
 * keyboard and the wheel, pushes the camera's target, and reports where the
 * view ended up through `onMove` — whoever wired it decides what listens. That
 * separation is what lets the same controller drive a player-following camera
 * without being rewritten (WORLD.md §Camera Rules).
 *
 * # Feel
 * Held keys move the *target*, not the camera; the camera eases after it. So a
 * tap nudges and drifts to a stop, a hold accelerates smoothly to full speed,
 * and releasing coasts rather than stopping dead. Wheel input pushes the same
 * target, which is why a flick of a trackpad glides instead of jumping.
 *
 * # Keys
 * `A`/`D` and `←`/`→` pan, `W`/`S` and `↑`/`↓` pan vertically, `-`/`=` zoom out
 * and in, `R` resets. Panning by hand while the camera is following something
 * suspends the follow rather than cancelling it, and `R` hands control back —
 * so a look around during development doesn't leave the camera unhitched.
 *
 * The zoom and reset keys are development tooling. DESIGN.md §Camera reserves
 * zoom for interactions; the finished world gives the visitor no zoom control.
 *
 * # Usage
 * ```ts
 * const controller = new CameraController({ camera, host, onMove });
 * controller.resize(width, height);    // sets the world bounds
 * app.ticker.add((t) => controller.update(t.deltaMS / 1000));
 * controller.follow(player);           // camera locks on
 * controller.destroy();                // detaches every listener
 * ```
 */
export class CameraController {
  private readonly camera: Camera;
  private readonly host: HTMLElement;
  private readonly settings: CameraSettings;
  private readonly onMove:
    | ((viewLeft: number, zoom: number, viewTop: number) => void)
    | undefined;

  private worldWidth: number;
  private worldHeight: number;
  private readonly held = new Set<string>();

  /** Last values handed to `onMove`, so we only report real movement. */
  private lastLeft = Number.NaN;
  private lastTop = Number.NaN;
  private lastZoom = Number.NaN;
  /** Tracks the moment the camera comes to rest. */
  private wasSettled = false;

  private attached = false;

  constructor(options: CameraControllerOptions) {
    this.camera = options.camera;
    this.host = options.host;
    this.worldWidth = options.worldWidth ?? WORLD_WIDTH;
    this.worldHeight = options.worldHeight ?? WORLD_HEIGHT;
    this.settings = { ...CAMERA_SETTINGS, ...options.settings };
    this.onMove = options.onMove;

    this.camera.setSmoothing(
      this.settings.smoothing,
      this.settings.zoomSmoothing,
      this.settings.followSmoothing
    );
    this.camera.setZoomRange(this.settings.minZoom, this.settings.maxZoom);

    this.attach();
  }

  // --- Queries ---------------------------------------------------------------

  /** World x at the left edge of the view. */
  get viewLeft(): number {
    return this.camera.getViewLeft();
  }

  /** World y at the top edge of the view. */
  get viewTop(): number {
    return this.camera.getViewTop();
  }

  get zoom(): number {
    return this.camera.getZoom();
  }

  /** How far the camera can travel horizontally, in CSS pixels. 0 if the world fits. */
  get travel(): number {
    return Math.max(0, this.worldWidth - this.camera.getViewport().width);
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Re-fit the world bounds to a new viewport.
   *
   * The bounds are the whole world by width, and at least one viewport tall so
   * a world with no vertical extent simply pins the camera — this is a side
   * view, and nothing good comes of letting it drift over empty space.
   */
  resize(width: number, height: number): void {
    this.camera.setViewport({ width, height });
    this.camera.setBounds({
      x: 0,
      y: 0,
      width: this.worldWidth,
      height: Math.max(this.worldHeight, height),
    });
  }

  /** Change how big the world is. Re-clamps immediately. */
  setWorldSize(worldWidth: number, worldHeight = this.worldHeight): void {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    const viewport = this.camera.getViewport();
    this.resize(viewport.width, viewport.height);
  }

  /**
   * Head towards a world point, easing. What per-scene framing uses.
   *
   * Goes through the controller rather than the camera so that a programmatic
   * move counts as taking the wheel, exactly as a held key does — otherwise
   * framing a scene while following a subject would fight the subject for a
   * frame and lose.
   */
  panTo(x: number, y?: number): void {
    this.takeManualControl();
    this.camera.panTo(x, y);
  }

  /** Head towards a zoom level, easing. See `Camera.zoomTo`. */
  zoomTo(zoom: number): void {
    this.camera.zoomTo(zoom);
  }

  /** Lock the camera onto something. See `Camera.follow`. */
  follow(target: FollowTarget, options?: FollowOptions): void {
    this.camera.follow(target, options);
  }

  /** Release the target and leave the camera where it stands. */
  unfollow(): void {
    this.camera.unfollow();
  }

  /**
   * Put the camera at the west end of the world, with no easing, and make that
   * the position `R` returns to.
   */
  snapToStart(): void {
    this.camera.setHome(0, 0);
    this.camera.snapTo(0, 0);
    this.wasSettled = true;
    this.report(true);
  }

  /** Advance input and easing. `delta` is in seconds. */
  update(delta: number): void {
    this.applyPan(delta);
    this.applyZoom(delta);

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

  /** Push the camera's target by however far the held pan keys ask for. */
  private applyPan(delta: number): void {
    const x = this.axis(PAN_LEFT_KEYS, PAN_RIGHT_KEYS);
    const y = this.axis(PAN_UP_KEYS, PAN_DOWN_KEYS);
    if (x === 0 && y === 0) return;

    // Diagonals would otherwise travel √2 times faster than the cardinals.
    const length = Math.hypot(x, y);
    // Scaled by zoom so a zoomed-in view travels the same apparent distance per
    // second as a wide one.
    const step = (this.settings.panSpeed * delta) / (this.camera.getZoom() * length);

    this.takeManualControl();
    this.camera.panBy(x * step, y * step);
  }

  /** Push the camera's target zoom by however far the held zoom keys ask for. */
  private applyZoom(delta: number): void {
    const direction = this.axis(ZOOM_OUT_KEYS, ZOOM_IN_KEYS);
    if (direction === 0) return;

    // Exponential, so zooming in for a second and back out for a second lands
    // exactly where it started.
    this.camera.zoomBy(Math.exp(direction * this.settings.zoomSpeed * delta));
  }

  /** -1 for the negative key set, +1 for the positive, 0 for neither or both. */
  private axis(negative: ReadonlySet<string>, positive: ReadonlySet<string>): number {
    let direction = 0;
    for (const code of this.held) {
      if (negative.has(code)) direction -= 1;
      if (positive.has(code)) direction += 1;
    }
    // Both directions held cancel out rather than fighting.
    return Math.sign(direction);
  }

  /**
   * Hand the camera to whoever is at the keyboard.
   *
   * Suspends a follow rather than dropping it, so `R` can give the target back.
   * Without this, panning by hand while following would fight the target for a
   * frame and lose, and the camera would look frozen.
   */
  private takeManualControl(): void {
    this.camera.pauseFollow();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!CAMERA_KEYS.has(event.code)) return;
    // Let the browser have the keys while someone is typing.
    if (isTextEntry(event.target)) return;

    // Reset is an action, not a state — fire it once rather than every frame
    // the key happens to be down.
    if (RESET_KEYS.has(event.code)) {
      if (!event.repeat) this.camera.reset();
      event.preventDefault();
      return;
    }

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

    this.takeManualControl();
    this.camera.panBy((horizontal * this.settings.wheelSensitivity) / this.camera.getZoom());
    event.preventDefault();
  };

  /** Tell the listener where the view is, if it has actually moved. */
  private report(force: boolean): void {
    if (!this.onMove) return;

    const viewLeft = this.camera.getViewLeft();
    const viewTop = this.camera.getViewTop();
    const zoom = this.camera.getZoom();

    // Negated `<` rather than `>=`, so the opening NaN counts as movement and
    // the very first frame always publishes.
    const moved =
      !(Math.abs(viewLeft - this.lastLeft) < this.settings.publishThreshold) ||
      !(Math.abs(viewTop - this.lastTop) < this.settings.publishThreshold);
    const zoomed = !(Math.abs(zoom - this.lastZoom) < 0.001);
    if (!force && !moved && !zoomed) return;

    this.lastLeft = viewLeft;
    this.lastTop = viewTop;
    this.lastZoom = zoom;
    this.onMove(viewLeft, zoom, viewTop);
  }
}

/** True if the event landed in something the user is typing into. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
