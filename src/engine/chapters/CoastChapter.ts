import { SkySystem } from "../sky";
import { Stars } from "../stars";
import { Ocean } from "../ocean";
import { Ground, PROP_BASELINES } from "../ground";
import { Environment } from "../environment";
import { Foreground } from "../foreground";
import { Atmosphere } from "../atmosphere";
import { Lighthouse } from "../lighthouse";
import {
  AptechBuilding,
  BbitBuilding,
  BuildingManager,
  CottageBuilding,
  IdeasTentBuilding,
  NatureTechBuilding,
  Planet01Building,
  VaultsysBuilding,
  WorkshopBuilding,
} from "../buildings";
import type { Building, BuildingContext } from "../buildings";
import { WeatherSystem } from "../weather";
import { DayNightManager } from "../dayNight";
import { SceneDirector, layoutScenes, scenesByIds } from "../scene";
import type { SceneLayout } from "../scene";
import type { CameraView } from "../camera/Camera";
import type { PropKind } from "../environment";
import type { Bounds, Size } from "../types";
import type { ChapterContext, ChapterWorld } from "../universe";

/**
 * Which hand-plotted renderer belongs to which scene.
 *
 * Unchanged from when this table lived in the world builder, and unchanged on
 * purpose. A scene names a `rendererId`; this is where that name becomes a
 * class. There is deliberately no facade grammar and no generated architecture
 * behind it — the buildings are the thing that makes this portfolio worth
 * looking at, and any config expressive enough to describe them would be harder
 * to author than the code that draws them.
 *
 * A scene with no entry here simply has no building yet. That is a normal state
 * and it must stay one, because the ground, the weather, the grade and the
 * planting for those chapters all already work.
 */
const RENDERERS: Record<string, (context: BuildingContext) => Building> = {
  aptech: (context) => new AptechBuilding(context),
  bbit: (context) => new BbitBuilding(context),
  cottage: (context) => new CottageBuilding(context),
  ideastent: (context) => new IdeasTentBuilding(context),
  planet01: (context) => new Planet01Building(context),
  vaultsys: (context) => new VaultsysBuilding(context),
  naturetech: (context) => new NatureTechBuilding(context),
  workshop: (context) => new WorkshopBuilding(context),
  // The lighthouse is a scene with a `rendererId`, but it is not a Building —
  // it has no interaction and its own system owns it. Listed nowhere on
  // purpose; see the `Lighthouse` construction below.
};

/** The id a scene uses to ask for the lighthouse. */
const LIGHTHOUSE_RENDERER = "lighthouse";

/**
 * The strip of sky a chapter world lets the sun and the moon into.
 *
 * The hub can put its sun anywhere, because the hub is a wide shot of islands
 * floating in open sky. A chapter world is not: it is zoomed onto a building,
 * the land fills the bottom of the frame, the plaque covers the top right and
 * the way back covers the top left. The hours whose sun sits low (dawn, sunset,
 * dusk) or right (noon) were putting it behind one of those, which is how a
 * world that has a sun in it reads as a world that lost it.
 *
 * So the body keeps its place in the hour and loses some of its range: the
 * field is the clear band between the buttons and the land. Same clock, same
 * arc, drawn shorter — see `CelestialField`.
 */
const SKY_TOP = 0.15;
const SKY_BOTTOM = 0.4;
const SKY_LEFT = 0.07;
/**
 * How much of the right edge the plaque owns, in CSS pixels: its width, its
 * inset, and a gutter so the sun clears it rather than touching it.
 */
const PLAQUE_CLEARANCE = 320 + 20 + 28;
/** Never squeeze the arc narrower than this, however small the viewport. */
const SKY_MIN_WIDTH = 0.34;

/**
 * How much of the frame's height the thing you came to see should fill.
 *
 * Every scene used to carry a hand-typed `camera.zoom`, and every one of those
 * numbers was chosen while looking at one particular window. The zoom is not
 * the framing: what a building actually fills is its art height times the
 * pixel grid times the zoom, and the pixel grid is `floor(viewportHeight/200)`
 * — a step function. The same 2 that filled 55% of a 674px window fills 50% of
 * a 738px one and 72% of an 800px one, which is why the shore looked composed
 * on one machine and cropped on another.
 *
 * So the target is stated as the composition instead, and the zoom is solved
 * for at runtime. 0.6 leaves roughly a fifth of the frame as sky over the roof
 * and a fifth as ground under it, which is the reading the whole shore is
 * drawn for: a building standing in a place, not a building filling a window.
 */
