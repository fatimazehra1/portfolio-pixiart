import { Engine } from "../core/Engine";
import { CameraController } from "../camera";
import { SkySystem } from "../sky";
import { Stars } from "../stars";
import { Ocean } from "../ocean";
import { Ground } from "../ground";
import { Environment } from "../environment";
import { Foreground } from "../foreground";
import { Lighthouse } from "../lighthouse";
import {
  AptechBuilding,
  BuildingManager,
  NatureTechBuilding,
  Planet01Building,
  VaultsysBuilding,
} from "../buildings";
import type { Building, BuildingContext } from "../buildings";
import { TimeManager } from "../time";
import { DayNightManager } from "../dayNight";
import { LightingManager } from "../lighting";
import { GradeManager } from "../grade";
import { SceneDirector, RESOLVED_SCENES, worldWidthFor } from "../scene";
import type { SceneState } from "../scene";
import { WeatherSystem } from "../weather";
import type { PropKind } from "../environment";
import type { TimeOfDay } from "../sky";
import type { TimeSnapshot } from "../time";
import type { Size } from "../types";

/**
 * Which hand-plotted renderer belongs to which scene.
 *
 * The whole of the "config drives systems, art stays hand-plotted" decision, in
 * one table. A scene names a `rendererId`; this is where that name becomes a
 * class. There is deliberately no facade grammar and no generated architecture
 * behind it — the buildings are the thing that makes this portfolio worth
 * looking at, and any config expressive enough to describe them would be harder
 * to author than the code that draws them.
 *
 * A scene with no entry here simply has no building yet. That is a normal state
 * — six of the ten are in it — and it must stay a normal state, because the
 * ground, the weather, the grade and the planting for those chapters are all
 * already working.
 */
const RENDERERS: Record<string, (context: BuildingContext) => Building> = {
  aptech: (context) => new AptechBuilding(context),
  planet01: (context) => new Planet01Building(context),
  vaultsys: (context) => new VaultsysBuilding(context),
  naturetech: (context) => new NatureTechBuilding(context),
  // The lighthouse is a scene with a `rendererId`, but it is not a Building —
  // it has no interaction and its own system owns it. Listed nowhere on
  // purpose; see `Lighthouse` in `build`.
};

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
  /** Called when the local climate changes. */
  onScene?: (state: SceneState) => void;
}

/**
 * The whole world, assembled.
 *
 * Everything that used to live in the React component: which systems exist, what
 * order they draw in, what listens to what, and how it all comes apart again.
 * `PixiCanvas` is now only a mount point — it creates one of these, appends a
 * canvas, and destroys it on unmount.
 *
 * That move is what the scene refactor was for. The component had grown to the
 * point where adding a chapter to the waterfront meant editing a React file,
 * and a React file is the last place the composition of a coastline should
 * live. Now the world is built from `SCENES` and this class knows how, and the
 * component knows neither.
 *
 * # What is still hardcoded here, and why
 * The *kinds* of system — that there is a sky, a sea, a shore, planting, a
 * foreground, weather. Those are the world's physics, not its content: a new
 * chapter needs none of them changed, and a world without a sea would not be
 * this world. Content lives in `SCENES`.
 */
export class World {
  readonly engine: Engine;

  readonly sky: SkySystem;
  readonly stars: Stars;
  readonly ocean: Ocean;
  readonly ground: Ground;
  readonly environment: Environment;
  readonly foreground: Foreground;
  readonly lighthouse: Lighthouse;
  readonly buildings: BuildingManager;
  readonly weather: WeatherSystem;

  readonly camera: CameraController;
  readonly time: TimeManager;
  readonly dayNight: DayNightManager;
  readonly lighting: LightingManager;
  readonly grade: GradeManager;
  readonly scenes: SceneDirector;

  readonly worldWidth: number;

  private readonly unbind: (() => void)[] = [];
  private readonly options: WorldOptions;
  private stopUpdate: (() => void) | null = null;
  private destroyed = false;

