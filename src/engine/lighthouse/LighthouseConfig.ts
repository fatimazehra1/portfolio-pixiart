import { BUILDING_PLOTS } from "../ground";

/**
 * Lighthouse tuning — the tower's proportions, its materials, and how the beam
 * turns.
 *
 * Every dimension here is in *lighthouse pixels*, the same internal grid the
 * sky, the sea and the land are drawn on, scaled up by one shared whole number.
 * They are absolute rather than fractions of the viewport for the same reason a
 * rock on the beach is: pixel art has a density, and a tower that grew with the
 * window would change how big its stones look.
 */

// --- Where it stands ---------------------------------------------------------

/**
 * Which reserved plot the tower stands in, and where along it.
 *
 * Read from the ground's own layout rather than restated, so the tower is
 * guaranteed to land on ground that was deliberately kept clear of props
 * (GroundLayout §BUILDING_PLOTS). It sits a little past the middle of the plot,
 * leaving open shore beyond it — the lighthouse is the end of the journey
 * (WORLD.md), and a building hard against the east edge would read as the world
 * running out rather than as arriving somewhere.
 */
export const PLOT_NAME = "lighthouse";
export const PLOT_POSITION = 0.55;

/** Where the tower stands, as a fraction of the world's width. */
export function lighthouseWorldX(
  plots: readonly { name: string; from: number; to: number }[] = BUILDING_PLOTS
): number {
  const plot = plots.find((p) => p.name === PLOT_NAME);
  // A world with no lighthouse plot still gets a lighthouse, near the east end
  // where WORLD.md puts it — better a tower in roughly the right place than a
  // render that throws.
  if (!plot) return 0.86;
  return plot.from + (plot.to - plot.from) * PLOT_POSITION;
}

/**
 * Which band of the land the tower stands on, 0–1 down the ground.
 *
 * Matches the ground's own `backVerge` baseline — the band GroundLayout keeps
 * clear for buildings, behind the path so the road never runs through the door.
 */
export const BASE_BAND = 0.52;

// --- The tower ---------------------------------------------------------------

/**
 * The tower, bottom to top, in lighthouse pixels.
 *
 * It is deliberately enormous — 112 pixels against a shore band of about 55, and
 * roughly twice the height of the character who will one day walk up to it.
 * ART_DIRECTION.md §World Scale asks for exactly one thing from this building:
 * that it dominate the skyline. A lighthouse that politely matches the cottages
 * has failed at the only job it has.
 */
export const TOWER = {
  /** Overall bitmap size. The plinth is the widest part. */
  width: 32,
  height: 112,

  /** The stepped stone base the shaft rises from. */
  plinthHeight: 12,
  plinthWidth: 30,

  /** The shaft tapers as it climbs, like every tower that has ever stood up. */
  shaftBottomWidth: 26,
  shaftTopWidth: 18,

  /** Stone courses. A joint line every this many pixels. */
  courseHeight: 6,

  /** The gallery: an overhanging floor, then the railing around it. */
  galleryWidth: 26,
  galleryFloorHeight: 4,
  railingHeight: 6,

  /** The lantern room — iron frame, glass, and the light itself. */
  lanternWidth: 16,
  lanternHeight: 10,

  /** The copper dome and its finial. */
  domeHeight: 5,
  domeTopWidth: 4,
  finialHeight: 1,

  /** The door in the plinth. */
  doorWidth: 6,
  doorHeight: 9,

  /** Windows up the shaft: how many, and how far apart. */
  windowCount: 3,
  windowWidth: 2,
  windowHeight: 3,
  /** Where the lowest window sits, 0–1 up the shaft, and the spacing between. */
  windowStart: 0.24,
  windowStep: 0.26,
} as const;

/**
 * Materials, as they would look under flat daylight.
 *
 * Same discipline as the ground: declare the material once, then let the
 * lighting system light it (`applyAmbient`). Nothing here is authored per phase,
 * so the stone goes gold at sunset and blue under the moon along with the rest
 * of the shore, and there is only one place to change what the tower is made of.
 *
 * Muted and sun-faded throughout (ART_DIRECTION.md §Color Philosophy). The
 * dome is verdigris copper rather than paint — copper is on the material list,
 * and a green cap is what stops a grey tower against a grey sea disappearing.
 */
export const MATERIALS = {
  stone: 0x9b968b,
  stoneLight: 0xb6b1a5,
  stoneDark: 0x6d6960,

  /** Ironwork: the railing, the lantern frame, the door. */
  iron: 0x5b574f,
  ironLight: 0x78736a,

  /** Verdigris copper, for the dome. */
  copper: 0x6f9a86,
  copperLight: 0x90bba5,
  copperDark: 0x4c6e5f,

  /** Unlit glass — cold, and darker than the frame around it. */
  glass: 0x3e4a56,
} as const;

export type MaterialName = keyof typeof MATERIALS;

