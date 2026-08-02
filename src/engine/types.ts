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
 * Render layers, back-to-front. Everything drawn in the world goes into one of
 * these three containers (see WORLD.md §Background Layers). Parallax, sky, ocean,
 * buildings, etc. are future systems that will populate these — not created here.
 */
export type LayerName = "background" | "midground" | "foreground";

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