const SUBJECT_FRAME = 0.6;

/**
 * A ceiling on the solved zoom, so a small subject is not blown up.
 *
 * Nothing on the shore is short enough to need it today; it exists so that a
 * future scene whose subject is a mailbox does not get framed as one.
 */
const MAX_SUBJECT_ZOOM = 3;

/**
 * The lighthouse's tower, in art pixels.
 *
 * Stated rather than measured because the lighthouse is not a `Building` — it
 * has its own system and is not in the manager's list — and a framing pass
 * that silently skipped the one scene at the end of the coast would be a
 * framing pass nobody noticed was broken.
 */
const LIGHTHOUSE_ART_HEIGHT = 112;

/**
 * A chapter world built as a stretch of coast.
 *
 * # What this is, and what it used to be
 * Every system in here is the same system it was, wired in the same order, with
 * the same arguments. What changed is the *scope*: this used to be the entire
 * world, assembled once from all ten scenes on one shore, and it is now one
 * chapter's interior, assembled from that chapter's own scenes on their own
 * origin. Eight of these can exist over the life of a session; one exists at a
 * time.
 *
 * That is the whole architectural move, and it is deliberately the smallest one
 * that could work. Nothing below was rewritten, no renderer was touched, and no
 * art changed. The three things that assumed a single horizontal world —
 * building plots as fractions of *the* coastline, the atmosphere reading the
 * global scene list, and the camera's bounds being a width — were each given a
 * parameter, and this is what passes it.
 *
 * # Local coordinates
 * The scenes are lifted off the coastline by `layoutScenes` and re-based onto
 * this world's own origin, so a chapter that sits at x = 6183 on the shared
 * shore becomes a world running from 0 to its own width. Nothing inside knows
 * it moved, which is the point: a chapter can be relocated on the overview map
 * without one line of its interior changing.
 *
 * # What is still hardcoded here, and why
 * The *kinds* of system — that there is a sky, a sea, a shore, planting, a
 * foreground, weather. Those are a coast's physics, not its content. A world
 * that wants to be a spire you climb or a workshop you stand inside is a
 * different `ChapterInterior.kind` and a different builder; it is not a flag on
 * this one.
 */
export class CoastChapter implements ChapterWorld {
  readonly id: string;
  readonly scenes: SceneDirector;

  private readonly context: ChapterContext;
  private readonly layout: SceneLayout;
  private readonly worldWidth: number;

  private readonly sky: SkySystem;
  private readonly stars: Stars;
  private readonly ocean: Ocean;
  private readonly ground: Ground;
  private readonly environment: Environment;
  private readonly foreground: Foreground;
  private readonly atmosphere: Atmosphere;
  private readonly lighthouse: Lighthouse | null;
  private readonly buildings: BuildingManager;
  private readonly weather: WeatherSystem;
  private readonly dayNight: DayNightManager;

  private readonly unbind: (() => void)[] = [];
  /** How tall the subject of each scene is, in art pixels. See `fitSceneFraming`. */
  private readonly subjects = new Map<string, number>();
  private zoomWanted: number;
  private destroyed = false;

