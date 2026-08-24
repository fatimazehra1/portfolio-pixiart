import type { PropKind } from "../environment";

/**
 * What a place in the world *is*, as data.
 *
 * One entry per location. Adding a chapter to the waterfront means adding one
 * of these — never a new rendering path (CLAUDE.md; the refactor brief:
 * "Adding a new building must mean adding a config entry, never new rendering
 * code"). Everything downstream — the ground it stands on, the weather over it,
 * the grade on its palette, how the camera frames it, what grows around it —
 * reads this and nothing else.
 */

/**
 * How the chapter stands in the story being told.
 *
 * This is the spine of the whole idea: **weather encodes status**. A scene does
 * not pick a climate because a climate looked nice on it — it inherits one from
 * what it *is*, and the mapping lives in exactly one table (`STATUS_CLIMATE`).
 * That is what stops ten scenes drifting into ten hand-tuned microclimates that
 * mean nothing to anybody but the person who tuned them.
 */
export type SceneStatus =
  /** Being worked on right now. Clear air, lights on, warm. */
  | "active"
  /** Finished, and finished well. Bright but settled; the light has moved on. */
  | "past"
  /** Still standing, nobody home. Haze, cooler, quieter. */
  | "dormant"
  /** Given up on. Drizzle, desaturated, cold. */
  | "abandoned";

/** Which particle behaviour a weather layer runs. See `weather/WeatherProfiles`. */
export type WeatherKind =
  | "clear"
  | "haze"
  | "fog"
  | "drizzle"
  | "dust"
  | "embers"
  | "lightning";

/** One weather effect over a scene, and how strongly it runs. */
export interface WeatherLayerSpec {
  kind: WeatherKind;
  /** 0–1. Scales density, opacity and veil together. */
  intensity: number;
}

/**
 * A shift applied to the global palette over one scene.
 *
 * Deliberately a *delta*, never an absolute. The global day/night cycle owns
 * what time it is, and a scene that declared its own colours outright would
 * look identical at noon and midnight — which is exactly the failure the
 * local-weather idea exists to avoid. A scene only says how it differs from the
 * hour it finds itself in.
 */
export interface PaletteDelta {
  /** Multiplier on ambient intensity. 1 leaves the hour alone. */
  exposure: number;
  /** A colour the scene pulls its light towards. */
  tint: number;
  /** How far, 0–1. */
  tintStrength: number;
  /** Pull towards grey, 0–1. Abandoned places lose their colour first. */
  desaturation: number;
  /** Multiplier on how brightly local lights burn. Lit windows, lamps, signs. */
  localLight: number;
}

/** How the camera should sit when this scene is the one being looked at. */
export interface SceneCamera {
  /**
   * Zoom for this scene. Quantised by the camera to whole pixels per art
   * pixel, so the value that lands may be a step away from the one asked for
   * (see `Camera.setPixelSize`).
   */
  zoom: number;
  /** Nudge the framing off the scene's centre line, in world pixels. */
  offsetX: number;
}

/** What grows around a scene, as multipliers on the world's own planting. */
export interface ScenePlanting {
  /**
   * Density multiplier per prop kind. Above 1 is denser than the open shore,
   * below 1 is sparser, 0 is bare. Omitted kinds keep the world's default.
   */
  density?: Partial<Record<PropKind, number>>;
  /** Overall multiplier applied on top, for a quick "greener"/"barer" dial. */
  scale?: number;
}

/**
 * A pocket of different weather inside a scene. See `SceneConfig.zones`.
 *
 * Carries a `status` like a scene does, so the same table decides what it looks
 * like — a warm corner in a dormant room is `active`, and it is active in
 * exactly the way an active building is. The language stays one language.
 */
export interface SceneZone {
  id: string;
  /** Centre line, in absolute world pixels — same units as `SceneConfig.worldX`. */
  worldX: number;
  /** How wide the pocket is, in world pixels. Small; it is a corner, not a place. */
  width: number;
  status: SceneStatus;
  /** Why this pocket differs from the room around it. Required. */
  reason: string;
  /** Merged over the status' palette delta, field by field. */
  palette?: Partial<PaletteDelta>;
  /** Replaces the status' weather stack outright. */
  weather?: readonly WeatherLayerSpec[];
}

/**
 * One place on the waterfront.
 */
