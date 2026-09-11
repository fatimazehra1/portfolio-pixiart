import { create } from "zustand";
import { DEFAULT_TIME_OF_DAY, TIME_SETTINGS, WORLD_WIDTH } from "@/engine";
import type {
  HotspotEvent,
  Size,
  TimeOfDay,
  TimePhase,
  TimeSnapshot,
  UniverseState,
  ViewMode,
} from "@/engine";

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
  /** Startup progress, 0–1, and what is happening. Both stop mattering at 1. */
  loadProgress: number;
  loadLabel: string;
  /** Current CSS-pixel viewport size; updates on resize. */
  viewport: Size;
  /**
   * Which of the four authored looks the world is painted in. Changing it
   * cross-fades the sky, sea and land together.
   *
   * Distinct from the clock below, and currently independent of it: this is the
   * *look*, the clock is the *time*. Connecting them is a visual decision that
   * needs somewhere for dawn and dusk to go first — see `PHASE_TO_TIME_OF_DAY`.
   */
  timeOfDay: TimeOfDay;

  /** Normalized time of day from the world clock. 0 is midnight, wraps at 1. */
  time: number;
  /** Which of the six phases the clock is in. */
  timePhase: TimePhase;
  /** The phase being crossed into. Equal to `timePhase` outside a transition. */
  timeNextPhase: TimePhase;
  /** How far that crossing has come, 0–1, already eased. */
  timeBlend: number;
  /** Whole in-world days elapsed. */
  timeDay: number;
  /** Whether the clock is stopped. */
  timePaused: boolean;

  /** World x at the left edge of the view. 0 is the west end of the world. */
  cameraX: number;
  /** Current camera zoom. 1 is the default framing. */
  cameraZoom: number;
  /** Total width of the world in CSS pixels. */
  worldWidth: number;

  /**
   * Whether you are looking at the map of worlds, travelling, or inside one.
   *
   * The one piece of engine state the UI genuinely cannot do without: a
   * loading screen, a back button and a chapter label all need to know which
   * of the two views is on screen, and none of them can ask the renderer.
   */
  view: ViewMode;
  /** The chapter world being entered, explored, or left. */
  chapterId: string | null;
  /** The world under the pointer, on the map. */
  hoveredChapterId: string | null;
  /** How far into a world we are, 0 on the map and 1 inside. */
  approach: number;

  /**
   * Which detail section of the plaque is open, by title. Null is all closed.
   *
   * In the store rather than in `InfoCard`'s own state because two things open
   * it: the visitor clicking a heading, and the visitor clicking a hotspot on
   * the building itself. A hotspot is drawn by the engine and reaches React
   * through here, which is the same route every other engine event takes.
   *
   * Keyed by the section's title because that is what both ends already have —
   * the data has no ids, and inventing a pair of them so a click could be
   * routed would be two more things to keep in agreement.
   */
  openSection: string | null;

  /**
   * The marked part of a building the pointer is on, if any.
   *
   * Only what changes identity — which spot, and where it is in the world.
   * Where that is *on screen* is read from the engine every frame by the
   * overlay itself, for the same reason `ChapterOverlay` does it: a position in
   * React state would be sixty renders a second behind a canvas already doing
   * the real work.
   */
  hotspot: { label: string; section: string; x: number; y: number } | null;

  /**
   * Which cats have been found, by id, and whether the collection is open.
   *
   * Restored from localStorage on mount and written back on every catch, so a
   * count survives a reload. Deliberately the only thing about this feature
   * that persists: no timestamps, no progress, nothing that would make an
   * easter egg feel like an account.
   */
  catsFound: readonly string[];
  catsOpen: boolean;

  /**
   * Whether the narrow shell is on.
   *
   * Not a breakpoint that components each re-derive: one media query, one
   * value, and every piece of interface reads the same answer. The engine is
   * told separately (`World.setMobile`) because what it changes — the map
   * camera and the sprite counts — is not layout.
   */
  isMobile: boolean;
  /** Whether the full-screen mobile menu is open. */
  menuOpen: boolean;
  /**
   * The cat just caught, for the label and the arc toward the bucket.
   *
   * Cleared by whoever drew it once the arc has landed. Carries the world
   * position rather than the screen one, for the same reason `hotspot` does:
   * the camera keeps moving and only the engine can convert.
   */
  caught: { id: string; name: string; x: number; y: number; at: number } | null;

  setReady: (value: boolean) => void;
  setLoadProgress: (progress: number, label: string) => void;
  setViewport: (size: Size) => void;
  setTimeOfDay: (timeOfDay: TimeOfDay) => void;
  setCamera: (cameraX: number, cameraZoom: number) => void;
  setWorldWidth: (worldWidth: number) => void;
  /** Mirror a clock snapshot into the store. Driven by TimeManager. */
  setTimeSnapshot: (snapshot: TimeSnapshot) => void;
  /** Mirror the universe state into the store. Driven by UniverseDirector. */
  setUniverse: (state: UniverseState) => void;
  /** Open one detail section, or pass null to close whatever is open. */
  setOpenSection: (title: string | null) => void;
  /** Mirror a hotspot event from the engine. See `hotspot` and `openSection`. */
  setHotspot: (event: HotspotEvent) => void;
  /** Restore the found list, once, from storage. */
  restoreCats: (ids: readonly string[]) => void;
  /** Record one. Ignores a cat already found, so a double click counts once. */
  findCat: (id: string, name: string, x?: number, y?: number) => void;
  /** Clear the flying cat once its arc has landed. */
  clearCaught: () => void;
  setCatsOpen: (open: boolean) => void;
  setMobile: (isMobile: boolean) => void;
  setMenuOpen: (menuOpen: boolean) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  isReady: false,
  loadProgress: 0,
  loadLabel: "",
  viewport: { width: 0, height: 0 },
  timeOfDay: DEFAULT_TIME_OF_DAY,
  cameraX: 0,
  cameraZoom: 1,
  worldWidth: WORLD_WIDTH,

  time: TIME_SETTINGS.startTime,
  timePhase: "sunset",
  timeNextPhase: "sunset",
  timeBlend: 0,
  timeDay: 0,
  timePaused: TIME_SETTINGS.startPaused,

  view: "overview",
  chapterId: null,
  hoveredChapterId: null,
  approach: 0,
  openSection: null,
  hotspot: null,
  catsFound: [],
  catsOpen: false,
  caught: null,
  isMobile: false,
  menuOpen: false,

  setReady: (isReady) => set({ isReady }),
  setLoadProgress: (loadProgress, loadLabel) => set({ loadProgress, loadLabel }),
  setViewport: (viewport) => set({ viewport }),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setCamera: (cameraX, cameraZoom) => set({ cameraX, cameraZoom }),
  setWorldWidth: (worldWidth) => set({ worldWidth }),
  setTimeSnapshot: (snapshot) =>
    set({
      time: snapshot.time,
      timePhase: snapshot.phase,
      timeNextPhase: snapshot.nextPhase,
      timeBlend: snapshot.blend,
      timeDay: snapshot.day,
      timePaused: snapshot.paused,
    }),
  setUniverse: (state) =>
    set((previous) => ({
      view: state.mode,
      chapterId: state.chapter?.id ?? null,
      hoveredChapterId: state.hovered?.id ?? null,
      approach: state.approach,
      // A different world is a different plaque, so whatever was open on the
      // last one closes with it. Carrying it over would open a section by
      // title on a chapter that merely reuses the word.
      openSection:
        (state.chapter?.id ?? null) === previous.chapterId ? previous.openSection : null,
    })),
  setOpenSection: (openSection) => set({ openSection }),
  restoreCats: (ids) => set({ catsFound: [...ids] }),
  findCat: (id, name, x = 0, y = 0) =>
    set((previous) =>
      previous.catsFound.includes(id)
        ? previous
        : {
            catsFound: [...previous.catsFound, id],
            // `at` is what makes two catches of different cats distinct
            // objects, so an effect keyed on this fires for the second one.
            caught: { id, name, x, y, at: Date.now() },
          }
    ),
  clearCaught: () => set({ caught: null }),
  setCatsOpen: (catsOpen) => set({ catsOpen }),
  // Leaving the narrow shell closes anything only the narrow shell can open.
  setMobile: (isMobile) => set((p) => (p.isMobile === isMobile ? p : { isMobile, menuOpen: false })),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setHotspot: (event) =>
    set((previous) => {
      const at = event.spot ? { label: event.spot.label, section: event.spot.section, x: event.x, y: event.y } : null;
      // A click is a hover that also opens the panel. Clicking the spot whose
      // section is already open shuts it, so the marker toggles the same way
      // the heading beside it does.
      if (!event.selected) return { hotspot: at };
      const section = event.spot?.section ?? null;
      return {
        hotspot: at,
        openSection: previous.openSection === section ? null : section,
      };
    }),
}));