  private constructor(engine: Engine, options: WorldOptions) {
    this.engine = engine;
    this.options = options;

    const { width, height } = engine.viewport;
    const motionScale = options.motionScale ?? 1;
    const timeOfDay = options.timeOfDay;
    this.worldWidth = worldWidthFor();

    // First, and before any system exists. The director depends on nothing —
    // it is a pure reading of the registry — and the Environment asks it how
    // thickly to plant *while it is still in its own constructor*. Anything
    // built after that point would be too late to answer.
    this.scenes = new SceneDirector();

    // --- The backdrop --------------------------------------------------------

    // The sky is the one thing outside the camera. It is not a place: it is what
    // you see when you look away from the town, and a sky that slid off screen
    // as you walked would be a painted backdrop on wheels.
    this.sky = new SkySystem({ width, height, timeOfDay, motionScale });
    const pixelScale = this.sky.pixelScale;

    engine.camera.setPixelSize(pixelScale);
    engine.syncLayers();

    this.stars = new Stars({ motionScale });
    this.stars.mountInto(this.sky.container);
    this.stars.resize(this.sky.size.width, this.sky.size.height);

    this.ocean = new Ocean({ width, height, timeOfDay, pixelScale, motionScale });
    engine.layer("backdrop").addChild(this.ocean.container);

    // --- The world -----------------------------------------------------------

    this.ground = new Ground({
      width,
      height,
      worldWidth: this.worldWidth,
      timeOfDay,
      pixelScale,
      motionScale,
      // The Environment grows the planting now. Leaving the ground's own
      // hand-placed set on as well would put two rocks on every rock.
      props: false,
    });
    engine.layer("terrain").addChild(this.ground.container);

    const anchors = this.shoreAnchors();

    this.environment = new Environment({
      width,
      height,
      worldWidth: this.worldWidth,
      pixelScale,
      anchors,
      motionScale,
      plantingAt: (x, kind) => this.plantingAt(x, kind),
    });
    engine.layer("props").addChild(this.environment.container);

    this.lighthouse = new Lighthouse({
      width,
      height,
      worldWidth: this.worldWidth,
      pixelScale,
      anchors,
      motionScale,
    });

    this.buildings = new BuildingManager({
      width,
      height,
      worldWidth: this.worldWidth,
      pixelScale,
      anchors,
      motionScale,
    });

    // Built from the registry rather than listed. Adding a chapter with a
    // renderer is one scene entry and one line in RENDERERS.
    for (const scene of RESOLVED_SCENES) {
      const make = scene.rendererId ? RENDERERS[scene.rendererId] : undefined;
      if (make) this.buildings.add(make(this.buildings.context));
    }

    engine.layer("structures").addChild(this.lighthouse.container, this.buildings.container);

    this.weather = new WeatherSystem({ width, height, pixelScale, motionScale });
    engine.layer("weather").addChild(this.weather.container);

    this.foreground = new Foreground({
      width,
      height,
      worldWidth: this.worldWidth,
      pixelScale,
      motionScale,
    });
    engine.layer("foreground").addChild(this.foreground.container);

    // Two lines, back to front. Everything in the world is inside the camera and
    // the order between those things is the layer stack's business.
    engine.app.stage.removeChildren();
    engine.app.stage.addChild(this.sky.container);
    engine.app.stage.addChild(engine.camera.container);

    // --- What drives it ------------------------------------------------------

    this.camera = new CameraController({
      camera: engine.camera,
      host: options.host,
      worldWidth: this.worldWidth,
      onMove: (viewLeft, zoom) => {
        this.sky.setViewOffset(viewLeft);
        this.ocean.setViewOffset(viewLeft);
        this.environment.setViewOffset(viewLeft);
        this.foreground.setViewOffset(viewLeft);
        this.buildings.setViewOffset(viewLeft);

        // Where *you* are, as opposed to where the camera is looking. The
        // middle of the view, until there is a character to be it — and the
        // reason the director takes this as an argument rather than reading the
        // camera itself is so that the day there is one, only this line changes.
        const focus = viewLeft + engine.viewport.width / (2 * zoom);
        this.buildings.setFocus(focus);
        this.scenes.focusOn(focus);

        options.onCamera?.(viewLeft, zoom);
      },
    });
    this.camera.resize(width, height);
    this.camera.snapToStart();

    this.time = new TimeManager({ onChange: options.onTime });
    this.dayNight = new DayNightManager({
      time: this.time.time,
      sky: this.sky,
      ocean: this.ocean,
      ground: this.ground,
    });
    this.lighting = new LightingManager({ dayNight: this.dayNight });

    // The seam this whole refactor exists to create: the global hour and the
    // local climate meet here, and everything downstream reads the result
    // without knowing there are two of them.
    this.grade = new GradeManager({ lighting: this.lighting, scenes: this.scenes });

    this.unbind.push(
      this.stars.bindTime(this.time.time),
      this.lighthouse.bindLighting(this.grade),
      this.environment.bindLighting(this.grade),
      this.buildings.bindLighting(this.grade),
      this.foreground.bindLighting(this.grade),
      this.weather.bindLighting(this.grade),
      this.weather.bindScenes(this.scenes)
    );

    // Per-scene framing. The zoom follows wherever you are, blended across the
    // walk like everything else, so approaching a scene that wants a tighter
    // frame tightens gradually rather than snapping at its edge. It overrides
    // the `-`/`=` keys on the next scene change, which is correct: those are
    // development tooling and per-scene framing is the actual requirement.
    this.unbind.push(
      this.scenes.subscribe((state) => this.camera.zoomTo(state.camera.zoom))
    );

    if (options.onScene) this.unbind.push(this.scenes.subscribe(options.onScene));

    // Publish an opening climate, so the first frame is already somewhere
    // rather than fading in from neutral once the camera first reports.
    this.scenes.focusOn(this.camera.viewLeft + width / 2);

    this.stopUpdate = engine.onUpdate((ticker) => this.step(ticker.deltaMS / 1000));
  }

