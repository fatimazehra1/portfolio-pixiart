import { Engine } from "../core/Engine";
import { CameraController } from "../camera";
import { TimeManager } from "../time";
import { DayNightManager } from "../dayNight";
import { LightingManager } from "../lighting";
import { GradeManager } from "../grade";
import { pixelScaleFor } from "../shared";
import { CHAPTER_BUILDERS } from "../chapters";
import {
  ChapterHost,
  OverviewLayer,
  RESOLVED_CHAPTERS,
  UniverseDirector,
  chapterById,
  universeBounds,
  universeCentre,
} from "../universe";
import type { ResolvedChapter, UniverseState } from "../universe";
import type { CameraView } from "../camera/Camera";
import type { SceneState } from "../scene";
import type { TimeOfDay } from "../sky";
import type { TimeSnapshot } from "../time";
import type { Bounds, Size } from "../types";

/**
 * Room kept clear at the bottom of the frame, in CSS pixels.
 *
 * Just the hint text now — the navigation strip that used to live here moved
 * into the sidebar (see `LEFT_RESERVE`). The engine does not know what the
 * interface is and must not, but it does have to know a sliver of the bottom
 * is spoken for, or the map centres itself a few pixels low.
 *
 * A number rather than a measurement of the DOM: reading the real element would
 * couple the renderer to a component's markup, and re-framing the map every
 * time a React tree reflowed is far worse than being fifteen pixels out.
 */
const BOTTOM_RESERVE = 12;

/**
 * Room kept clear at the left of the frame, in CSS pixels — the sidebar's own
 * width plus its margin. Same reasoning as `BOTTOM_RESERVE`: without this the
 * map centres across the *full* viewport, and the sidebar then sits directly
 * over the left third of it instead of beside it.
 */
const LEFT_RESERVE = 280;

export interface WorldOptions {
  host: HTMLElement;
  /** Starting time of day. */
  timeOfDay?: TimeOfDay;
  /** 0 for `prefers-reduced-motion: reduce`. */
  motionScale?: number;
  /** Called with the viewport whenever it changes. */
  onResize?: (size: Size) => void;
  /** Called when the view moves. `viewLeft` and `zoom` are the camera's. */
  onCamera?: (viewLeft: number, zoom: number) => void;
  /** Called whenever the clock ticks over. */
  onTime?: (snapshot: TimeSnapshot) => void;
  /** Called when the local climate changes inside the world you are in. */
  onScene?: (state: SceneState) => void;
  /** Called whenever the view mode, the world or the hovered world changes. */
  onUniverse?: (state: UniverseState) => void;
  /** Which world to open on, if any. Defaults to the overview. */
  openChapter?: string;
  /**
   * Progress through startup, 0–1, with a label for what is happening.
   *
   * Three steps, because three is how many there honestly are: bringing up
   * WebGL, then building the map (every island, building and prop texture is
   * baked here, and it is by far the longest), then the first frame. A bar
   * with more segments than the work has would be decoration.
   */
  onProgress?: (progress: number, label: string) => void;
}

/**
 * The career universe, assembled.
 *
 * # What changed, and why the name did not
 * This used to build one horizontal coastline with ten chapters standing along
 * it. It now builds a *map of independent worlds* and hosts exactly one of them
 * at a time. The class is still `World` because it is still the same thing to
 * everyone outside the engine — the whole of what is on screen, created once
 * and destroyed once — and renaming it would have been churn in every file that
 * touches it for no gain.
 *
 * # The division
 * Two kinds of system, and the split is the architecture:
 *
 *  - **Global**, owned here, alive for the session: the renderer, the camera,
 *    the clock, the day/night cycle, the ambient light, the grade, the overview
 *    map, and the director that says where you are. None of them belong to a
 *    place; all of them are true wherever you are standing.
 *  - **Local**, owned by a `ChapterWorld`, alive only while you are inside it:
 *    a sky, a sea, a shore, planting, buildings, weather, a foreground. These
 *    are what a *place* is made of, and eight places do not share them.
 *
 * The grade is the seam between the two, and the only one. It takes the hour
 * from the global side and the climate from whichever world is open, and
 * everything downstream reads the answer without knowing there are two halves
 * or that one of them can be swapped out from under it.
 *
 * # The journey
 * ```
 *   overview  --click a world-->  entering  --arrive-->  inside  --leave-->  overview
 * ```
 * The camera flies towards the world on the map; behind that flight the
 * interior is built; at the top of the flight the two are swapped and the
 * camera cuts into the world's own coordinates. The cut is correct and is the
 * only one in the engine: the frame you leave and the frame you arrive in share
 * no coordinate system, so easing between them would be a slide across nothing.
 */