/**
 * Light the tower makes rather than receives.
 *
 * These are not dimmed by the ambient — they *are* the light, so they keep their
 * own colour at every hour and only their strength changes. Cream white for the
 * lamp, exactly as DESIGN.md §Lighting Rules assigns it, and a warmer tone for
 * the windows, which are lit from inside by something ordinary.
 */
export const EMISSIVE = {
  lamp: 0xf7ecd2,
  window: 0xe9c890,
} as const;

// --- The beam ----------------------------------------------------------------

export interface BeamSettings {
  /**
   * Seconds for one full revolution.
   *
   * Slow on purpose. ART_DIRECTION.md §Animation Rules forbids fast spinning,
   * and a real light of this kind turns about this often — the pause between
   * flashes is most of what makes a lighthouse feel patient rather than busy.
   */
  periodSeconds: number;
  /** Where in its revolution the beam starts, in radians. */
  startAngle: number;

  /** How far left and right the far end of the beam travels, in pixels. */
  sweep: number;
  /** Length of the baked wedge, and so the beam at full extension. */
  length: number;
  /** Half-angle of the cone, in radians. Sets how wide the far end opens out. */
  spread: number;
  /**
   * Where the beam lands on the water when it points straight at the viewer,
   * 0 at the horizon and 1 at the shoreline. Kept short of the shore: the light
   * sweeps the sea, it doesn't rake the beach.
   */
  nearWater: number;

  /** Peak opacity of the shaft, at full activation. */
  shaftAlpha: number;
  /**
   * What the shaft keeps when it points straight at or away from the viewer.
   *
   * The shaft is at its most visible side-on, when the light is crossing the
   * most air between the lamp and the eye, and nearly vanishes end-on. That
   * single relationship is most of why a rotating beam reads as rotating rather
   * than as a spinning triangle.
   */
  shaftMin: number;

  /** Opacity of the glow around the lamp, before the flare is added. */
  glowAlpha: number;
  /** How much brighter the lamp burns as it sweeps past the viewer. */
  glowFlare: number;
  /**
   * How tightly that flare is concentrated. Higher is a briefer, sharper flash;
   * lower is a long swell of light either side of it.
   */
  flarePower: number;
  /**
   * Radius of the soft glow around the lamp, in pixels.
   *
   * Kept tight. A halo wide enough to swallow the dome and the gallery costs
   * the tower its silhouette, and the silhouette is most of why the building is
   * worth drawing (ART_DIRECTION.md §Buildings).
   */
  glowRadius: number;
  /** Radius of the hard core inside it. */
  glowCore: number;

  /** Opacity of the pool of light the beam lays on the water. */
  poolAlpha: number;
  poolRadius: number;
  /** How much the pool is flattened onto the water plane. */
  poolAspect: number;

  /** Dither levels for the baked shapes. Few, so the falloff stays chunky. */
  levels: number;
}

export const BEAM_SETTINGS: BeamSettings = {
  periodSeconds: 9,
  startAngle: 2.1,

  sweep: 300,
  length: 300,
  spread: 0.1,
  nearWater: 0.72,

  shaftAlpha: 0.42,
  shaftMin: 0.18,

  glowAlpha: 0.3,
  glowFlare: 0.8,
  flarePower: 3.5,
  glowRadius: 18,
  glowCore: 3,

  poolAlpha: 0.26,
  poolRadius: 30,
  poolAspect: 3.6,

  levels: 5,
} as const;

// --- Options -----------------------------------------------------------------

/** Where the shore sits on screen, in CSS pixels. All of it comes from elsewhere. */
export interface ShoreAnchors {
  /** The sky/sea horizon — `Ocean.topY`. */
  horizonY: number;
  /** Where the land begins — `Ground.topY`. */
  shorelineY: number;
  /** How tall the land band is, in CSS pixels. */
  groundHeight: number;
}

export interface LighthouseOptions {
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
  /**
   * Total width of the world in CSS pixels. The tower is placed in world space
   * and scrolls one-to-one with the land, so it needs to know how long the
   * shore is. Defaults to the viewport width.
   */
  worldWidth?: number;
  /**
   * Explicit scale. Pass the sky's `pixelScale` so the tower lands on the same
   * pixel grid as the shore it stands on — a mismatch here is what would make
   * the base of the tower shimmer against the sand as the camera moves.
   */
  pixelScale?: number;
  /** Where the shore is. See `ShoreAnchors`. */
  anchors: ShoreAnchors;
  /** Position across the world, 0–1. Defaults to the reserved lighthouse plot. */
  x?: number;
  /** Overrides for any of the beam's tuning values. */
  beam?: Partial<BeamSettings>;
  /** Global motion multiplier. 0 for `prefers-reduced-motion: reduce`. */
  motionScale?: number;
  /** Seed for the stone's imperfections. */
  seed?: number;
}

/** Same rule the sky uses to pick a scale, for when one isn't given. */
export { DEFAULT_PIXEL_HEIGHT } from "../shared";
export const DEFAULT_SEED = 0x11c7;
