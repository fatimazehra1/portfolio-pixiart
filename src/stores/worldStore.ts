import { create } from "zustand";
import { DEFAULT_TIME_OF_DAY, WORLD_WIDTH } from "@/engine";
import type { Size, TimeOfDay } from "@/engine";

/**
 * World store — the React-facing slice of engine state.
 *
 * Intentionally minimal: only values something outside the engine genuinely
 * needs. The engine remains the source of truth; this is a read-only mirror.
 *
 * # A note on camera position
 * This file used to say camera state stayed out of the store so panning could
 * never re-render React. The camera is now published here, because a minimap,
 * a location label and the building interactions all need to know where the
 * view is, and threading callbacks to each of them would be worse.
 *
 * Two things keep it cheap. Zustand only notifies components that actually
 * select a value, so nothing re-renders until something asks for the camera;
 * and CameraController only publishes once the view has moved a whole pixel,
 * so a settling camera doesn't emit a stream of sub-pixel noise. Anything that
 * needs the position every frame should read it from the engine directly rather
 * than subscribing here.
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

  /** World x at the left edge of the view. 0 is the west end of the world. */
  cameraX: number;
  /** Current camera zoom. 1 is the default framing. */
  cameraZoom: number;
  /** Total width of the world in CSS pixels. */
  worldWidth: number;

  setReady: (value: boolean) => void;
  setViewport: (size: Size) => void;
  setTimeOfDay: (timeOfDay: TimeOfDay) => void;
  setCamera: (cameraX: number, cameraZoom: number) => void;
  setWorldWidth: (worldWidth: number) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  isReady: false,
  viewport: { width: 0, height: 0 },
  timeOfDay: DEFAULT_TIME_OF_DAY,
  cameraX: 0,
  cameraZoom: 1,
  worldWidth: WORLD_WIDTH,

  setReady: (isReady) => set({ isReady }),
  setViewport: (viewport) => set({ viewport }),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setCamera: (cameraX, cameraZoom) => set({ cameraX, cameraZoom }),
  setWorldWidth: (worldWidth) => set({ worldWidth }),
}));