export interface SceneConfig {
  /** Stable key. Matches the building id where a scene has a building. */
  id: string;
  /** What the world calls it. */
  name: string;

  /**
   * Centre line, in **absolute world pixels**.
   *
   * Absolute rather than a 0–1 fraction, and the reason matters: fractions
   * silently rescale every existing scene the moment the world gets longer.
   * Nine chapters composed against one width would all shuffle sideways when
   * the tenth was added, and nothing would report it — the layout would just
   * quietly stop being the layout that was composed. The world's width is
   * *derived* from these instead (see `worldWidthFor`).
   */
  worldX: number;

  /** How wide the ground under it is kept clear, in world pixels. */
  width: number;

  /** Where the chapter stands in the story. Drives the climate. See `SceneStatus`. */
  status: SceneStatus;

  /**
   * Which hand-plotted renderer draws the building here, if there is one.
   *
   * The art stays hand-plotted and is only *referenced* from config. There is
   * no facade grammar and no generated architecture: the buildings are the
   * differentiator, and a config that could describe them would have to be
   * poorer than the code that draws them.
   */
  rendererId?: string;

  /**
   * Deliberate departures from what `status` would give this scene.
   *
   * Everything here is optional and everything here needs a reason. The
   * defaults exist so that scenes agree with each other; an override is a
   * statement that this one place genuinely differs, not a tuning knob.
   */
  overrides?: {
    /** Replaces the status' weather stack outright. */
    weather?: readonly WeatherLayerSpec[];
    /** Merged over the status' palette delta, field by field. */
    palette?: Partial<PaletteDelta>;
    /** Why. Required alongside any override — see `SCENES`. */
    reason: string;
  };

  /** How the camera frames this scene. Falls back to the world default. */
  camera?: Partial<SceneCamera>;

  /** What grows here. Falls back to the open shore's own planting. */
  planting?: ScenePlanting;

  /**
   * Places inside this scene that do not share its climate.
   *
   * A scene is usually one mood, but not always: a dormant workshop can still
   * have one corner with the lights on and somebody in it. A zone is a small
   * scene nested in a larger one — same falloff, same blending, so the warm
   * corner bleeds into the dusty room around it rather than sitting in it as a
   * rectangle.
   *
   * They are deliberately not full scenes: no renderer, no plots, no ground of
   * their own. A zone says only "the weather is different *here*", which is the
   * one thing it is for.
   */
  zones?: readonly SceneZone[];

  /**
   * Which chapter world this scene belongs to. See `universe/UniverseRegistry`.
   *
   * The migration marker. Every scene here is still laid out on one coastline,
   * because that layout works and nothing is served by breaking it before the
   * worlds that replace it exist. This field says where each one is *going*:
   * a chapter builds its interior from the scenes that name it, rebased onto
   * its own origin, so moving a chapter off the coast is a matter of the
   * registry it is read through rather than of the scene itself.
   *
   * Scenes with no chapter belong to the universe rather than to any one world
   * — the dock you arrive at, the lighthouse the whole map is read against.
   */
  chapterId?: string;

  /** A note to the next person reading the layout. Never rendered. */
  note?: string;
}

/** A scene with every optional field resolved. What the systems actually read. */
export interface ResolvedScene {
  id: string;
  name: string;
  /** Which chapter world it belongs to, if any. See `SceneConfig.chapterId`. */
  chapterId: string | undefined;
  worldX: number;
  width: number;
  status: SceneStatus;
  rendererId: string | undefined;
  weather: readonly WeatherLayerSpec[];
  palette: PaletteDelta;
  camera: SceneCamera;
  planting: ScenePlanting;
  /** True when `overrides` supplied any of the above. */
  overridden: boolean;
  /**
   * Pockets of different climate inside this scene, resolved.
   *
   * Flattened into the director's weighting alongside the scenes themselves, so
   * a zone competes for influence on equal terms and its edges blend the same
   * way. They are listed here rather than in the top-level scene list because
   * they are not places you can go — only weather you can stand in.
   */
  zones: readonly ResolvedZone[];
}

/** A zone with its status resolved into a climate. */
export interface ResolvedZone {
  id: string;
  worldX: number;
  width: number;
  status: SceneStatus;
  reason: string;
  weather: readonly WeatherLayerSpec[];
  palette: PaletteDelta;
}
