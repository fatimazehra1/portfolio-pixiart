import type { Camera, FollowOptions, FollowTarget } from "./Camera";
import type { Bounds } from "../types";
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

/**
 * How far a pointer must travel before it counts as a drag, in CSS pixels.
 *
 * Small, but not zero. Zero would make every click a one-pixel pan and would
 * make `wasDragged` true for every click that had any tremor in it at all.
 */
const DRAG_THRESHOLD = 4;

/**
 * Wheel delta that adds up to one zoom level.
 *
 * A little under one mouse notch (~100), so a deliberate click of the wheel
 * always moves a level, and a trackpad has to be pushed rather than brushed.
 */
const WHEEL_STEP = 80;

/** What a wheel gesture does. See `CameraControllerOptions.wheelMode`. */
export type WheelMode = "pan" | "zoom";

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
  /**
   * The rectangle the camera may travel over, in world pixels.
   *
   * Takes precedence over `worldWidth`/`worldHeight`, which describe a world
   * that starts at the origin and runs east — the shape of the old single
   * coastline. A chapter world and the overview are both plain rectangles that
   * may start anywhere, so they pass this instead.
   */
  bounds?: Bounds;
  /**
   * What the wheel does. `"pan"` scrolls sideways, `"zoom"` pushes in and out.
   *
   * Two modes because the two views want opposite things from the same gesture.
   * Inside a world you are walking along a shore and the wheel is travel; on
   * the overview map you are choosing how close to a world you want to be, and
   * the wheel is approach. See `DESIGN.md §Camera`: zoom is for interactions,
   * and on the map, zoom *is* the interaction.
   */
  wheelMode?: WheelMode;
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
 * `A`/`D` and `←`/`→` pan, `W`/`S` and `↑`/`↓` pan vertically, `-`/`=` (with or
 * without Ctrl) zoom out and in a level at a time, `R` resets. Panning by hand
 * while the camera is following something suspends the follow rather than
 * cancelling it, and `R` hands control back.
 *
 * # Zoom is stepped, and that is not a limitation
 * Every zoom the visitor can reach is one whole screen pixel per art pixel.
 * See `zoomStep`: a fractional zoom does not survive the camera's own
 * quantisation, so offering one only means asking for a level that does not
 * exist and landing on the one that does.
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

  /**
   * The world rectangle, in world pixels.
   *
   * Replaces the width-and-a-pinned-height pair the controller used to hold.
   * That pair was the single horizontal coastline written into the camera: a
   * world always at the origin, always one viewport tall, always travelled from
   * west to east. A chapter world and the overview map are both ordinary
   * rectangles, and this is what lets them be.
   */
  private worldBounds: Bounds;
  private wheelMode: WheelMode;
  private readonly held = new Set<string>();

  /** Last values handed to `onMove`, so we only report real movement. */
  private lastLeft = Number.NaN;
  private lastTop = Number.NaN;
  private lastZoom = Number.NaN;
  /** Tracks the moment the camera comes to rest. */
  private wasSettled = false;

  /**
   * The pointer drag in progress, if any.
   *
   * Held as the last position in *world* space rather than screen space, so a
   * drag that crosses a zoom change (a trackpad pinch mid-drag) does not jump:
   * the grab point stays the same point on the map whatever the scale does.
   */
  /**
   * How many times the visitor has driven the zoom themselves.
   *
   * A counter rather than a flag so a reader can tell "has it changed since I
   * last looked" without anyone having to reset it. Counted at the input sites
   * because there are three of them — wheel, keys, and any future pinch — and
   * inferring it by watching the zoom value cannot work: the camera quantises
   * zoom to whole pixels per art pixel, so the rendered value never equals the
   * requested one and every comparison reads as a change.
   */
  private zoomInputCount = 0;

  /** Wheel delta banked toward the next whole zoom level. See `onWheel`. */
  private wheelTravel = 0;

  private dragging = false;
  private dragPointer = -1;
  private dragFrom = { x: 0, y: 0 };
  /** How far the pointer has travelled this drag, in CSS pixels. */
  private dragDistance = 0;

  private attached = false;

  constructor(options: CameraControllerOptions) {
    this.camera = options.camera;
    this.host = options.host;
    this.worldBounds = options.bounds ?? {
      x: 0,
      y: 0,
      width: options.worldWidth ?? WORLD_WIDTH,
      height: options.worldHeight ?? WORLD_HEIGHT,
    };
    this.wheelMode = options.wheelMode ?? "pan";
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
    return Math.max(0, this.worldBounds.width - this.camera.getViewport().width);
  }

  /** The rectangle the camera is currently confined to, in world pixels. */
  get bounds(): Bounds {
    return { ...this.worldBounds };
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
      x: this.worldBounds.x,
      y: this.worldBounds.y,
      width: this.worldBounds.width,
      // A world with no vertical extent still gets a viewport's worth, which is
      // what pins the camera in a side view rather than letting it drift over
      // empty space. A world that has real height keeps it.
      height: Math.max(this.worldBounds.height, height),
    });
  }

  /** Change how big the world is. Re-clamps immediately. */
  setWorldSize(worldWidth: number, worldHeight = this.worldBounds.height): void {
    this.setBounds({ x: 0, y: 0, width: worldWidth, height: worldHeight });
  }

  /**
   * Move the camera into a different world. Re-clamps immediately.
   *
   * The one call that swaps which place the camera is allowed to be in — the
   * overview map, or the inside of a chapter. Everything else about the camera
   * is unchanged by the swap, which is the point: entering a world is a change
   * of bounds and a change of pivot, not a different camera.
   */
  setBounds(bounds: Bounds): void {
    this.worldBounds = { ...bounds };
    const viewport = this.camera.getViewport();
    this.resize(viewport.width, viewport.height);
  }

  /** Change what a wheel gesture does. See `CameraControllerOptions.wheelMode`. */
  setWheelMode(mode: WheelMode): void {
    this.wheelMode = mode;
  }

  /** Change how far in and out the camera may go. See `Camera.setZoomRange`. */
  setZoomRange(min: number, max: number): void {
    this.camera.setZoomRange(min, max);
  }

  /**
   * Put the camera at a world point with no easing, and make that its home.
   *
   * What arriving inside a world uses. A cut is correct here and only here: you
   * have just travelled, the frame you are cutting from is the map and the
   * frame you are cutting to is the ground, and easing between two places that
   * share no coordinate system would be a slide across nothing.
   */
  snapTo(x: number, y = 0): void {
    this.camera.setHome(x, y);
    this.camera.snapTo(x, y);
    this.wasSettled = true;
    this.report(true);
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
    this.snapTo(this.worldBounds.x, this.worldBounds.y);
  }

  /** Advance input and easing. `delta` is in seconds. */
  update(delta: number): void {
    this.applyPan(delta);

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
    this.host.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);

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
    this.host.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
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

  /**
   * Move the zoom by whole grid levels.
   *
   * The camera renders at `step / pixelSize` for a whole `step` — anything
   * else is silently rounded to it. A continuous zoom therefore spends most of
   * its travel asking for levels that do not exist and then landing on the one
   * that does, which reads as the map sticking and jumping. Stepping through
   * the levels themselves means every zoom the visitor asks for is a zoom they
   * get, and every one of them is one whole screen pixel per art pixel.
   *
   * Anchored on a screen point where one is given — the thing under the cursor
   * is the thing you arrive at, which is the interaction the map is built on.
   */
  zoomStep(direction: number, screenX?: number, screenY?: number): void {
    if (direction === 0) return;

    const pixelSize = this.camera.getPixelSize();
    const level = Math.max(1, Math.round(pixelSize * this.camera.getTargetZoom()));
    const target = Math.max(1, level + Math.sign(direction)) / pixelSize;
    // Already at the end of the ramp: don't count it as an input, or the map
    // would stop re-fitting itself on resize because someone leant on a key.
    if (Math.abs(target - this.camera.getTargetZoom()) < 1e-6) return;

    this.zoomInputCount++;

    if (screenX === undefined || screenY === undefined) {
      this.camera.zoomTo(target);
      return;
    }

    const local = this.local(screenX, screenY);
    const before = this.camera.screenToWorld(local);
    this.camera.zoomTo(target);
    const after = this.camera.screenToWorld(local);

    this.takeManualControl();
    this.camera.panBy(before.x - after.x, before.y - after.y);
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

    // Zoom is a step, not a state: one level per press, repeats included so a
    // held key walks the ramp rather than sliding through zooms that do not
    // exist. Ctrl is deliberately not excluded — Ctrl +/- is the zoom gesture
    // every visitor already knows, and on this canvas it should zoom the map.
    if (ZOOM_IN_KEYS.has(event.code) || ZOOM_OUT_KEYS.has(event.code)) {
      this.zoomStep(ZOOM_IN_KEYS.has(event.code) ? 1 : -1);
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

  /**
   * Whether the last pointer gesture was a drag rather than a click.
   *
   * The overview needs this: a world under the cursor at the end of a pan is
   * not a world you asked to enter, and without the distinction every drag that
   * happens to finish over an island flies you into it.
   */
  /** How many deliberate zoom inputs have happened. See `zoomInputCount`. */
  get zoomInputs(): number {
    return this.zoomInputCount;
  }

  get wasDragged(): boolean {
    return this.dragDistance > DRAG_THRESHOLD;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    // Primary button only. A right-drag is a context menu everywhere else and
    // should stay one here.
    if (event.button !== 0) return;

    this.dragging = true;
    this.dragPointer = event.pointerId;
    this.dragDistance = 0;
    this.dragFrom = this.camera.screenToWorld(this.local(event.clientX, event.clientY));
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.dragPointer) return;

    const local = this.local(event.clientX, event.clientY);
    const now = this.camera.screenToWorld(local);
    const dx = this.dragFrom.x - now.x;
    const dy = this.dragFrom.y - now.y;

    this.dragDistance += Math.hypot(dx, dy) * this.camera.getZoom();
    // Below the threshold nothing moves at all, so the tiny tremor between
    // pressing and releasing a mouse button never nudges the map.
    if (this.dragDistance <= DRAG_THRESHOLD) return;

    this.takeManualControl();
    // Pushes the target and lets the easing carry the camera there, rather than
    // assigning the position outright. `Camera.snapTo` would land it exactly on
    // the finger, but it also collapses the zoom onto its target — so a drag
    // during a zoom ease would jerk the scale, which is far worse than the
    // hundred milliseconds of give the easing costs.
    this.camera.panBy(dx, dy);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.dragPointer) return;
    this.dragging = false;
    this.dragPointer = -1;
  };

  /** A client point, relative to the canvas. */
  private local(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.host.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private readonly onWheel = (event: WheelEvent): void => {
    // Ctrl-wheel is the browser's own page zoom and a trackpad pinch. Both
    // mean "closer", and on this canvas that is the map's business.
    if (this.wheelMode === "zoom" || event.ctrlKey) {
      if (event.deltaY === 0) return;
      event.preventDefault();

      // Accumulated rather than acted on per event: one mouse notch is around
      // 100 units and one trackpad glide is thirty events of three, and a
      // level per event would send a trackpad across the whole ramp at a
      // touch. The remainder is kept, so slow scrolling still gets there.
      this.wheelTravel += event.deltaY;
      while (Math.abs(this.wheelTravel) >= WHEEL_STEP) {
        const direction = this.wheelTravel > 0 ? -1 : 1;
        this.wheelTravel -= Math.sign(this.wheelTravel) * WHEEL_STEP;
        this.zoomStep(direction, event.clientX, event.clientY);
      }
      return;
    }

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
