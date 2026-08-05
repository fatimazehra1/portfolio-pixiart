// Public types for the rendering engine. Framework-agnostic — no React, no gameplay.

export interface Vec2 {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** A world-space rectangle. The camera is clamped to stay within it (when set). */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Render layers, back-to-front (WORLD.md §Background Layers).
 *
 * One name per *depth*, not per system — what decides which layer something
 * belongs in is how fast it should slide past, not who drew it. The stack and
 * the parallax factor attached to each name live in `layers/LayerManager`.
 */
export type LayerName =
  /** Screen-locked backdrops: the sea. Behind everything, moves least. */
  | "backdrop"
  /** The land itself. The one layer the camera travels over one-to-one. */
  | "terrain"
  /** Everything growing on or washed up on the land. */
  | "props"
  /** Buildings and the lighthouse — what the town is made of. */
  | "structures"
  /** Local weather. Between the town and the viewer. */
  | "weather"
  /** Silhouettes nearer than the town, moving faster than it. */
  | "foreground";

export interface EngineOptions {
  /** DOM element the canvas fills and resizes to. */
  host: HTMLElement;
  /** Frame-rate cap. Defaults to 60 (DESIGN.md §Performance Goals). */
  maxFPS?: number;
  /** Upper bound for devicePixelRatio when sizing the drawing buffer (perf). */
  maxResolution?: number;
  /** Clear color. Defaults to fully transparent so the empty engine draws nothing. */
  backgroundColor?: string;
  /** Clear alpha, 0–1. Defaults to 0 (transparent). */
  backgroundAlpha?: number;
  /** Notified with the new CSS-pixel viewport size after every resize. */
  onResize?: (size: Size) => void;
}
