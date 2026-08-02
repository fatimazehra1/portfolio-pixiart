import { Container } from "pixi.js";
import type { Bounds, Size, Vec2 } from "../types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * A 2D pan + zoom camera (DESIGN.md §Camera: smooth panning, no top-down, zoom
 * only for interactions). Implemented by transforming its own container: whatever
 * the camera "sees" lives inside `container`. Moving/zooming the camera sets that
 * container's position/scale so the target world point sits at the viewport centre.
 *
 * This is the primitive only — following the player, easing, and interaction zoom
 * are separate systems that will drive this API. No rotation (2.5D side view).
 */
export class Camera {
  /** The transformed container. The world (and its layers) mounts inside this. */
  readonly container: Container;

  private viewport: Size;
  private bounds: Bounds | null = null;
  /** World-space point shown at the centre of the viewport. */
  private position: Vec2 = { x: 0, y: 0 };
  private zoom = 1;
  private minZoom = 1;
  private maxZoom = 4;

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

  getZoom(): number {
    return this.zoom;
  }

  getViewport(): Size {
    return { ...this.viewport };
  }

  // --- Commands --------------------------------------------------------------

  /** Update the visible area (call on resize). Re-clamps and re-applies. */
  setViewport(size: Size): void {
    this.viewport = size;
    this.apply();
  }

  /** Constrain the camera to a world rectangle, or pass null to remove limits. */
  setBounds(bounds: Bounds | null): void {
    this.bounds = bounds;
    this.apply();
  }

  setZoomRange(min: number, max: number): void {
    this.minZoom = min;
    this.maxZoom = max;
    this.apply();
  }

  /** Centre the camera on a world point. */
  moveTo(x: number, y: number): void {
    this.position = { x, y };
    this.apply();
  }

  /** Pan by a world-space delta. */
  moveBy(dx: number, dy: number): void {
    this.moveTo(this.position.x + dx, this.position.y + dy);
  }

  /** Set zoom (clamped to the configured range). */
  zoomTo(zoom: number): void {
    this.zoom = zoom;
    this.apply();
  }

  reset(): void {
    this.position = { x: 0, y: 0 };
    this.zoom = 1;
    this.apply();
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
