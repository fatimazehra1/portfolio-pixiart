import { RESOLVED_CHAPTERS, chapterById } from "./UniverseRegistry";
import type { ResolvedChapter } from "./UniverseTypes";

/**
 * Where you are in the journey between the map and a world.
 *
 * Four states rather than two, because the two transitions are the part of this
 * that has to be *seen*. A cut from the overview to a world's interior is a
 * scene change; a camera pushing towards a world for the better part of a
 * second and arriving inside it is travel, and travel is what the brief asks
 * for.
 */
export type ViewMode =
  /** Looking at the map. No world is alive. */
  | "overview"
  /** Camera is flying towards a world. The interior is being built behind it. */
  | "entering"
  /** Inside a world, exploring it. */
  | "inside"
  /** Camera is pulling back out to the map. */
  | "leaving";

export interface UniverseState {
  mode: ViewMode;
  /** The world being entered, explored, or left. Null in the plain overview. */
  chapter: ResolvedChapter | null;
  /** The world under the pointer, in the overview only. */
  hovered: ResolvedChapter | null;
  /**
   * How far into the transition we are, 0–1.
   *
   * 0 in the overview and 1 inside. Rises across `entering` and falls across
   * `leaving`, so anything that has to fade one view into the other — the map
   * on the way in, the frame on the way out — reads one number and never has to
   * know which direction it is going.
   */
  approach: number;
}

export type UniverseListener = (state: UniverseState) => void;

export interface UniverseDirectorOptions {
  chapters?: readonly ResolvedChapter[];
  /** Seconds the camera spends flying into a world. */
  enterDuration?: number;
  /** Seconds it spends pulling back out. Shorter: leaving should be brisk. */
  leaveDuration?: number;
}

const DEFAULT_ENTER = 0.85;
const DEFAULT_LEAVE = 0.6;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Owns which world you are looking at, and the trip between the map and it.
 *
 * # What it does not do
 * It does not move the camera, build a world, or draw anything. It holds the
 * state machine and the clock that drives the transitions, and it publishes.
 * Whoever wired it decides what a transition *means* — the same separation the
 * `SceneDirector` has from the weather it decides the intensity of, and for the
 * same reason: a director that could also move the camera would make every
 * future navigation feature a change to this file.
 *
 * # The interaction, as states
 * ```
 *   overview --enter(id)--> entering --(approach reaches 1)--> inside
 *   inside   --leave()---->  leaving --(approach reaches 0)--> overview
 * ```
 * The host swaps worlds at the two arrivals, which is why they are events
 * (`onArrive` / `onReturn`) rather than something a listener has to infer by
 * watching `approach` cross a threshold.
 *
 * # Detail on approach
 * `detailFor` is the other half of the brief's "hover/zoom toward a world →
 * world becomes more detailed". It is a pure function of the camera's zoom and
 * whether the pointer is on the world — no state, no easing, so the overview
 * can ease it however it likes without this having an opinion.
 */
export class UniverseDirector {
  private readonly chapters: readonly ResolvedChapter[];
  private readonly enterDuration: number;
  private readonly leaveDuration: number;
  private readonly listeners = new Set<UniverseListener>();

  private mode: ViewMode = "overview";
  private chapter: ResolvedChapter | null = null;
  private hovered: ResolvedChapter | null = null;
  private approach = 0;

  /** Fired the moment a `entering` completes. The host opens the world here. */
  onArrive: ((chapter: ResolvedChapter) => void) | null = null;
  /** Fired the moment a `leaving` completes. The host closes the world here. */
  onReturn: (() => void) | null = null;

  constructor(options: UniverseDirectorOptions = {}) {
    this.chapters = options.chapters ?? RESOLVED_CHAPTERS;
    this.enterDuration = Math.max(0.01, options.enterDuration ?? DEFAULT_ENTER);
    this.leaveDuration = Math.max(0.01, options.leaveDuration ?? DEFAULT_LEAVE);
  }

  // --- Queries ---------------------------------------------------------------

  get state(): UniverseState {
    return {
      mode: this.mode,
      chapter: this.chapter,
      hovered: this.hovered,
      approach: this.approach,
    };
  }

  get all(): readonly ResolvedChapter[] {
    return this.chapters;
  }

  /** True while a world is alive, or about to be. */
  get isInside(): boolean {
    return this.mode === "inside";
  }

  /** True while the map should still be on screen at all. */
  get showsOverview(): boolean {
    return this.mode !== "inside";
  }

  /**
   * How resolved a world should look right now, 0–1.
   *
   * Two inputs, and they add rather than compete: zooming towards the map
   * resolves everything on it, and pointing at one world resolves that one a
   * little further. So a visitor who never touches the pointer still sees the
   * worlds come alive as they push in, which is the behaviour a keyboard and a
   * touchscreen both need.
   */
  detailFor(chapter: ResolvedChapter, zoom: number): number {
    const { detailFrom, detailTo } = chapter.overview;
    const span = Math.max(0.0001, detailTo - detailFrom);
    const byZoom = clamp01((zoom - detailFrom) / span);
    const byHover = this.hovered?.id === chapter.id ? 0.45 : 0;
    return clamp01(byZoom + byHover);
  }

  // --- Commands --------------------------------------------------------------

  /** Put the pointer on a world, or pass null to take it off. Overview only. */
  hover(id: string | null): void {
    const next = id ? (chapterById(id) ?? null) : null;
    if (next === this.hovered) return;
    // Hover is a property of the map. Inside a world there is no map to point at.
    this.hovered = this.mode === "overview" ? next : null;
    this.publish();
  }

  /**
   * Start travelling into a world.
   *
   * @returns false if there is no such chapter, or we are not on the map.
   */
  enter(id: string): boolean {
    if (this.mode !== "overview") return false;
    const chapter = chapterById(id);
    if (!chapter) return false;

    this.chapter = chapter;
    this.hovered = null;
    this.mode = "entering";
    this.approach = 0;
    this.publish();
    return true;
  }

  /** Start travelling back out to the map. */
  leave(): boolean {
    if (this.mode !== "inside") return false;
    this.mode = "leaving";
    this.publish();
    return true;
  }

  /**
   * Advance the transition. `delta` is in seconds.
   *
   * Time-driven rather than driven by the camera coming to rest, deliberately.
   * A camera settle is not a reliable arrival signal — it depends on the
   * distance travelled, on whether input interrupted the move, and on the
   * easing rate — and an arrival that sometimes never happens is a world you
   * sometimes cannot enter.
   */
  update(delta: number): void {
    if (delta <= 0) return;

    if (this.mode === "entering") {
      this.approach = clamp01(this.approach + delta / this.enterDuration);
      if (this.approach >= 1) {
        this.mode = "inside";
        const chapter = this.chapter;
        this.publish();
        if (chapter) this.onArrive?.(chapter);
        return;
      }
      this.publish();
      return;
    }

    if (this.mode === "leaving") {
      this.approach = clamp01(this.approach - delta / this.leaveDuration);
      if (this.approach <= 0) {
        this.mode = "overview";
        this.chapter = null;
        this.publish();
        this.onReturn?.();
        return;
      }
      this.publish();
    }
  }

  /** Listen for changes. Called immediately with the current state. */
  subscribe(listener: UniverseListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    this.listeners.clear();
    this.onArrive = null;
    this.onReturn = null;
  }

  // --- Internal --------------------------------------------------------------

  private publish(): void {
    const state = this.state;
    for (const listener of this.listeners) listener(state);
  }
}
