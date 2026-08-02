import { create } from "zustand";
import type { TimeOfDay, Vec2, Weather } from "@/types";

/**
 * Global world state (DESIGN.md). Lightweight and UI-agnostic:
 * PixiJS reads camera/player/weather to render; React reads UI flags.
 */
export interface WorldState {
  // --- World ---
  timeOfDay: TimeOfDay;
  weather: Weather;
  currentBuilding: string | null;
  visitedBuildings: string[];
  achievements: string[];

  // --- Spatial (world coordinates) ---
  cameraPosition: Vec2;
  playerPosition: Vec2;

  // --- UI ---
  /** Dialogue tree id currently open, or null. */
  activeDialogue: string | null;
  /** Whether the initial loading screen has finished. */
  isLoaded: boolean;
  /** Master volume 0–1. Audio stays muted until first user gesture. */
  audioVolume: number;
  isMuted: boolean;

  // --- Actions ---
  setTimeOfDay: (t: TimeOfDay) => void;
  setWeather: (w: Weather) => void;
  focusBuilding: (id: string | null) => void;
  visitBuilding: (id: string) => void;
  unlockAchievement: (id: string) => void;
  setCameraPosition: (p: Vec2) => void;
  setPlayerPosition: (p: Vec2) => void;
  openDialogue: (id: string) => void;
  closeDialogue: () => void;
  setLoaded: (v: boolean) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  // World
  timeOfDay: "sunset", // sunset is the main visual identity (DESIGN.md)
  weather: { type: "sunny", intensity: 0.3, wind: 0.1 },
  currentBuilding: null,
  visitedBuildings: [],
  achievements: [],

  // Spatial
  cameraPosition: { x: 0, y: 0 },
  playerPosition: { x: 0, y: 0 },

  // UI
  activeDialogue: null,
  isLoaded: false,
  audioVolume: 0.7,
  isMuted: true,

  // Actions
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setWeather: (weather) => set({ weather }),
  focusBuilding: (currentBuilding) => set({ currentBuilding }),
  visitBuilding: (id) =>
    set((s) =>
      s.visitedBuildings.includes(id)
        ? s
        : { visitedBuildings: [...s.visitedBuildings, id] }
    ),
  unlockAchievement: (id) =>
    set((s) =>
      s.achievements.includes(id)
        ? s
        : { achievements: [...s.achievements, id] }
    ),
  setCameraPosition: (cameraPosition) => set({ cameraPosition }),
  setPlayerPosition: (playerPosition) => set({ playerPosition }),
  openDialogue: (activeDialogue) => set({ activeDialogue }),
  closeDialogue: () => set({ activeDialogue: null }),
  setLoaded: (isLoaded) => set({ isLoaded }),
  setVolume: (audioVolume) => set({ audioVolume }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
}));
