import { RESOLVED_SCENES } from "./SceneRegistry";
import {
  CLIMATE_FALLOFF,
  CLIMATE_FALLOFF_POWER,
  DEFAULT_SCENE_CAMERA,
  NEUTRAL_PALETTE,
} from "./StatusClimate";
import { lerpColor } from "../sky";
import type {
  PaletteDelta,
  ResolvedScene,
  SceneCamera,
  WeatherKind,
  WeatherLayerSpec,
} from "./SceneTypes";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * How far a climate reaches past its own edge, as a multiple of its width.
 *
 * Ties reach to size so scenes and zones use one rule. At the scenes' widths
 * this lands close to CLIMATE_FALLOFF, which is the cap; at a zone's width it
 * scales down to something bench-sized.
 */
const ZONE_REACH_RATIO = 1.4;

/** The local climate at one point on the shore. */
export interface SceneState {
  /** The nearest scene. What "where am I" means. */
  scene: ResolvedScene;
  /** How wholly inside it we are, 0–1. Falls towards 0 in the gaps between. */
  presence: number;
  /** Every scene's share of the local climate, by id. Sums to 1. */
  weights: ReadonlyMap<string, number>;
  /** The palette shift here, blended across everything in reach. */
  palette: PaletteDelta;
  /** Weather here, by kind, already blended. Absent kinds are at zero. */
  weather: ReadonlyMap<WeatherKind, number>;
  /** How the camera should sit here. */
  camera: SceneCamera;
  /** The focus point this was computed for, in world pixels. */
  focusX: number;
}

export type SceneListener = (state: SceneState) => void;

/**
 * Anything that has a climate and a place to have it in.
 *
 * A scene and a zone are the same shape to everything downstream of here; the
 * only difference is that one has ground, a plot and possibly a building, and
 * the other is just weather standing somewhere. Flattening them means the
 * blending code has one case rather than two, and — more to the point — that a
 * zone's edges soften by exactly the same rule as a scene's.
 */
interface ClimateSource {
  id: string;
  worldX: number;
  width: number;
  palette: PaletteDelta;
  weather: readonly WeatherLayerSpec[];
  camera: SceneCamera;
  /** The scene this belongs to. A scene points at itself. */
  scene: ResolvedScene;
}

export interface SceneDirectorOptions {
  scenes?: readonly ResolvedScene[];
  /** How far a scene's climate reaches past its own ground, in world pixels. */
  falloff?: number;
  falloffPower?: number;
}

/**
 * Works out what the weather is where you are standing.
 *
 * # Why it takes the focus point as an argument
 * It never reads the camera. The thing the climate should follow is *the
 * subject* — today that is the middle of the view because there is nobody in
 * the world yet, and tomorrow it is a character sprite walking along the path.
 * Baking today's stand-in into the API would mean rewriting every caller the
 * day the character arrives, and worse, would quietly make "where the camera
 * is looking" and "where you are" the same thing forever. They are not: a
 * camera panning ahead of a walking figure should not drag the fog with it.
 *
 * # The blending rule
 * Every scene within reach contributes, weighted by how near the focus is to
 * it, and the weights are normalised so they always sum to one. That means:
 *
 *  - Standing in the middle of a scene, you get that scene's climate almost
 *    undiluted.
 *  - Walking between two, you get a genuine mixture — the light sours over the
 *    length of the walk rather than switching at a boundary.
 *  - Out past the last scene, you get the nearest one rather than nothing,
 *    because "no climate" is not a look, it is an absence of one.
 *
 * Nothing here draws, and nothing here can move the camera or the clock.
 */
export class SceneDirector {
  private readonly scenes: readonly ResolvedScene[];
  private readonly falloff: number;
  private readonly falloffPower: number;
  private readonly listeners = new Set<SceneListener>();