export class World {
  readonly engine: Engine;

  readonly camera: CameraController;
  readonly time: TimeManager;
  readonly dayNight: DayNightManager;
  readonly lighting: LightingManager;
  readonly grade: GradeManager;

  /** The map of worlds. */
  readonly overview: OverviewLayer;
  /** Where you are in the journey between the map and a world. */
  readonly universe: UniverseDirector;
  /** The one chapter world that is alive, if any. */
  readonly chapters: ChapterHost;

  private readonly options: WorldOptions;
  private readonly unbind: (() => void)[] = [];
  private stopUpdate: (() => void) | null = null;
  private destroyed = false;

  /**
   * Whether the visitor has changed the zoom themselves since arriving on the
   * map. Stops an automatic re-fit from overriding a deliberate look.
   */
  private zoomedByHand = false;
  /** The input count when the map was last framed. See `watchManualZoom`. */
  private framedZoomInputs = 0;

  /** Where on the map the camera sat before it flew into a world. */
  private overviewReturn = { x: 0, y: 0, zoom: 1 };

  private constructor(engine: Engine, options: WorldOptions) {
    this.engine = engine;
    this.options = options;

    const { width, height } = engine.viewport;
    const motionScale = options.motionScale ?? 1;

    // --- The global systems --------------------------------------------------

    this.time = new TimeManager({ onChange: options.onTime });
    this.dayNight = new DayNightManager({ time: this.time.time });
    // The map takes the hour too. It is the landing screen and it used to be
    // the one surface in this world with no clock in it — see
    // `OverviewLayer.applyLighting`. Wired here rather than inside the map
    // because the map does not get to know where the light comes from.
    this.lighting = new LightingManager({
      dayNight: this.dayNight,
      // Guarded because the cycle publishes immediately on subscribe, and on
      // that first push the map has not been built yet.
      onChange: (state) => this.overview?.applyLighting(state),
    });
    // Built with no climate at all. There is no world open yet, and the overview
    // has no weather in it — the grade's local half arrives when a world does.
    this.grade = new GradeManager({ lighting: this.lighting });

    // --- The map -------------------------------------------------------------

    // The overview has no sky to take a pixel grid from, so it takes the same
    // rule the sky would have used. One grid, whichever view is on screen.
    const pixelScale = pixelScaleFor(height);
    engine.camera.setPixelSize(pixelScale);

    this.universe = new UniverseDirector();
    this.overview = new OverviewLayer({
      chapters: RESOLVED_CHAPTERS,
      pixelScale,
      width,
      height,
      motionScale,
      onHover: (id) => this.universe.hover(id),
      // A world under the cursor at the end of a pan is not a world you asked
      // to enter. Without this guard every drag that happens to finish over an
      // island flies you into it.
      onSelect: (id) => {
        if (!this.camera.wasDragged) this.enterChapter(id);
      },
    });

    // The cycle published once during construction above, before the map
    // existed to hear it. Catching up here rather than waiting for the clock to
    // tick again is the difference between opening at dusk and opening at noon
    // for a fifth of a second first.
    if (this.lighting.state) this.overview.applyLighting(this.lighting.state);

    // Two spaces, two mounts. The void is screen space and goes behind the
    // camera; the worlds are somewhere and go inside it.
    engine.app.stage.removeChildren();
    engine.app.stage.addChild(this.overview.backdrop);
    engine.app.stage.addChild(engine.camera.container);
    engine.camera.container.addChild(this.overview.field);
    // The vignette is the third space: screen again, but in *front* of the
    // camera, so the frame's edges darken the worlds too and not just the sky
    // behind them.
    engine.app.stage.addChild(this.overview.overlay);

    this.chapters = new ChapterHost({
      engine,
      grade: this.grade,
      time: this.time.time,
      motionScale,
      timeOfDay: options.timeOfDay,
      builders: CHAPTER_BUILDERS,
    });

    // --- The camera ----------------------------------------------------------

    this.camera = new CameraController({
      camera: engine.camera,
      host: options.host,
      bounds: universeBounds(),
      // On the map the wheel is approach, not travel. See `WheelMode`.
      wheelMode: "zoom",
      onMove: () => this.publishCamera(),
    });

    this.camera.resize(width, height);
    this.showOverview(true);

    // --- What listens to what ------------------------------------------------

    this.universe.onArrive = (chapter) => this.openChapter(chapter);
    this.universe.onReturn = () => this.closeChapter();
    if (options.onUniverse) this.unbind.push(this.universe.subscribe(options.onUniverse));

    // The way back. One key, and deliberately the one every visitor already
    // tries: without it the journey is one-way and the architecture cannot be
    // exercised end to end. Any real UI for leaving a world is a later phase
    // and will call `leaveChapter` exactly as this does.
    window.addEventListener("keydown", this.onKeyDown);
    this.unbind.push(() => window.removeEventListener("keydown", this.onKeyDown));

    this.stopUpdate = engine.onUpdate((ticker) => this.step(ticker.deltaMS / 1000));

    // An explicit opening world, for a deep link or for development. Skips the
    // flight, because there is nothing to fly away from.
    if (options.openChapter) {
      const chapter = chapterById(options.openChapter);
      if (chapter && this.universe.enter(chapter.id)) this.universe.update(999);
    }
  }

