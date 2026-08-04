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

  getZoom(): number {
    return this.zoom;
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
    return this.position.x - this.viewport.width / this.zoom / 2;
  }

  /** The world y-coordinate at the *top* edge of the view. */
  getViewTop(): number {
    return this.position.y - this.viewport.height / this.zoom / 2;
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
      width: this.viewport.width / this.zoom,
      height: this.viewport.height / this.zoom,
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
      x: (point.x - this.position.x) * this.zoom + this.viewport.width / 2,
      y: (point.y - this.position.y) * this.zoom + this.viewport.height / 2,
    };
  }

  /** Screen space → world space. The exact inverse of `worldToScreen`. */
  screenToWorld(point: Vec2): Vec2 {
    return {
      x: (point.x - this.viewport.width / 2) / this.zoom + this.position.x,
      y: (point.y - this.viewport.height / 2) / this.zoom + this.position.y,
    };
  }

  // --- Commands --------------------------------------------------------------

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

  /** Recompute the container transform from position + zoom, respecting bounds. */
  private apply(): void {
    this.zoom = clamp(this.zoom, this.minZoom, this.maxZoom);

    if (this.bounds) {
      this.position = this.clampToBounds(this.position);
    }

    const z = this.zoom;
    this.container.scale.set(z);
    this.container.position.set(
      this.viewport.width / 2 - this.position.x * z,
      this.viewport.height / 2 - this.position.y * z
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
      y: minY > maxY ? b.y + b.height / 2 : clamp(pos.y, minY, maxY),
    };
  }
}