  /**
   * Everything with a climate and a position — the scenes, plus every zone
   * inside them, flattened into one list.
   *
   * Zones compete on equal terms with the scenes they sit inside, which is what
   * makes a warm corner bleed into the dusty room instead of cutting a hole in
   * it. A zone is narrow and its falloff is proportionally tighter, so it wins
   * near its own bench and loses a few metres away.
   */
  private readonly climates: readonly ClimateSource[];
  /**
   * Zoom worked out from the viewport, by scene id, overriding the authored one.
   *
   * A scene's `camera.zoom` is a number somebody typed while looking at one
   * screen, and what it actually frames depends on the pixel grid the viewport
   * earns — the same 2 fills half the frame on one laptop and three quarters
   * on another. So the framing is computed instead, from how tall the thing
   * standing there is, and pushed in here. See `CoastChapter.fitSceneFraming`.
   *
   * Scenes with nothing to frame — the open dock — never appear in this map
   * and keep the authored value, which is the right answer for a stretch of
   * shore with no subject in it.
   */
  private readonly framing = new Map<string, number>();

  private current: SceneState | null = null;

  constructor(options: SceneDirectorOptions = {}) {
    this.scenes = options.scenes ?? RESOLVED_SCENES;
    this.falloff = options.falloff ?? CLIMATE_FALLOFF;
    this.falloffPower = options.falloffPower ?? CLIMATE_FALLOFF_POWER;

    const climates: ClimateSource[] = [];
    for (const scene of this.scenes) {
      climates.push({
        id: scene.id,
        worldX: scene.worldX,
        width: scene.width,
        palette: scene.palette,
        weather: scene.weather,
        camera: scene.camera,
        scene,
      });

      for (const zone of scene.zones) {
        climates.push({
          id: `${scene.id}/${zone.id}`,
          worldX: zone.worldX,
          width: zone.width,
          palette: zone.palette,
          weather: zone.weather,
          // A zone has no opinion about framing. It is weather, not a place.
          camera: scene.camera,
          scene,
        });
      }
    }
    this.climates = climates;
  }

  // --- Queries ---------------------------------------------------------------

  /** The climate as last computed, or null before the first `focusOn`. */
  get state(): SceneState | null {
    return this.current;
  }

