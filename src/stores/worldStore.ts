import { create } from "zustand";
import { DEFAULT_TIME_OF_DAY } from "@/engine";
import type { Size, TimeOfDay } from "@/engine";

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
  /**
   * The world's time of day. Changing it cross-fades the sky; later systems
   * (lighting, lanterns, ocean) will read the same value so the whole world
   * agrees on what time it is.
   */
  timeOfDay: TimeOfDay;

  setReady: (value: boolean) => void;
  setViewport: (size: Size) => void;
  setTimeOfDay: (timeOfDay: TimeOfDay) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  isReady: false,
  viewport: { width: 0, height: 0 },
  timeOfDay: DEFAULT_TIME_OF_DAY,

  setReady: (isReady) => set({ isReady }),
  setViewport: (viewport) => set({ viewport }),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
}));
