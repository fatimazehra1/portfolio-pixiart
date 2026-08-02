import { create } from "zustand";
import type { Size } from "@/engine";

/**
 * World store — the React-facing slice of engine state.
 *
 * Intentionally minimal. Live camera position/zoom stay inside the engine (Pixi)
 * so panning never re-renders React (CLAUDE.md §Performance: avoid unnecessary
 * re-renders). Only rarely-changing values that the UI genuinely needs live here.
 */
export interface WorldState {
  /** Engine initialised and the canvas is mounted. */
  isReady: boolean;
  /** Current CSS-pixel viewport size; updates on resize. */
  viewport: Size;

  setReady: (value: boolean) => void;
  setViewport: (size: Size) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  isReady: false,
  viewport: { width: 0, height: 0 },

  setReady: (isReady) => set({ isReady }),
  setViewport: (viewport) => set({ viewport }),
}));