  /** Compute the climate at a point without publishing it. */
  sample(focusX: number): SceneState {
    const weights = this.weigh(focusX);

    let source = this.climates[0];
    let best = -1;
    for (const c of this.climates) {
      const w = weights.get(c.id) ?? 0;
      if (w > best) {
        best = w;
        source = c;
      }
    }

    return {
      // The *scene*, even when a zone won. Standing at the workshop's AI bench
      // you are still at the workshop — the zone changes the weather over you,
      // not which chapter you are in.
      scene: source.scene,
      presence: this.presenceAt(focusX, source),
      weights,
      palette: this.blendPalette(weights),
      weather: this.blendWeather(weights),
      camera: this.blendCamera(weights),
      focusX,
    };
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Move the subject. Publishes to every listener.
   *
   * @param focusX where *you* are, in world pixels — not where the camera is.
   */
  focusOn(focusX: number): SceneState {
    const state = this.sample(focusX);
    this.current = state;
    for (const listener of this.listeners) listener(state);
    return state;
  }

  /**
   * Set the zoom a scene should be framed at, overriding the authored one.
   *
   * Re-publishes if the camera has already reported, so a resize reframes the
   * scene you are standing in rather than the next one you walk to.
   */
  setFraming(sceneId: string, zoom: number): void {
    if (this.framing.get(sceneId) === zoom) return;
    this.framing.set(sceneId, zoom);
    if (this.current) this.focusOn(this.current.focusX);
  }

  /** Listen for changes. Called immediately if there is already a state. */
  subscribe(listener: SceneListener): () => void {
    this.listeners.add(listener);
    if (this.current) listener(this.current);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    this.listeners.clear();
    this.current = null;
  }

  // --- Internal --------------------------------------------------------------

  /**
   * How much of each scene is felt at a point, normalised to sum to 1.
   *
   * A scene counts fully anywhere over its own ground and then falls away over
   * `falloff` pixels of open shore. The normalisation is what guarantees the
   * blend is always a real mixture of real climates and never a fade to
   * nothing — every point on the coast has weather.
   */
  private weigh(focusX: number): Map<string, number> {
    const raw = new Map<string, number>();
    let total = 0;

    for (const source of this.climates) {
      const w = this.presenceAt(focusX, source);
      if (w > 0) {
        raw.set(source.id, w);
        total += w;
      }
    }

    // Past both ends of the world, or in a gap wider than two falloffs, nothing
    // is in reach. Hand the whole climate to the nearest scene rather than
    // returning an empty blend that would grade to neutral and look like a hole.
    if (total <= 0) {
      let nearest = this.climates[0];
      let least = Infinity;
      for (const source of this.climates) {
        const d = Math.abs(focusX - source.worldX);
        if (d < least) {
          least = d;
          nearest = source;
        }
      }
      return new Map([[nearest.id, 1]]);
    }

    for (const [id, w] of raw) raw.set(id, w / total);
    return raw;
  }

  /**
   * One climate's grip on a point, 0–1, before normalisation.
   *
   * Full anywhere over its own ground, then falling away over the shore beyond
   * it. The reach is tied to the width of the thing casting it: a chapter half
   * a kilometre wide bleeds for hundreds of pixels, a bench-sized zone bleeds
   * for tens. Without that, a small zone with a scene-sized falloff would
   * quietly own the whole building it was supposed to be a corner of.
   */
  private presenceAt(focusX: number, source: ClimateSource): number {
    const half = source.width / 2;
    const distance = Math.abs(focusX - source.worldX);
    if (distance <= half) return 1;

    const reach = Math.min(this.falloff, source.width * ZONE_REACH_RATIO);
    const beyond = distance - half;
    if (beyond >= reach) return 0;
    return clamp01(1 - beyond / reach) ** this.falloffPower;
  }

  /**
   * The weighted average of every scene's palette delta.
   *
   * The scalars are a plain weighted sum, which works because the weights are
   * normalised. The tint cannot be — averaging colours by summing weighted
   * channels is how you get mud out of two perfectly good hues — so it is
   * folded in one scene at a time against a *running* share. Mixing a colour
   * into an accumulator by `w / (total so far)` gives the same answer as a
   * simultaneous average, and does it without ever holding an unnormalised
   * intermediate.
   */
  private blendPalette(weights: ReadonlyMap<string, number>): PaletteDelta {
    let exposure = 0;
    let localLight = 0;
    let tintStrength = 0;
    let desaturation = 0;
    let tint = NEUTRAL_PALETTE.tint;
    let running = 0;

    for (const source of this.climates) {
      const w = weights.get(source.id);
      if (!w) continue;
      const p = source.palette;

      exposure += p.exposure * w;
      localLight += p.localLight * w;
      tintStrength += p.tintStrength * w;
      desaturation += p.desaturation * w;

      running += w;
      tint = lerpColor(tint, p.tint, w / running);
    }

    return { exposure, tint, tintStrength, desaturation, localLight };
  }

  private blendWeather(weights: ReadonlyMap<string, number>): Map<WeatherKind, number> {
    const out = new Map<WeatherKind, number>();

    for (const source of this.climates) {
      const w = weights.get(source.id);
      if (!w) continue;
      for (const layer of source.weather) {
        out.set(layer.kind, (out.get(layer.kind) ?? 0) + layer.intensity * w);
      }
    }

    return out;
  }

  private blendCamera(weights: ReadonlyMap<string, number>): SceneCamera {
    let zoom = 0;
    let offsetX = 0;
    let total = 0;

    for (const source of this.climates) {
      const w = weights.get(source.id);
      if (!w) continue;
      zoom += (this.framing.get(source.scene.id) ?? source.camera.zoom) * w;
      offsetX += source.camera.offsetX * w;
      total += w;
    }

    if (total <= 0) return { ...DEFAULT_SCENE_CAMERA };
    return { zoom, offsetX };
  }
}
