// Core domain types for The Waterfront.
// See DESIGN.md — weather has meaning, buildings are chapters, one ambience at a time.

/** Time of day drives sky gradient, lighting, and ambience. See DESIGN.md §Color Palette. */
export type TimeOfDay = "morning" | "day" | "sunset" | "night";

/**
 * Weather language — each type carries narrative meaning (DESIGN.md §Weather Language).
 *   sunny  → completed        fog     → old memories
 *   rain   → dormant          storm   → major challenge
 *   lightning → breakthrough  sparks  → current work
 *   confetti → achievement    dust    → abandoned experiment
 */
export type WeatherType =
  | "sunny"
  | "fog"
  | "rain"
  | "storm"
  | "lightning"
  | "sparks"
  | "confetti"
  | "dust";

export interface Weather {
  type: WeatherType;
  /** 0–1, controls particle count / density. */
  intensity: number;
  /** -1..1, horizontal drift of particles. */
  wind: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

/** A building = a chapter (a job, project, or skill area). Data-driven, lazy-loaded. */
export interface Building {
  id: string;
  name: string;
  /** Position in world space. */
  worldPosition: Vec2;
  /** Camera focuses / assets load when the player enters this radius. */
  triggerRadius: number;
  weather: Weather;
  /** Ambient loop key resolved by the audio manager. */
  ambientTrack: AmbientTrack;
  /** Texture URLs to lazy-load on approach, unload on exit. */
  assets: string[];
  /** Key into the dialogue data. */
  dialogueId: string;
}

export type AmbientTrack =
  | "ocean"
  | "wind"
  | "birds"
  | "rain"
  | "forge"
  | "construction"
  | "night";

/** Content-driven dialogue. Never hardcode copy in components (DESIGN.md §UI). */
export interface DialogueEntry {
  question: string;
  answer: string;
}

export interface DialogueTree {
  /** Optional speaker / NPC name shown in the window header. */
  speaker?: string;
  questions: DialogueEntry[];
}

export type DialogueData = Record<string, DialogueTree>;
