import { Container } from "pixi.js";
import { CAMERA_SETTINGS } from "./CameraConfig";
import type { Bounds, Size, Vec2 } from "../types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Anything with a world position the camera can lock onto — a player sprite, a
 * boat, a plain `{ x, y }`. Read live every frame, so the camera tracks whatever
 * the object does without anyone having to push updates at it.
 *
 * Structural on purpose: a Pixi `Container` already satisfies it.
 */
export interface FollowTarget {
  readonly x: number;
  readonly y: number;
}

/** The camera's transform as applied, for anything positioning itself against it. */
export interface CameraView {
  /** World x at the left edge of the view. */
  viewLeft: number;
  /** The snapped screen translation actually written to the container. */
  screenX: number;
  /** The same, vertically. What the sky reads to hold the horizon. */
  screenY: number;
  /** The rendered (quantised) zoom. */
  zoom: number;
  /** Screen pixels per art pixel. Always a whole number. */
  step: number;
}

export interface FollowOptions {
  /** World-space offset from the target. Lets the subject sit off-centre. */
  offset?: Partial<Vec2>;
  /** Override the follow easing rate for this target. */
  smoothing?: number;
  /** Cut straight to the target instead of easing in from wherever we were. */
  immediate?: boolean;
}

/**
 * A 2D pan + zoom camera (DESIGN.md §Camera: smooth panning, no sudden jumps,
 * slight cinematic easing, zoom only for interactions). Implemented by
 * transforming its own container: whatever the camera "sees" lives inside
 * `container`. Moving/zooming the camera sets that container's position/scale
 * so the target world point sits at the viewport centre.
 *
 * # Where it goes
 * The camera keeps *two* positions: where it is, and where it's heading. Input
 * moves the target; `update` walks the position towards it. Nothing ever jumps
 * unless something calls `snapTo`, which is what makes panning feel like a
 * camera being pushed rather than a value being assigned.
 *
 * The easing is exponential and framed in seconds — `1 - e^(-k·dt)` — so the
 * motion is identical at 30 FPS and 144 FPS. A plain `pos += (target - pos) *
 * 0.1` per frame would quietly make the camera twice as fast on a 120Hz screen.
 *
 * # Following
 * Assign a target with `follow` and the camera takes its heading from that
 * object every frame instead of from whoever last called `panTo` (WORLD.md
 * §Camera Rules — the camera follows the player). The easing is unchanged, so a
 * followed subject is trailed rather than welded to the middle of the screen.
 *
 * No rotation (2.5D side view).
 */
export class Camera {
  /** The transformed container. World-space content mounts inside this. */
  readonly container: Container;

  private viewport: Size;
  private bounds: Bounds | null = null;
  /** World-space point currently shown at the centre of the viewport. */
  private position: Vec2 = { x: 0, y: 0 };
  /** Where the camera is heading. */
  private target: Vec2 = { x: 0, y: 0 };
  /** Where `reset` goes back to. */
  private home: Vec2 = { x: 0, y: 0 };

  private zoom = 1;
  private targetZoom = 1;
  /**
   * The zoom actually rendered, quantised so one art pixel covers a whole
   * number of screen pixels. The easing runs on `zoom`; this is where it lands.
   */
  private renderZoom = 1;
  /** One art pixel, in world units — the shared `pixelScale`. */
  private pixelSize = 1;
  /** The world y that zoom pivots around. See `setAnchorY`. */
  private anchorY: number | null = null;
  private minZoom = CAMERA_SETTINGS.minZoom;
  private maxZoom = CAMERA_SETTINGS.maxZoom;

  private smoothing = CAMERA_SETTINGS.smoothing;
  private zoomSmoothing = CAMERA_SETTINGS.zoomSmoothing;
  private followSmoothing = CAMERA_SETTINGS.followSmoothing;

  private followTarget: FollowTarget | null = null;
  private followOffset: Vec2 = { x: 0, y: 0 };
  private followRate: number | null = null;
  /** Set while manual input has temporarily taken the wheel. */
  private followPaused = false;

  constructor(viewport: Size) {
    this.container = new Container();
    this.container.label = "camera";
    this.viewport = viewport;
    this.apply();
  }

  // --- Queries ---------------------------------------------------------------

  getPosition(): Vec2 {
    return { ...this.position };
  }

  getTarget(): Vec2 {
    return { ...this.target };
  }

  /**
   * The zoom on screen. Quantised — see `setPixelSize`.
   *
   * Deliberately the *rendered* value rather than the one the easing is
   * carrying, so anything culling or hit-testing against it agrees with what
   * the viewer is actually looking at.
   */
  getZoom(): number {
    return this.renderZoom;
  }