  /** Create the engine and everything in it. */
  static async create(options: WorldOptions): Promise<World> {
    const engine = new Engine({
      host: options.host,
      onResize: (size) => options.onResize?.(size),
    });
    await engine.init();

    const world = new World(engine, options);
    // Wired after construction so the handler can reach `world`.
    engine.setResizeHandler((size) => world.resize(size));
    return world;
  }

  /** The canvas to put in the DOM. */
  get canvas(): HTMLCanvasElement {
    return this.engine.canvas;
  }

  get viewport(): Size {
    return this.engine.viewport;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Bring a scene into frame, using the framing it asked for.
   *
   * Where `SceneConfig.camera.offsetX` becomes real: the scene says how it
   * wants to be looked at, and this is the one thing that looks at it that way.
   * Eases rather than cuts, because a reset is still a camera move.
   *
   * @returns false if there is no scene by that id.
   */
  focusScene(id: string): boolean {
    const scene = RESOLVED_SCENES.find((s) => s.id === id);
    if (!scene) return false;

    this.camera.zoomTo(scene.camera.zoom);
    this.camera.panTo(scene.worldX + scene.camera.offsetX);
    return true;
  }

  /** Re-fit everything to a new viewport, in CSS pixels. */
  resize(size: Size): void {
    if (this.destroyed) return;
    const { width, height } = size;

    this.sky.resize(width, height);
    // A taller viewport can earn a bigger whole-number scale, and the camera's
    // grid is that scale — re-read it before anything is placed against it.
    this.engine.camera.setPixelSize(this.sky.pixelScale);
    this.engine.syncLayers();

    this.stars.resize(this.sky.size.width, this.sky.size.height);
    this.ocean.resize(width, height);
    this.ground.resize(width, height);

    // After the land, so anything standing on the shore is re-fitted to where
    // it is now rather than to where it was a moment ago.
    const anchors = this.shoreAnchors();
    this.environment.resize(width, height, anchors);
    this.lighthouse.resize(width, height, anchors);
    this.buildings.resize(width, height, anchors);
    this.foreground.resize(width, height);
    this.weather.resize(width, height);

    this.camera.resize(width, height);
    this.options.onResize?.(size);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.stopUpdate?.();
    this.stopUpdate = null;

    // Unwind from the far end: the grade listens to the lighting and the
    // scenes, the lighting to the cycle, the cycle to the clock.
    for (const off of this.unbind) off();
    this.unbind.length = 0;

    this.grade.destroy();
    this.lighting.destroy();
    this.dayNight.destroy();
    this.scenes.destroy();
    this.stars.destroy();
    this.time.destroy();
    this.camera.destroy();

    this.weather.destroy();
    this.foreground.destroy();
    this.buildings.destroy();
    this.lighthouse.destroy();
    this.environment.destroy();
    this.ground.destroy();
    this.ocean.destroy();
    this.sky.destroy();

    this.engine.destroy();
  }

  // --- Internal --------------------------------------------------------------

  /** One frame. */
  private step(delta: number): void {
    // The clock and the camera go first, so the world is drawn at the time and
    // place it has this frame rather than the ones it had last frame.
    this.time.update(delta);
    this.camera.update(delta);
    // Straight off the camera, every frame. A parallax layer holds its place by
    // cancelling part of the camera's transform, so the two have to be written
    // in the same breath.
    this.engine.syncLayers();
    // Then the grade, so everything lit this frame is lit for where we now are.
    this.grade.update(delta);

    this.sky.update(delta);
    this.stars.update(delta);
    this.ocean.update(delta);
    this.ground.update(delta);
    this.environment.update(delta);
    this.lighthouse.update(delta);
    this.buildings.update(delta);
    this.weather.update(delta);
    this.foreground.update(delta);
  }

  /**
   * Where the shore is, for anything that has to stand on it.
   *
   * Read off the sea and the land themselves rather than recomputed from the
   * same constants — two systems agreeing by coincidence is how a building ends
   * up hovering a pixel above its own beach.
   */
  private shoreAnchors() {
    return {
      horizonY: this.ocean.topY,
      shorelineY: this.ground.topY,
      groundHeight: this.ground.size.height * this.ground.pixelScale,
    };
  }

  /**
   * How thickly a kind should grow at a point, from whichever scenes reach it.
   *
   * Uses the director's own weighting, so the planting thins and thickens
   * across the walk between two chapters exactly as the light and the weather
   * do — one falloff, one answer, three systems reading it.
   */
  private plantingAt(x: number, kind: PropKind): number {
    const state = this.scenes.sample(x);
    let multiplier = 0;

    for (const scene of RESOLVED_SCENES) {
      const weight = state.weights.get(scene.id);
      if (!weight) continue;
      const planting = scene.planting;
      const perKind = planting.density?.[kind] ?? 1;
      multiplier += perKind * (planting.scale ?? 1) * weight;
    }

    return multiplier > 0 ? multiplier : 1;
  }
}
