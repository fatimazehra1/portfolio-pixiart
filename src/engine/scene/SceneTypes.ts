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
export type WeatherKind = "clear" | "haze" | "fog" | "drizzle" | "dust" | "embers";

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

  /** A note to the next person reading the layout. Never rendered. */
  note?: string;
}

/** A scene with every optional field resolved. What the systems actually read. */
export interface ResolvedScene {
  id: string;
  name: string;
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
}