  /** Create the engine and everything in it. */
  static async create(options: WorldOptions): Promise<World> {
    options.onProgress?.(0.05, "Starting the engine");
    const engine = new Engine({
      host: options.host,
      onResize: (size) => options.onResize?.(size),
    });
    await engine.init();

    options.onProgress?.(0.35, "Building the worlds");
    // Yield once, so the label above is actually painted before the long
    // synchronous bake below blocks the frame it was announced on. A timer,
    // not requestAnimationFrame: a tab opened in the background never gets an
    // animation frame, and waiting for one there would leave the world unbuilt
    // until the visitor looked at it.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const world = new World(engine, options);
    options.onProgress?.(0.9, "Framing the map");
    // Wired after construction so the handler can reach `world`.
    engine.setResizeHandler((size) => world.resize(size));
    return world;
  }

  // --- Queries ---------------------------------------------------------------

  /** The canvas to put in the DOM. */
  get canvas(): HTMLCanvasElement {
    return this.engine.canvas;
  }

  get viewport(): Size {
    return this.engine.viewport;
  }

  /** Where you are: the map, a flight, or a world. */
  get state(): UniverseState {
    return this.universe.state;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Fly into a chapter world.
   *
   * @returns false if there is no such chapter, or you are not on the map.
   */
  enterChapter(id: string): boolean {
    if (!this.universe.enter(id)) return false;

    const chapter = this.universe.state.chapter;
    if (!chapter) return false;

    // Remember the frame to come back to, then push towards the world. The
    // interior is built at the top of this flight, not now — building it here
    // would spend the whole approach baking textures on the same frame budget
    // the approach is animating on.
    this.overviewReturn = {
      x: this.cameraCentreX(),
      y: this.cameraCentreY(),
      zoom: this.camera.zoom,
    };

    this.camera.panTo(chapter.overview.x, chapter.overview.y);
    this.camera.zoomTo(chapter.camera.approachZoom);
    return true;
  }

  /** Pull back out of the world you are in, onto the map. */
  leaveChapter(): boolean {
    return this.universe.leave();
  }

  /**
   * Bring a scene inside the current world into frame.
   *
   * @returns false if you are not in a world, or it has no scene by that id.
   */
  focusScene(id: string): boolean {
    const world = this.chapters.current;
    if (!world) return false;

    const framing = world.framingFor(id);
    if (!framing) return false;

    this.camera.zoomTo(framing.zoom);
    this.camera.panTo(framing.x);
    return true;
  }

  /**
   * Where a world is on screen right now, in CSS pixels from the canvas corner.
   *
   * The one thing the React interface needs from the renderer, and deliberately
   * the only thing: a point and a size. The overlay draws cards and connector
   * lines against this without knowing that Pixi exists, and the engine stays
   * unaware that anything is drawn on top of it.
   *
   * Returns null once you are inside a world — there is no map to pin a card
   * to, and a card left hanging at the last place its world was is worse than
   * no card at all.
   */
  chapterScreen(id: string): { x: number; y: number; radius: number; topY: number } | null {
    if (this.chapters.isOpen) return null;

    const chapter = chapterById(id);
    if (!chapter) return null;

    const point = this.engine.camera.worldToScreen({
      x: chapter.overview.x,
      y: chapter.overview.y,
    });
    // Whatever stands tallest — a five-storey tower reaches well above the
    // island's own radius would suggest, and a label anchored to the radius
    // alone ends up sitting over the building instead of above it.
    const topWorldY = this.overview.topOf(id) ?? chapter.overview.y - chapter.overview.radius;
    const topPoint = this.engine.camera.worldToScreen({ x: chapter.overview.x, y: topWorldY });
    return {
      x: point.x,
      y: point.y,
      radius: chapter.overview.radius * this.engine.camera.getZoom(),
      topY: topPoint.y,
    };
  }

  /** Re-fit everything to a new viewport, in CSS pixels. */
  resize(size: Size): void {
    if (this.destroyed) return;

    this.chapters.resize(size);
    // After the world, because a taller viewport can earn a bigger whole-number
    // pixel scale and the map has to be re-baked onto whatever grid the world
    // settled on. With no world open there is nothing to agree with, so the map
    // takes the same rule a sky would have used.
    this.overview.resize(size, pixelScaleFor(size.height));
    if (!this.chapters.isOpen) this.engine.camera.setPixelSize(pixelScaleFor(size.height));

    this.camera.resize(size.width, size.height);

    // The map is framed to the viewport, so a resize re-frames it. Only while
    // actually on the map, and only if the visitor has not zoomed themselves —
    // re-fitting under someone who has pushed in to look at a world would yank
    // the view out from under them.
    if (this.universe.state.mode === "overview" && !this.zoomedByHand) {
      // `universeBounds()` fresh, not `this.camera.bounds` — the camera's own
      // bounds are padded past the content on the sidebar/hint sides (see
      // `showOverview`) so it has room to pan there, and fitting against that
      // padding would zoom the map out to make room for space nothing is
      // actually reserving.
      this.camera.zoomTo(this.fitZoom(universeBounds()));
      this.framedZoomInputs = this.camera.zoomInputs;
    }
    this.options.onResize?.(size);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.stopUpdate?.();
    this.stopUpdate = null;

    for (const off of this.unbind) off();
    this.unbind.length = 0;

    // Unwind from the far end: the chapter listens to the grade, the grade to
    // the lighting, the lighting to the cycle, the cycle to the clock.
    this.chapters.destroy();
    this.universe.destroy();
    this.overview.destroy();

    this.grade.destroy();
    this.lighting.destroy();
    this.dayNight.destroy();
    this.time.destroy();
    this.camera.destroy();

    this.engine.destroy();
  }

  // --- Internal --------------------------------------------------------------

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== "Escape" || event.repeat) return;
    if (this.leaveChapter()) event.preventDefault();
  };

  /** One frame. */
  private step(delta: number): void {
    // The clock and the camera go first, so the world is drawn at the time and
    // place it has this frame rather than the ones it had last frame.
    this.time.update(delta);
    this.universe.update(delta);
    this.applyApproach();
    this.camera.update(delta);
    // Straight off the camera, every frame. A parallax layer holds its place by
    // cancelling part of the camera's transform, so the two have to be written
    // in the same breath.
    this.engine.syncLayers();
    // Then the grade, so everything lit this frame is lit for where we now are.
    this.grade.update(delta);

    const view = this.engine.camera.getView();
    const world = this.chapters.current;

    if (world) {
      // Per-scene framing, read rather than pushed. See `ChapterWorld.desiredZoom`.
      this.camera.zoomTo(world.desiredZoom);
      world.update(delta);
    } else {
      this.watchManualZoom();
      this.updateOverview(delta, view);
    }
  }

  /**
   * Notice the visitor changing the zoom for themselves.
   *
   * Reads the controller's input counter rather than comparing zoom values. The
   * camera quantises zoom to whole screen pixels per art pixel, so the rendered
   * value is never the requested one and any comparison reads as a change on
   * the very first frame.
   */
  private watchManualZoom(): void {
    if (this.zoomedByHand) return;
    if (this.camera.zoomInputs !== this.framedZoomInputs) this.zoomedByHand = true;
  }

  /** Ease the map out on the way in, and back in on the way out. */
  private applyApproach(): void {
    const { approach, mode } = this.universe.state;
    if (mode === "overview" || mode === "inside") return;
    this.overview.setPresence(1 - approach);
  }

  /**
   * The map's own per-frame work.
   *
   * Only hover is pushed in. Detail used to be pushed too, as a per-chapter
   * number derived from zoom — but detail is now a property of *the view*
   * rather than of any one world, and `OverviewLayer` reads it off the camera
   * transform it is already handed. Computing it out here and sending it nine
   * times was nine ways for the map to disagree with itself about how far away
   * it was.
   */
  private updateOverview(delta: number, view: CameraView): void {
    const hovered = this.universe.state.hovered?.id ?? null;
    for (const chapter of this.universe.all) {
      this.overview.setHover(chapter.id, chapter.id === hovered ? 1 : 0);
    }
    this.overview.update(delta, view);
  }

  /**
   * Arrive: build the world, hand the camera its coordinates, and cut.
   *
   * Everything here is one frame's work and all of it has to happen together —
   * a camera clamped to the map's bounds while looking at a world's ground is a
   * frame of the wrong place, and one frame of the wrong place at the end of a
   * flight is the whole arrival ruined.
   */
  private openChapter(chapter: ResolvedChapter): void {
    const world = this.chapters.open(chapter);
    if (!world) return;

    this.overview.setPresence(0);

    const entry = world.entryFocus();
    this.engine.camera.setAnchorY(world.zoomAnchorY);
    this.camera.setBounds(world.bounds);
    // A world is never shown smaller than it was composed to be seen. The map's
    // floor is below 1 so eight worlds fit on screen at once; a shore's is not.
    this.camera.setZoomRange(1, 3);
    this.camera.setWheelMode("pan");
    this.camera.zoomTo(chapter.camera.zoom);
    this.camera.snapTo(entry.x, entry.y);

    // A world with no scenes has no local climate to report, which is a normal
    // state rather than a missing one — see `ChapterWorld.scenes`.
    if (this.options.onScene && world.scenes) {
      this.unbind.push(world.scenes.subscribe(this.options.onScene));
    }

    this.publishCamera();
  }

  /** Leave: destroy the world and give the camera the map back. */
  private closeChapter(): void {
    this.chapters.close();

    this.engine.camera.setAnchorY(null);
    this.showOverview(false);
    // Zoom before the snap, because `snapTo` takes the target zoom as read and
    // applies it in the same breath. The other order lands on the map at the
    // world's zoom and then eases out of it, which reads as a second move.
    this.camera.zoomTo(this.overviewReturn.zoom);
    this.camera.snapTo(this.overviewReturn.x, this.overviewReturn.y);
    this.publishCamera();
  }

  /** Put the camera and the map back into overview mode. */
  private showOverview(opening: boolean): void {
    const bounds = universeBounds();
    const zoom = this.fitZoom(bounds);

    // Padded past the content's own edges on the reserved sides, or the
    // camera's own clamp overrules `snapTo` below the moment the content
    // already fits the viewport: with nothing to clip, centring inside
    // `bounds` *is* the only position the clamp considers valid, and the
    // requested offset gets silently thrown away. This is the room the
    // clamp needs to actually grant it.
    this.camera.setBounds({
      x: bounds.x - LEFT_RESERVE / zoom,
      y: bounds.y,
      width: bounds.width + LEFT_RESERVE / zoom,
      height: bounds.height + BOTTOM_RESERVE / zoom,
    });
    // Below 1, so it is possible to stand far enough back to see the whole map.
    // The floor has to clear `fitZoom` on a short, wide window — clamped above
    // it, the opening frame is the clamp's, not the fit's, and the map opens
    // with its outermost worlds cut off.
    this.camera.setZoomRange(0.35, 3);
    this.camera.setWheelMode("zoom");
    this.overview.setPresence(1);
    // A fresh arrival on the map is not a deliberate framing, so a resize may
    // still re-fit it.
    this.zoomedByHand = false;
    this.framedZoomInputs = this.camera.zoomInputs;

    if (opening) {
      const centre = universeCentre();
      this.camera.zoomTo(zoom);
      this.framedZoomInputs = this.camera.zoomInputs;
      // Looking slightly left of and below the map's true centre — the
      // reserve is subtracted, not added, because a strip claimed on the
      // *left* of the screen has to push the camera's look-at point the
      // other way for the content to clear it.
      this.camera.snapTo(
        centre.x - LEFT_RESERVE / (2 * zoom),
        centre.y + BOTTOM_RESERVE / (2 * zoom)
      );
      this.publishCamera();
    }
  }

  /**
   * The zoom that fits the whole map in the frame.
   *
   * The overview has to *open* zoomed out — the first thing anyone sees has to
   * be four worlds and the space between them, because that space is the whole
   * argument the view is making. Opening at zoom 1 framed a viewport's worth of
   * map and cropped two of the four worlds off the edges, which reads as being
   * dropped somewhere rather than as being shown something.
   *
   * Clamped at 1, so a very large window pushes in rather than drifting further
   * and further out into empty sky.
   */
  private fitZoom(bounds: Bounds): number {
    const { width, height } = this.engine.viewport;
    if (bounds.width <= 0 || bounds.height <= 0) return 1;
    // The usable frame is smaller than the viewport by whatever the interface
    // has claimed on that side, or the fit would be computed against space the
    // map cannot actually occupy.
    const usableWidth = Math.max(160, width - LEFT_RESERVE);
    const usableHeight = Math.max(120, height - BOTTOM_RESERVE);
    return Math.min(1, usableWidth / bounds.width, usableHeight / bounds.height);
  }

  /** The world x at the middle of the view. */
  private cameraCentreX(): number {
    return this.camera.viewLeft + this.engine.viewport.width / (2 * this.camera.zoom);
  }

  /** The world y at the middle of the view. */
  private cameraCentreY(): number {
    return this.camera.viewTop + this.engine.viewport.height / (2 * this.camera.zoom);
  }

  /**
   * Tell the current world, and anyone outside, where the camera is.
   *
   * The focus is the middle of the view, until there is a character to be it —
   * and the reason a world takes this as an argument rather than reading the
   * camera itself is so that the day there is one, only this line changes.
   */
  private publishCamera(): void {
    const view = this.engine.camera.getView();
    this.chapters.onCamera(view, this.cameraCentreX());
    this.options.onCamera?.(view.viewLeft, view.zoom);
  }
}