  /** Screen pixels per art pixel at the current zoom. Always a whole number. */
  getPixelStep(): number {
    return Math.max(1, Math.round(this.pixelSize * this.zoom));
  }

  /**
   * Everything a parallax layer needs to place itself *against this camera*.
   *
   * `screenX` is the transform actually applied, after snapping — not the ideal
   * one. That distinction is the whole reason this exists: a layer that wants to
   * hold still has to cancel the translation the camera really used, and a layer
   * that recomputes the ideal value and rounds it a second time will disagree
   * with the camera by a whole pixel whenever the two roundings fall either side
   * of a boundary. Which is a layer that shimmers.
   */
  getView(): CameraView {
    return {
      viewLeft: this.getViewLeft(),
      screenX: this.container.x,
      screenY: this.container.y,
      zoom: this.renderZoom,
      step: this.getPixelStep(),
    };
  }

  getViewport(): Size {
    return { ...this.viewport };
  }

  getBounds(): Bounds | null {
    return this.bounds ? { ...this.bounds } : null;
  }

  /**
   * The world x-coordinate at the *left* edge of the view.
   *
   * This is the number backdrops want: it starts at 0 at the west end of the
   * world and grows eastward, so a layer can offset itself by it directly.
   */
  getViewLeft(): number {
    return this.position.x - this.viewport.width / this.renderZoom / 2;
  }

  /** The world y-coordinate at the *top* edge of the view. */
  getViewTop(): number {
    return this.position.y - this.viewport.height / this.renderZoom / 2;
  }

  /**
   * The world rectangle currently on screen.
   *
   * What a system culls against: anything outside this doesn't need drawing,
   * which is how a 7200px world stays a 60 FPS world.
   */
  getVisibleBounds(): Bounds {
    return {
      x: this.getViewLeft(),
      y: this.getViewTop(),
      width: this.viewport.width / this.renderZoom,
      height: this.viewport.height / this.renderZoom,
    };
  }

  /** True while the camera is still catching up to its target. */
  isSettled(): boolean {
    return (
      Math.abs(this.target.x - this.position.x) < 0.01 &&
      Math.abs(this.target.y - this.position.y) < 0.01 &&
      Math.abs(this.targetZoom - this.zoom) < 0.001
    );
  }

  /** True when a target is assigned *and* actually driving the camera. */
  isFollowing(): boolean {
    return this.followTarget !== null && !this.followPaused;
  }

  // --- Coordinate helpers ----------------------------------------------------

  /**
   * World space → screen space (CSS pixels from the top-left of the viewport).
   *
   * The one correct way to ask "where on screen is this thing?" — for placing
   * DOM overlays, hit-testing a click, or deciding whether a tooltip fits.
   * Reading a sprite's `x` and treating it as a screen coordinate is the bug
   * this exists to prevent, and it only shows up once the camera has moved.
   */
  worldToScreen(point: Vec2): Vec2 {
    return {
      x: (point.x - this.position.x) * this.renderZoom + this.viewport.width / 2,
      y: (point.y - this.position.y) * this.renderZoom + this.viewport.height / 2,
    };
  }

