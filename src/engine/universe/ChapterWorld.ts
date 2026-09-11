import type { Engine } from "../core/Engine";
import type { GradeManager } from "../grade";
import type { SceneDirector } from "../scene";
import type { TimeSnapshot } from "../time";
import type { CameraView } from "../camera/Camera";
import type { TimeOfDay } from "../sky";
import type { Bounds, Size } from "../types";
import type { ResolvedChapter } from "./UniverseTypes";

/**
 * Everything a chapter world needs from the universe in order to exist.
 *
 * Deliberately short, and everything in it is *global*: the renderer, the
 * clock's light, the accessibility setting, the hour. A chapter is handed the
 * things that are true everywhere and builds the things that are true only
 * inside it — its ground, its sky, its weather, its buildings, its bounds.
 *
 * What is not here is as important. There is no reference to the overview, no
 * reference to sibling chapters and no way to reach the camera. A world cannot
 * move the camera, cannot know it is one of eight, and cannot notice that
 * anything exists outside it.
 */
/**
 * The smallest thing a world needs from the clock.
 *
 * Satisfied by `TimeSystem`, and structurally identical to what both
 * `DayNightManager` and `Stars` ask for — which is why a world can drive its
 * own colour cycle and its own stars off one handle.
 */
export interface ChapterClock {
  subscribe(listener: (snapshot: TimeSnapshot) => void): () => void;
}

export interface ChapterContext {
  engine: Engine;
  /** The graded light: the global hour, already crossed with local climate. */
  grade: GradeManager;
  /**
   * The clock.
   *
   * Structural rather than the concrete `TimeManager`, so a world takes the
   * smallest thing it can use — and so the shape satisfies both the day/night
   * cycle and the star field without either being named here.
   *
   * A world drives its *own* palettes off this. The hour is global; what the
   * sky, the sea and the land of one particular place look like at that hour is
   * not, and a world that had to be handed its colours by the universe would be
   * a world the universe had to know the anatomy of.
   */
  time: ChapterClock;
  /** The chapter being built. Its identity, its scenes, its framing. */
  chapter: ResolvedChapter;
  /** Which of the authored looks the world opens in. */
  timeOfDay?: TimeOfDay;
  /** Global motion multiplier. 0 for `prefers-reduced-motion: reduce`. */
  motionScale: number;
  /**
   * Told when the pointer finds, leaves, or clicks a marked part of a building.
   *
   * The one thing inside a world that the *interface* has to answer rather than
   * the world itself: a hotspot's label is a DOM panel and its click opens a
   * section of the plaque, and both of those live on the other side of the
   * React seam. Optional, so a world built without an interface around it — a
   * test, a screenshot rig — simply has hotspots that do nothing.
   */
  onHotspot?: (event: HotspotEvent) => void;
  /**
   * Which cats the visitor has already found, and where to report a new one.
   *
   * The world places the cats and reports the click; it counts nothing and
   * stores nothing. The collection is interface — a bucket, a panel and a line
   * in localStorage — and none of that belongs inside a renderer.
   */
  catsFound?: readonly string[];
  onCat?: (event: CatEvent) => void;
  /**
   * Build for a phone: fewer clouds, thinner weather, nothing crossing.
   *
   * A quality profile rather than a layout flag. Nothing about *where* things
   * are changes — a chapter world is the same place at 375px as at 1920 — only
   * how many sprites it is made of. The layout half of mobile lives entirely
   * on the React side, which is where layout belongs.
   */
  mobile?: boolean;
}

/** One cat, the moment it is clicked. Coordinates are this world's own pixels. */
export interface CatEvent {
  id: string;
  name: string;
  x: number;
  y: number;
}

/**
 * What the interface is told about a hotspot.
 *
 * Carries the anchor in *world* pixels rather than screen pixels, because the
 * engine has the camera and can convert, and a React component holding a screen
 * position would hold a stale one the moment the camera moved. The overlay
 * re-reads the position every frame; this event only says which spot it is.
 */
export interface HotspotEvent {
  /** Null when the pointer has left. Every other field is then meaningless. */
  spot: { id: string; section: string; label: string } | null;
  /** The building it is on, by id. */
  buildingId: string;
  /** Whether this is a click rather than a hover. */
  selected: boolean;
  /** Middle of the hotspot's top edge, in this world's own pixels. */
  x: number;
  y: number;
}

/**
 * One chapter world, alive.
 *
 * The contract every world implements, and the reason the universe needs to
 * know nothing about what is inside any of them. A world owns its own content
 * and its own coordinate space; the host owns when it exists and the camera
 * that looks at it.
 *
 * # Local coordinates
 * `bounds` is in the world's *own* space, starting at its own origin. Nothing
 * in a chapter is ever expressed in universe coordinates — that is what makes a
 * world moveable on the map without a single thing inside it changing, and it
 * is the single most important rule in this module.
 *
 * # Life
 * A world is built when you enter it and destroyed when you leave. There is no
 * mount/unmount pair, because a suspended world is a world whose textures,
 * tickers and listeners are all still resident, and eight of those is a memory
 * leak with a state machine in front of it. One world is alive at a time.
 */
export interface ChapterWorld {
  readonly id: string;

  /** The extent the camera is clamped to, in this world's own coordinates. */
  readonly bounds: Bounds;

  /**
   * The world's local climate, if it has one.
   *
   * Handed back to the universe so the grade can follow the world you are
   * actually in. A world with no scenes returns null and is lit by the hour
   * alone, which is the correct behaviour rather than a missing feature.
   */
  readonly scenes: SceneDirector | null;

  /**
   * The world y that zoom should pivot on, or null for the middle of the view.
   *
   * A property of the world rather than of the camera: a shore pivots on the
   * band its buildings stand on, and a world that is a climb would pivot
   * somewhere else entirely. See `CoastChapter.zoomAnchor` for the argument.
   */
  readonly zoomAnchorY: number | null;

  /**
   * The zoom this world would like to be looked at, right now.
   *
   * A value the universe reads, never a command the world issues. That is the
   * whole reason it is a property: per-scene framing inside a world has to be
   * able to change every frame as you walk between scenes, and a world holding
   * a reference to the camera in order to say so would be a world that could
   * also move it — and then eight worlds could fight over one camera.
   */
  readonly desiredZoom: number;

  /** Where the camera should land on entry, in this world's own coordinates. */
  entryFocus(): { x: number; y: number };

  /** Re-fit to a new viewport, in CSS pixels. */
  resize(size: Size): void;

  /**
   * The camera moved.
   *
   * @param view the transform as applied — never as intended.
   * @param focus where *you* are in this world, in local world pixels. Not
   *   where the camera is looking; see `SceneDirector.focusOn`.
   */
  onCamera(view: CameraView, focus: number): void;

  /** One frame. `delta` is in seconds. */
  update(delta: number): void;

  /** Frame the named scene inside this world, if it has one. */
  framingFor(sceneId: string): { x: number; zoom: number } | null;

  /** Take it all down. */
  destroy(): void;
}

/** How a world of a given `ChapterInterior.kind` is built. */
export type ChapterBuilder = (context: ChapterContext) => ChapterWorld;
