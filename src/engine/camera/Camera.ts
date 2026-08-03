import { Container } from "pixi.js";
import { CAMERA_SETTINGS } from "./CameraConfig";
import type { Bounds, Size, Vec2 } from "../types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

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

  private zoom = 1;
  private targetZoom = 1;
  private minZoom = CAMERA_SETTINGS.minZoom;
  private maxZoom = CAMERA_SETTINGS.maxZoom;

  private smoothing = CAMERA_SETTINGS.smoothing;
  private zoomSmoothing = CAMERA_SETTINGS.zoomSmoothing;

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

  /**
   * The world x-coordinate at the *left* edge of the view.
   *
   * This is the number backdrops want: it starts at 0 at the west end of the
   * world and grows eastward, so a layer can offset itself by it directly.
   */
  getViewLeft(): number {
    return this.position.x - this.viewport.width / this.zoom / 2;
  }

  /** True while the camera is still catching up to its target. */
  isSettled(): boolean {
    return (
      Math.abs(this.target.x - this.position.x) < 0.01 &&
      Math.abs(this.target.y - this.position.y) < 0.01 &&
      Math.abs(this.targetZoom - this.zoom) < 0.001
    );
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
  setSmoothing(pan: number, zoom = this.zoomSmoothing): void {
    this.smoothing = pan;
    this.zoomSmoothing = zoom;
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

    const pan = 1 - Math.exp(-this.smoothing * delta);
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

  /** Jump back to the origin at zoom 1. */
  reset(): void {
    this.targetZoom = 1;
    this.snapTo(0, 0);
  }

  // --- Legacy --------------------------------------------------------------

  /**
   * @deprecated Use `panTo` for movement or `snapTo` for a hard cut. Kept so
   * existing callers keep their original instant behaviour.
   */
  moveTo(x: number, y: number): void {
    this.snapTo(x, y);
  }

  /** @deprecated Use `panBy`. */
  moveBy(dx: number, dy: number): void {
    this.snapTo(this.position.x + dx, this.position.y + dy);
  }

  // --- Internal --------------------------------------------------------------

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

  /** Keep the visible world rectangle inside `bounds`; centre if bounds are smaller. */
  private clampToBounds(pos: Vec2): Vec2 {
    const b = this.bounds!;
    const halfW = this.viewport.width / this.zoom / 2;
    const halfH = this.viewport.height / this.zoom / 2;

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
