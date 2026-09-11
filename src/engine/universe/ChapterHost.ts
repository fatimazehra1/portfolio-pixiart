import type { Engine } from "../core/Engine";
import type { GradeManager } from "../grade";
import type { CameraView } from "../camera/Camera";
import type { TimeOfDay } from "../sky";
import type { Size } from "../types";
import type {
  CatEvent,
  ChapterBuilder,
  ChapterClock,
  ChapterWorld,
  HotspotEvent,
} from "./ChapterWorld";
import type { InteriorKind, ResolvedChapter } from "./UniverseTypes";

export interface ChapterHostOptions {
  engine: Engine;
  grade: GradeManager;
  /** The clock every world drives its own colour cycle from. */
  time: ChapterClock;
  motionScale: number;
  timeOfDay?: TimeOfDay;
  /** Which builder makes which kind of interior. See `ChapterInterior.kind`. */
  builders: Readonly<Record<InteriorKind, ChapterBuilder>>;
  /** Handed to every world it builds. See `ChapterContext.onHotspot`. */
  onHotspot?: (event: HotspotEvent) => void;
  /** Handed to every world it builds. See `ChapterContext.onCat`. */
  onCat?: (event: CatEvent) => void;
  /** Asked on every build which cats are already found. */
  catsFound?: () => readonly string[];
}

/**
 * Holds the one chapter world that is currently alive.
 *
 * The whole of "you are inside a world" as a single object: which one, how it
 * was built, and how it comes apart when you leave. Everything else in the
 * engine — the camera, the clock, the grade, the overview — asks the host what
 * is open rather than tracking it.
 *
 * # One at a time, and why
 * Entering a world builds it; leaving destroys it. There is no cache and no
 * suspended list, because a suspended world still holds its baked textures, its
 * subscriptions and its place in the layer stack, and eight of those is a
 * memory leak dressed as an optimisation. Building a chapter is a few hundred
 * milliseconds of texture baking that happens behind the camera's approach.
 *
 * # Why the builders come in from outside
 * So this file never grows a list of chapters. `ChapterInterior.kind` names a
 * builder exactly as `SceneConfig.rendererId` names a hand-plotted renderer,
 * for exactly the same reason: the seam a new *kind* of world arrives at should
 * be one table, and it should not be here.
 */
export class ChapterHost {
  private readonly engine: Engine;
  private readonly grade: GradeManager;
  private readonly time: ChapterClock;
  private readonly motionScale: number;
  private readonly onHotspot: ((event: HotspotEvent) => void) | undefined;
  private readonly onCat: ((event: CatEvent) => void) | undefined;
  private readonly catsFound: (() => readonly string[]) | undefined;
  private readonly timeOfDay: TimeOfDay | undefined;
  private readonly builders: Readonly<Record<InteriorKind, ChapterBuilder>>;

  private world: ChapterWorld | null = null;
  private chapter: ResolvedChapter | null = null;

  constructor(options: ChapterHostOptions) {
    this.engine = options.engine;
    this.grade = options.grade;
    this.time = options.time;
    this.motionScale = options.motionScale;
    this.onHotspot = options.onHotspot;
    this.onCat = options.onCat;
    this.catsFound = options.catsFound;
    this.timeOfDay = options.timeOfDay;
    this.builders = options.builders;
  }

  // --- Queries ---------------------------------------------------------------

  /** The world you are inside, or null in the overview. */
  get current(): ChapterWorld | null {
    return this.world;
  }

  /** The chapter that world was built from. */
  get currentChapter(): ResolvedChapter | null {
    return this.chapter;
  }

  get isOpen(): boolean {
    return this.world !== null;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Build a chapter's world and make it the live one.
   *
   * Closes whatever was open first, so entering a second world from inside a
   * first can never leave two sets of ground in the layer stack.
   *
   * @returns the world, or null if no builder is registered for its kind.
   */
  open(chapter: ResolvedChapter): ChapterWorld | null {
    this.close();

    const build = this.builders[chapter.interior.kind];
    if (!build) return null;

    const world = build({
      engine: this.engine,
      grade: this.grade,
      time: this.time,
      chapter,
      timeOfDay: this.timeOfDay,
      motionScale: this.motionScale,
      onHotspot: this.onHotspot,
      onCat: this.onCat,
      // Read at build time rather than captured once: a visitor who finds a
      // cat, leaves and comes back must not be offered it again.
      catsFound: this.catsFound?.(),
    });

    this.world = world;
    this.chapter = chapter;
    // The grade follows the world you are in. Nothing else has to be told: every
    // consumer already reads the graded light and none of them knows there is
    // more than one place it could come from.
    this.grade.setScenes(world.scenes);
    return world;
  }

  /** Destroy the live world and go back to having none. */
  close(): void {
    if (!this.world) return;
    // Unhooked before it is destroyed, so nothing can publish out of a
    // half-dismantled world on the way down.
    this.grade.setScenes(null);
    this.world.destroy();
    this.world = null;
    this.chapter = null;
  }

  resize(size: Size): void {
    this.world?.resize(size);
  }

  onCamera(view: CameraView, focus: number): void {
    this.world?.onCamera(view, focus);
  }

  update(delta: number): void {
    this.world?.update(delta);
  }

  destroy(): void {
    this.close();
  }
}