  constructor(context: ChapterContext) {
    this.context = context;
    this.id = context.chapter.id;

    const { engine, chapter, grade, motionScale } = context;
    const { width, height } = engine.viewport;
    const timeOfDay = context.timeOfDay;

    // The chapter's own scenes, on the chapter's own origin. Everything below
    // that takes a width or a plot list takes it from here.
    this.layout = layoutScenes(
      scenesByIds(chapter.interior.scenes),
      chapter.interior.margin
    );
    this.worldWidth = this.layout.width;
    this.zoomWanted = chapter.camera.zoom;

    // First, and before any system exists. The director depends on nothing —
    // it is a pure reading of the layout — and the Environment asks it how
    // thickly to plant *while it is still in its own constructor*.
    this.scenes = new SceneDirector({ scenes: this.layout.scenes });

    // --- The backdrop --------------------------------------------------------

    // The sky is the one thing outside the camera. It is not a place: it is what
    // you see when you look away from the town, and a sky that slid off screen
    // as you walked would be a painted backdrop on wheels.
    this.sky = new SkySystem({ width, height, timeOfDay, motionScale });
    this.fitCelestialField(width);
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
      plots: this.layout.plots,
      plantingAt: (x, kind) => this.plantingAt(x, kind),
    });
    engine.layer("props").addChild(this.environment.container);

    // Regional colour over the land, under the town. Fed this world's scenes
    // rather than the registry's, so the patches are this world's places.
    this.atmosphere = new Atmosphere({
      height,
      pixelScale,
      shorelineY: this.ground.topY,
      scenes: this.layout.scenes,
    });
    engine.layer("atmosphere").addChild(this.atmosphere.container);

    // Only the world that actually contains the lighthouse scene gets a tower.
    // It used to be unconditional, because there was one world and the
    // lighthouse was in it.
    const hasLighthouse = this.layout.scenes.some(
      (scene) => scene.rendererId === LIGHTHOUSE_RENDERER
    );
    this.lighthouse = hasLighthouse
      ? new Lighthouse({
          width,
          height,
          worldWidth: this.worldWidth,
          pixelScale,
          anchors,
          motionScale,
          x: this.plotFraction(LIGHTHOUSE_RENDERER),
        })
      : null;

    this.buildings = new BuildingManager({
      width,
      height,
      worldWidth: this.worldWidth,
      pixelScale,
      anchors,
      motionScale,
      plots: this.layout.plots,
      // Straight through to whoever built the world. This knows where a
      // hotspot is and nothing about what pointing at one should look like.
      onHotspotHover: (building, spot) => {
        const at = spot ? building.hotspotAnchor(spot) : { x: 0, y: 0 };
        context.onHotspot?.({
          spot: spot && { id: spot.id, section: spot.section, label: spot.label },
          buildingId: building.id,
          selected: false,
          x: at.x,
          y: at.y,
        });
      },
      onHotspotSelect: (building, spot) => {
        const at = building.hotspotAnchor(spot);
        context.onHotspot?.({
          spot: { id: spot.id, section: spot.section, label: spot.label },
          buildingId: building.id,
          selected: true,
          x: at.x,
          y: at.y,
        });
      },
    });

    // Built from this world's scenes rather than listed. Adding a chapter with
    // a renderer is one scene entry and one line in RENDERERS.
    for (const scene of this.layout.scenes) {
      const make = scene.rendererId ? RENDERERS[scene.rendererId] : undefined;
      if (make) {
        const building = make(this.buildings.context);
        this.buildings.add(building);
        // Kept by scene rather than by building id so the framing pass can ask
        // "how tall is what stands here", which is the question it has.
        this.subjects.set(scene.id, building.artHeight);
      } else if (scene.rendererId === LIGHTHOUSE_RENDERER) {
        this.subjects.set(scene.id, LIGHTHOUSE_ART_HEIGHT);
      }
    }

    const structures = engine.layer("structures");
    if (this.lighthouse) structures.addChild(this.lighthouse.container);
    structures.addChild(this.buildings.container);

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

    // Behind the camera, in front of whatever the overview left there. The sky
    // is screen space and the camera container is world space; the order
    // between them is the whole of the depth relationship.
    const stage = engine.app.stage;
    stage.addChildAt(this.sky.container, stage.getChildIndex(engine.camera.container));

    // --- What listens to what ------------------------------------------------

    /**
     * This world's own colour cycle, off the universe's clock.
     *
     * The hour is global and comes in through `context.time`; what a sky, a sea
     * and a shore look like *at* that hour belongs to the place they are in. So
     * the cycle is built per world rather than handed palettes by the universe
     * — which would have meant the universe knowing the anatomy of every kind
     * of world there will ever be.
     *
     * It fires immediately on construction, so the first frame of a world is
     * already the right time of day rather than the colour it was baked in.
     */
    this.dayNight = new DayNightManager({
      time: context.time,
      sky: this.sky,
      ocean: this.ocean,
      ground: this.ground,
    });

    this.unbind.push(
      this.stars.bindTime(context.time),
      this.environment.bindLighting(grade),
      this.buildings.bindLighting(grade),
      this.foreground.bindLighting(grade),
      this.weather.bindLighting(grade),
      this.weather.bindScenes(this.scenes),
      this.atmosphere.bindLighting(grade),
      this.atmosphere.bindScenes(this.scenes)
    );
    if (this.lighthouse) this.unbind.push(this.lighthouse.bindLighting(grade));

    // Per-scene framing, held as a value rather than pushed at the camera. The
    // zoom follows wherever you are, blended across the walk like everything
    // else, so approaching a scene that wants a tighter frame tightens
    // gradually rather than snapping at its edge.
    this.unbind.push(
      this.scenes.subscribe((state) => {
        this.zoomWanted = state.camera.zoom;
      })
    );

    // Publish an opening climate, so the first frame is already somewhere
    // rather than fading in from neutral once the camera first reports.
    // Before the first focus: the framing is a per-scene value the director
    // blends, so it has to be in place before the opening climate is published
    // or the first frame is composed at the authored zoom and then corrects.
    this.fitSceneFraming(height);

    this.scenes.focusOn(this.entryFocus().x);
  }

  // --- Queries ---------------------------------------------------------------

  /** The whole coast, one viewport tall. The camera may go nowhere else. */
  get bounds(): Bounds {
    return { x: 0, y: 0, width: this.worldWidth, height: 0 };
  }

  get desiredZoom(): number {
    return this.zoomWanted;
  }

  /**
   * The world y that zoom pivots on: the ground the town stands on.
   *
   * The obvious choice is the horizon, and it is the wrong one. Everything
   * below the pivot grows *downward* as you zoom, so pivoting on the horizon
   * pushes the shore off the bottom of the frame — at 2x the foot of a building
   * sat 70 pixels below the viewport and you were looking at a wall with no
   * ground under it. Pivoting on the band the buildings stand on keeps their
   * feet where they are and lets the sky compress instead, which is the right
   * way round: there is nothing in the sky that has to stay put.
   *
   * The sea and the sky still hold together, because the sky is not relying on
   * this — `lockHorizon` moves it by however much the sea moved, whatever the
   * pivot happens to be. The two mechanisms are independent on purpose.
   */
  get zoomAnchorY(): number {
    const anchors = this.shoreAnchors();
    return anchors.shorelineY + anchors.groundHeight * PROP_BASELINES.backVerge;
  }

  /** Where the camera lands on arrival, in this world's own coordinates. */
  entryFocus(): { x: number; y: number } {
    return { x: this.worldWidth * this.context.chapter.camera.entry, y: 0 };
  }

  /**
   * How this world wants one of its scenes framed.
   *
   * Where `SceneConfig.camera.offsetX` becomes real: the scene says how it
   * wants to be looked at, and this is the one thing that reports it. The
   * universe does the moving.
   */
  framingFor(sceneId: string): { x: number; zoom: number } | null {
    const scene = this.layout.scenes.find((s) => s.id === sceneId);
    if (!scene) return null;
    return { x: scene.worldX + scene.camera.offsetX, zoom: scene.camera.zoom };
  }

  // --- Commands --------------------------------------------------------------

  /** The camera moved. `focus` is where you are, in this world's coordinates. */
  onCamera(view: CameraView, focus: number): void {
    if (this.destroyed) return;

    this.sky.setViewOffset(view.viewLeft);
    this.ocean.setViewOffset(view.viewLeft);
    this.environment.setViewOffset(view.viewLeft);
    this.foreground.setViewOffset(view.viewLeft);
    this.buildings.setViewOffset(view.viewLeft);

    this.buildings.setFocus(focus);
    this.scenes.focusOn(focus);
  }

  /** Re-fit to a new viewport, in CSS pixels. */
  resize(size: Size): void {
    if (this.destroyed) return;
    const { width, height } = size;
    const engine = this.context.engine;

    this.sky.resize(width, height);
    this.fitCelestialField(width);
    // A taller viewport can earn a bigger whole-number scale, and the camera's
    // grid is that scale — re-read it before anything is placed against it.
    engine.camera.setPixelSize(this.sky.pixelScale);
    engine.syncLayers();

    this.stars.resize(this.sky.size.width, this.sky.size.height);
    this.ocean.resize(width, height);
    this.ground.resize(width, height);

    // After the land, so anything standing on the shore is re-fitted to where
    // it is now rather than to where it was a moment ago.
    const anchors = this.shoreAnchors();
    this.environment.resize(width, height, anchors);
    this.lighthouse?.resize(width, height, anchors);
    this.buildings.resize(width, height, anchors);
    this.foreground.resize(width, height);
    this.weather.resize(width, height);
    this.atmosphere.resize(height, this.ground.topY);

    // After the sky, whose pixel grid the solve divides by.
    this.fitSceneFraming(height);

    this.lockHorizon();
  }

  /** One frame. */
  update(delta: number): void {
    if (this.destroyed) return;

    this.lockHorizon();
    // The prompt needs the transform to stay inside the frame at close zooms.
    const view = this.context.engine.camera.getView();
    this.buildings.setCameraView(view.screenY, view.zoom);

    this.sky.update(delta);
    this.stars.update(delta);
    this.ocean.update(delta);
    this.ground.update(delta);
    this.environment.update(delta);
    this.lighthouse?.update(delta);
    this.buildings.update(delta);
    this.weather.update(delta);
    this.foreground.update(delta);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    for (const off of this.unbind) off();
    this.unbind.length = 0;

    this.dayNight.destroy();
    this.scenes.destroy();
    this.stars.destroy();

    this.weather.destroy();
    this.foreground.destroy();
    this.atmosphere.destroy();
    this.buildings.destroy();
    this.lighthouse?.destroy();
    this.environment.destroy();
    this.ground.destroy();
    this.ocean.destroy();
    this.sky.destroy();
  }

  // --- Internal --------------------------------------------------------------

  /**
   * Hold the sky's horizon on the sea's.
   *
   * The camera's own pivot does the bulk of it; this takes up the rounding.
   * Both numbers are read off the live transform rather than recomputed from
   * the constants that produced it — two halves of the picture agreeing in
   * theory and not on screen is the failure this exists to prevent.
   */
  /**
   * Hand the sky the band its sun is allowed in, for this viewport.
   *
   * Recomputed on every resize rather than authored as a fraction, because the
   * thing being cleared — the plaque — is a fixed number of pixels wide. On a
   * wide screen it costs the sun almost nothing; on a narrow one it costs it
   * most of the right-hand sky, which is the correct trade when the
   * alternative is a sun nobody can see.
   */
  /**
   * Solve every scene's zoom from how tall the thing standing in it is.
   *
   * See `SUBJECT_FRAME`. One line of arithmetic and a clamp: the zoom that
   * puts the subject at the target fraction of *this* viewport, held inside
   * the band the composition allows, and handed to the director, which blends
   * it across the walk like every other per-scene value.
   *
   * The camera quantises whatever it is given, so this is a request rather
   * than a setting — which is exactly why it is expressed as the framing we
   * want and not as a number somebody eyeballed once.
   */
  private fitSceneFraming(height: number): void {
    const pixelScale = this.sky.pixelScale;
    if (height <= 0 || pixelScale <= 0) return;

    for (const scene of this.layout.scenes) {
      const art = this.subjects.get(scene.id);
      if (!art) continue;

      const wanted = (SUBJECT_FRAME * height) / (art * pixelScale);
      // Ask for a value the camera can actually render. It rounds
      // `pixelScale * zoom` to a whole number of screen pixels per art pixel,
      // so requesting anything between two steps is requesting one of them
      // with extra decimal places — and the blend across a walk reads better
      // when the endpoints are the steps themselves.
      const steps = Math.max(1, Math.round(pixelScale * wanted));
      const zoom = Math.min(MAX_SUBJECT_ZOOM, steps / pixelScale);
      this.scenes.setFraming(scene.id, zoom);
    }
  }

  private fitCelestialField(width: number): void {
    const clear = width > 0 ? (width - PLAQUE_CLEARANCE) / width : 1;
    const right = Math.max(SKY_LEFT + SKY_MIN_WIDTH, Math.min(1, clear));
    this.sky.setCelestialField({
      left: SKY_LEFT,
      right,
      top: SKY_TOP,
      bottom: SKY_BOTTOM,
    });
  }

  private lockHorizon(): void {
    const view = this.context.engine.camera.getView();
    const horizon = this.ocean.topY;
    this.sky.setHorizonShift(view.screenY + view.zoom * horizon - horizon);
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

  /** Where the scene with a given renderer sits, as a fraction of this world. */
  private plotFraction(rendererId: string): number | undefined {
    const scene = this.layout.scenes.find((s) => s.rendererId === rendererId);
    if (!scene) return undefined;
    return scene.worldX / this.worldWidth;
  }

  /**
   * How thickly a kind should grow at a point, from whichever scenes reach it.
   *
   * Uses the director's own weighting, so the planting thins and thickens
   * across the walk between two places exactly as the light and the weather do
   * — one falloff, one answer, three systems reading it.
   */
  private plantingAt(x: number, kind: PropKind): number {
    const state = this.scenes.sample(x);
    let multiplier = 0;

    for (const scene of this.layout.scenes) {
      const weight = state.weights.get(scene.id);
      if (!weight) continue;
      const planting = scene.planting;
      const perKind = planting.density?.[kind] ?? 1;
      multiplier += perKind * (planting.scale ?? 1) * weight;
    }

    return multiplier > 0 ? multiplier : 1;
  }
}