  /** Screen space → world space. The exact inverse of `worldToScreen`. */
  screenToWorld(point: Vec2): Vec2 {
    return {
      x: (point.x - this.viewport.width / 2) / this.renderZoom + this.position.x,
      y: (point.y - this.viewport.height / 2) / this.renderZoom + this.position.y,
    };
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Tell the camera how big one art pixel is, in world units — pass the shared
   * `pixelScale`. Everything the camera renders is snapped to that grid.
   *
   * Without this the camera is a plain float transform, and the moment world
   * content is mounted inside it every sprite in the world starts landing on
   * fractional screen coordinates. Set it before the first frame, and again
   * whenever the scale changes (the viewport got tall enough for a bigger one).
   */
  setPixelSize(size: number): void {
    const next = Math.max(1, Math.round(size));
    if (next === this.pixelSize) return;
    this.pixelSize = next;
    this.apply();
  }

  /**
   * The world y that stays put when the camera zooms. Pass the horizon.
   *
   * A camera zooms around a fixed point, and which point that is decides what
   * the zoom *means*. The default — the middle of the viewport — sits well above
   * the shoreline in a side view, so zooming in pushes the horizon downward and
   * away from it. The sky lives outside the camera and cannot follow, so the sea
   * and the sky come apart: at 2× the horizon had moved 150 pixels off the
   * gradient it is supposed to meet.
   *
   * Pivoting on the horizon instead makes the one line that both halves of the
   * picture share the one line that never moves. Everything above it is sky and
   * stays; everything below is town and grows towards the viewer, which is what
   * zooming into a town should look like.
   *
   * Pass null to go back to pivoting on the middle of the view.
   */
  setAnchorY(y: number | null): void {
    this.anchorY = y;
    this.clampTarget();
    this.apply();
  }

  /** Where zoom pivots vertically, in world pixels. */
  getAnchorY(): number | null {
    return this.anchorY;
  }

  /** Update the visible area (call on resize). Re-clamps and re-applies. */
  setViewport(size: Size): void {
    this.viewport = size;
    this.clampTarget();
    this.apply();
  }

  /** Constrain the camera to a world rectangle, or pass null to remove limits. */
  setBounds(bounds: Bounds | null): void {
    this.bounds = bounds;
    this.clampTarget();
    this.apply();
  }

  setZoomRange(min: number, max: number): void {
    this.minZoom = min;
    this.maxZoom = max;
    this.targetZoom = clamp(this.targetZoom, min, max);
    this.apply();
  }

  /** How hard the camera chases its target. See CameraConfig. */
  setSmoothing(pan: number, zoom = this.zoomSmoothing, follow = this.followSmoothing): void {
    this.smoothing = pan;
    this.zoomSmoothing = zoom;
    this.followSmoothing = follow;
  }

  /** Where `reset` returns to. Defaults to the world origin. */
  setHome(x: number, y = 0): void {
    this.home = { x, y };
  }

  /** Head towards a world point. The camera eases there over the next frames. */
  panTo(x: number, y: number = this.target.y): void {
    this.target = { x, y };
    this.clampTarget();
  }

  /** Head a world-space delta from wherever the camera is currently heading. */
  panBy(dx: number, dy = 0): void {
    this.panTo(this.target.x + dx, this.target.y + dy);
  }

  /** Head towards a zoom level. */
  zoomTo(zoom: number): void {
    this.targetZoom = clamp(zoom, this.minZoom, this.maxZoom);
  }

  /** Multiply the zoom we're heading for. Zoom is geometric: 2× then 2× again. */
  zoomBy(factor: number): void {
    this.zoomTo(this.targetZoom * factor);
  }

  /**
   * Lock onto a target. The camera reads its position every frame from here on,
   * and manual `panTo` calls stop having any lasting effect.
   *
   * The target is held by reference, so a sprite that moves drags the camera
   * with it — nothing has to push positions in.
   */
  follow(target: FollowTarget, options: FollowOptions = {}): void {
    this.followTarget = target;
    this.followOffset = { x: options.offset?.x ?? 0, y: options.offset?.y ?? 0 };
    this.followRate = options.smoothing ?? null;
    this.followPaused = false;

    this.aimAtTarget();
    if (options.immediate) {
      this.position = { ...this.target };
      this.apply();
    }
  }

  /** Release the target. The camera stays exactly where it is. */
  unfollow(): void {
    this.followTarget = null;
    this.followPaused = false;
  }

  /**
   * Stop tracking without forgetting the target — what manual input does, so
   * that dragging the view around during development doesn't permanently
   * unhitch the camera from the player.
   */
  pauseFollow(): void {
    if (this.followTarget) this.followPaused = true;
  }

  /** Pick the target back up. No-op if there isn't one. */
  resumeFollow(): void {
    this.followPaused = false;
  }

  /**
   * Jump to a world point with no easing at all.
   *
   * For placing the camera before the first frame is drawn, or for a hard cut.
   * Never for ordinary movement — DESIGN.md §Camera is explicit that there are
   * no sudden jumps.
   */
  snapTo(x: number, y: number = this.position.y): void {
    this.panTo(x, y);
    this.position = { ...this.target };
    this.zoom = this.targetZoom;
    this.apply();
  }

  /**
   * Advance the easing. `delta` is in seconds.
   *
   * Call this every frame, whether or not anything moved — a camera still
   * settling after the last input is exactly when smoothing matters most.
   */
  update(delta: number): void {
    if (delta <= 0) return;

    // A follow target overwrites the heading every frame; that's the point of
    // assigning one. Manual input only sticks while following is paused.
    if (this.isFollowing()) this.aimAtTarget();

    const rate = this.isFollowing() ? (this.followRate ?? this.followSmoothing) : this.smoothing;
    const pan = 1 - Math.exp(-rate * delta);
    const zoomStep = 1 - Math.exp(-this.zoomSmoothing * delta);

    this.position = {
      x: this.position.x + (this.target.x - this.position.x) * pan,
      y: this.position.y + (this.target.y - this.position.y) * pan,
    };
    this.zoom += (this.targetZoom - this.zoom) * zoomStep;

    // Snap the last sliver, so the camera actually arrives instead of
    // asymptotically approaching forever and publishing noise.
    if (Math.abs(this.target.x - this.position.x) < 0.01) this.position.x = this.target.x;
    if (Math.abs(this.target.y - this.position.y) < 0.01) this.position.y = this.target.y;
    if (Math.abs(this.targetZoom - this.zoom) < 0.001) this.zoom = this.targetZoom;

    this.apply();
  }

  /**
   * Ease back to the home position at zoom 1, and pick a paused follow target
   * back up. Eases rather than cuts — a reset is still a camera move.
   */
  reset(): void {
    this.targetZoom = 1;
    this.resumeFollow();
    if (this.isFollowing()) this.aimAtTarget();
    else this.panTo(this.home.x, this.home.y);
  }

  // --- Internal --------------------------------------------------------------

  /** Point the heading at the follow target, offset and clamped. */
  private aimAtTarget(): void {
    const t = this.followTarget;
    if (!t) return;
    this.panTo(t.x + this.followOffset.x, t.y + this.followOffset.y);
  }

  /**
   * Recompute the container transform from position + zoom, respecting bounds,
   * and land the whole thing on the art's pixel grid.
   *
   * Two quantisations, and the art falls apart without either:
   *
   *  - **Scale.** One art pixel has to cover a whole number of screen pixels,
   *    so the zoom is rounded to the nearest multiple of `1 / pixelSize`. At a
   *    pixel scale of 5 that is a zoom step of 0.2 — fine enough to frame a
   *    scene with, and the alternative is a tower whose windows are 3.4 pixels
   *    wide and resample differently every frame.
   *  - **Translation.** The offset is snapped to whole art pixels, so the world
   *    scrolls one art pixel at a time rather than sliding continuously
   *    underneath a grid that stays put. This is the rounding the ground, the
   *    props and the buildings each used to do for themselves; doing it once
   *    here is what lets them stop.
   */
  private apply(): void {
    this.zoom = clamp(this.zoom, this.minZoom, this.maxZoom);

    if (this.bounds) {
      this.position = this.clampToBounds(this.position);
    }

    // Screen pixels per art pixel — whole, so the grid survives the zoom.
    const step = Math.max(1, Math.round(this.pixelSize * this.zoom));
    const z = step / this.pixelSize;
    this.renderZoom = z;

    // The vertical pivot. `anchorY` replaces the viewport centre so that the
    // horizon, rather than the middle of the screen, is the point zoom leaves
    // alone — see `setAnchorY`.
    const pivotY = this.anchorY ?? this.viewport.height / 2;

    this.container.scale.set(z);
    this.container.position.set(
      Math.round((this.viewport.width / 2 - this.position.x * z) / step) * step,
      Math.round((pivotY - this.position.y * z) / step) * step
    );
  }

  /**
   * Clamp the target too, not just the position.
   *
   * Without this, holding a key at the end of the world would run the target
   * off into the distance, and letting go would leave the camera stuck until it
   * had been driven all the way back — the classic "sticky edge".
   */
  private clampTarget(): void {
    if (this.bounds) this.target = this.clampToBounds(this.target);
  }

  /**
   * Keep the visible world rectangle inside `bounds`; centre if bounds are
   * smaller than the view.
   *
   * Clamped against whichever of the live and target zooms shows *more* world,
   * so a camera easing through a zoom near the world's edge already sits where
   * it will still be allowed to sit once the zoom lands. Clamping against the
   * live zoom alone would let it creep sideways for the whole zoom out.
   */
  private clampToBounds(pos: Vec2): Vec2 {
    const b = this.bounds!;
    const z = Math.min(this.zoom, this.targetZoom);
    const halfW = this.viewport.width / z / 2;
    const halfH = this.viewport.height / z / 2;

    const minX = b.x + halfW;
    const maxX = b.x + b.width - halfW;
    const minY = b.y + halfH;
    const maxY = b.y + b.height - halfH;

    return {
      x: minX > maxX ? b.x + b.width / 2 : clamp(pos.x, minX, maxX),
      // An anchor pins the vertical axis outright, at every zoom.
      //
      // Not "clamp towards it" — sit on it. WORLD_HEIGHT is 0 and this is a side
      // view, so there is nothing above or below to travel to; the anchor is the
      // whole of where the camera is vertically. Leaving the ordinary clamp in
      // charge here is what let the camera settle on the middle of the bounds
      // instead, which put the world 150 pixels below the sky it belongs to.
      y:
        this.anchorY ??
        (minY > maxY ? b.y + b.height / 2 : clamp(pos.y, minY, maxY)),
    };
  }
}
