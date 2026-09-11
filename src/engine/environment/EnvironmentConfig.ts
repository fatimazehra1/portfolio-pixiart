import { BUILDING_PLOTS, PLOT_RESERVED_BANDS, PROP_BASELINES } from "../ground";
import type { GroundBand, PlotArea } from "../ground";

/**
 * Environment tuning — what grows on this shore, where, and how densely.
 *
 * Every dimension is in *world pixels*: the same internal grid the sky, the sea,
 * the land and the lighthouse are drawn on, scaled up by one shared whole
 * number. Absolute rather than relative to the viewport, because pixel art has a
 * density — a bench that grew with the window would change how big its planks
 * look (CLAUDE.md §Pixel Art Rules).
 */

// --- What there is -----------------------------------------------------------

export type PropKind =
  | "tree"
  | "bush"
  | "rock"
  | "flower"
  | "tallGrass"
  | "bench"
  | "signPost"
  | "streetLamp"
  | "fence"
  | "driftwood";

export const PROP_KINDS: readonly PropKind[] = [
  "tree",
  "bush",
  "rock",
  "flower",
  "tallGrass",
  "bench",
  "signPost",
  "streetLamp",
  "fence",
  "driftwood",
];

/** What a prop does when nothing is happening. */
export type PropMotion = "none" | "sway" | "flicker";

export interface BandWeight {
  band: GroundBand;
  /** Relative likelihood of this band being chosen for this kind. */
  weight: number;
}

export interface KindConfig {
  /** Bands this kind may stand on, and how it prefers them. */
  bands: readonly BandWeight[];
  /**
   * Average gap between instances of this kind, in world pixels.
   *
   * The *average*, not the actual: the density field pulls this in and out as
   * it walks the shore, which is what turns an even sprinkling into copses and
   * clearings.
   */
  spacing: number;
  /** Never closer together than this. Enforced by rejection. */
  minGap: number;
  /**
   * How hard the density field bites, 0–1.
   *
   * At 0 a kind is spread evenly along the shore; at 1 it appears in tight
   * stands with long stretches of nothing between them. Grass wants a low
   * number and trees want a high one, which is roughly what happens on a real
   * coast — small things are everywhere and big things grow where they can.
   */
  clustering: number;
  /** How many drawings of this kind exist. */
  variants: number;
  /** Whether mirroring it is allowed. Doubles the apparent variety for free. */
  flip: boolean;
  /** Idle animation. */
  motion: PropMotion;
  /** Sway travel in pixels, and how fast, as [min, max] ranges. */
  sway?: { amount: [number, number]; rate: [number, number] };
  /**
   * Whole-number draw scales this kind may be built at.
   *
   * Whole numbers only, and in practice always `[1]`. Scaling pixel art by
   * anything else blurs it, and scaling it by two puts two different pixel
   * densities in the same frame — which CLAUDE.md forbids for good reason. Size
   * variety comes from having differently-sized *variants* instead, which is
   * why the organic kinds have four or five of them.
   */
  scales: readonly number[];
  /** Vertical jitter around the baseline, in pixels. */
  jitter: number;
  /**
   * Lay this kind on an exact grid of `spacing` rather than scattering it.
   *
   * For fencing, which is drawn as a tiling section: a run only reads as a fence
   * if its posts land exactly one section apart. The density field still decides
   * *where* the runs are, so the fencing appears in stretches with gaps between
   * them rather than ringing the whole shore.
   */
  tile?: boolean;
}

/**
 * The shore's planting scheme.
 *
 * Read as a composition rather than as numbers: driftwood and rock along the
 * tideline, flowers and grass in the verges where the light is, bushes filling
 * between them, trees standing back behind the path, and the built things —
 * benches, signs, lamps, fencing — strung sparsely along the road where a town
 * would have put them.
 *
 * The empty stretches matter as much as the full ones (ART_DIRECTION.md §Art
 * Style Rules: nothing should look procedurally generated). That is what
 * `clustering` is for, and why nothing here is spaced evenly.
 */
export const KINDS: Record<PropKind, KindConfig> = {
  /** Coastal trees, standing back behind the path where they have room. */
  tree: {
    bands: [
      { band: "backVerge", weight: 5 },
      { band: "foreground", weight: 1 },
    ],
    spacing: 62,
    minGap: 18,
    clustering: 0.85,
    variants: 4,
    flip: true,
    motion: "sway",
    sway: { amount: [1, 1], rate: [0.22, 0.4] },
    scales: [1],
    jitter: 2,
  },

  bush: {
    bands: [
      { band: "backVerge", weight: 2 },
      { band: "frontVerge", weight: 3 },
      { band: "foreground", weight: 2 },
    ],
    spacing: 30,
    minGap: 8,
    clustering: 0.6,
    variants: 5,
    flip: true,
    motion: "sway",
    sway: { amount: [1, 1], rate: [0.3, 0.55] },
    scales: [1],
    jitter: 1,
  },

  rock: {
    bands: [
      { band: "wetSand", weight: 3 },
      { band: "sand", weight: 3 },
      { band: "frontVerge", weight: 2 },
      { band: "foreground", weight: 1 },
    ],
    spacing: 26,
    minGap: 6,
    clustering: 0.55,
    variants: 4,
    flip: true,
    motion: "none",
    scales: [1],
    jitter: 1,
  },

  /** Wildflowers, in the verges where they'd actually get the sun. */
  flower: {
    bands: [
      { band: "frontVerge", weight: 4 },
      { band: "foreground", weight: 3 },
      { band: "backVerge", weight: 1 },
    ],
    spacing: 14,
    minGap: 3,
    clustering: 0.7,
    variants: 4,
    flip: true,
    motion: "sway",
    sway: { amount: [1, 1], rate: [0.5, 0.9] },
    scales: [1],
    jitter: 1,
  },

  /** The most numerous thing on the shore, and the only one that carries wind. */
  tallGrass: {
    bands: [
      { band: "frontVerge", weight: 4 },
      { band: "foreground", weight: 4 },
      { band: "backVerge", weight: 3 },
      { band: "sand", weight: 1 },
    ],
    spacing: 7,
    minGap: 2,
    clustering: 0.4,
    variants: 5,
    flip: true,
    motion: "sway",
    sway: { amount: [1, 1], rate: [0.55, 1.05] },
    scales: [1],
    jitter: 1,
  },

  /** Benches face the water, so they sit on the seaward side of the path. */
  bench: {
    bands: [{ band: "backVerge", weight: 1 }],
    spacing: 200,
    minGap: 120,
    clustering: 0.2,
    variants: 2,
    flip: true,
    motion: "none",
    scales: [1],
    jitter: 0,
  },

  signPost: {
    bands: [
      { band: "backVerge", weight: 2 },
      { band: "frontVerge", weight: 1 },
    ],
    spacing: 320,
    minGap: 200,
    clustering: 0.15,
    variants: 2,
    flip: true,
    motion: "none",
    scales: [1],
    jitter: 0,
  },

  /** Street lamps line the road, and are the only prop that makes its own light. */
  streetLamp: {
    bands: [{ band: "backVerge", weight: 1 }],
    spacing: 120,
    minGap: 100,
    clustering: 0,
    variants: 2,
    flip: false,
    motion: "flicker",
    scales: [1],
    jitter: 0,
  },

  /** Laid section by section, so a run is a fence and not a row of posts. */
  fence: {
    bands: [{ band: "backVerge", weight: 1 }],
    spacing: 10,
    minGap: 10,
    clustering: 0.92,
    variants: 3,
    flip: false,
    motion: "none",
    scales: [1],
    jitter: 1,
    tile: true,
  },

  driftwood: {
    bands: [
      { band: "wetSand", weight: 2 },
      { band: "sand", weight: 3 },
    ],
    spacing: 70,
    minGap: 20,
    clustering: 0.7,
    variants: 3,
    flip: true,
    motion: "none",
    scales: [1],
    jitter: 1,
  },
};

// --- Materials ---------------------------------------------------------------

/**
 * What everything is made of, as it would look under flat daylight.
 *
 * Declared once and then lit by the world (`applyAmbient`), exactly as the
 * ground and the lighthouse are. Nothing is authored per time of day, so a bench
 * goes gold at sunset and blue under the moon along with the sand it stands on,
 * and there is one place to change what this shore is built from.
 *
 * Muted and sun-faded throughout (ART_DIRECTION.md §Color Philosophy).
 */
export const MATERIALS = {
  bark: 0x7d6249,
  barkLight: 0x977a5c,
  barkDark: 0x584434,

  /**
   * Coastal foliage: grey-green and wind-bleached, never a jungle green.
   *
   * Deliberately a shade deeper than the lawn it grows out of. A bush the exact
   * colour of the grass band is a bush nobody can see, which is the difference
   * between planting a shore and tinting one.
   */
  leaf: 0x5f7d57,
  leafLight: 0x7b9a6c,
  leafDark: 0x415c3d,

  grass: 0x6f8f5a,
  grassLight: 0x87a468,
  grassDark: 0x53703f,

  /**
   * Sea grass: drier and paler than the lawn, going to seed.
   *
   * Same reasoning in the other direction — tall grass drawn in the grass band's
   * own green vanishes into it completely. This reads as the tussocky stuff that
   * actually grows on a dune, and it is the one thing on the shore that carries
   * the wind, so it has to be visible enough to be worth swaying.
   */
  seagrass: 0x97a86b,
  seagrassLight: 0xb8c78c,
  seagrassDark: 0x70804d,

  rock: 0x7e7b75,
  rockLight: 0x98958e,
  rockDark: 0x5d5b56,

  wood: 0x8a6a48,
  woodLight: 0xa5835e,
  woodDark: 0x604631,

  iron: 0x5a564f,
  ironLight: 0x767169,
  ironDark: 0x3e3b36,

  driftwood: 0xa89880,
  driftwoodLight: 0xc0b29b,
  driftwoodDark: 0x7d7060,

  /** Three quiet flower accents, never neon. `petalBrass` is the project accent. */
  petalCream: 0xe8dcae,
  petalRose: 0xd08f96,
  petalBrass: 0xe0a458,
} as const;

export type MaterialName = keyof typeof MATERIALS;

/** The three tones a prop is drawn in: body, lit face, shadowed face. */
export interface ToneSet {
  base: MaterialName;
  light: MaterialName;
  dark: MaterialName;
}

/** Which materials each kind is drawn in. Flowers override `light` per variant. */
export const KIND_TONES: Record<PropKind, ToneSet> = {
  tree: { base: "leaf", light: "leafLight", dark: "leafDark" },
  bush: { base: "leaf", light: "leafLight", dark: "leafDark" },
  rock: { base: "rock", light: "rockLight", dark: "rockDark" },
  // A flower's body is its head, not its stem — three tones can't carry petal,
  // centre, stem *and* green, and the petal is the only part worth spending
  // colour on at four pixels tall. `light` is overridden per variant, see PETALS.
  flower: { base: "petalBrass", light: "petalCream", dark: "grassDark" },
  tallGrass: { base: "seagrass", light: "seagrassLight", dark: "seagrassDark" },
  bench: { base: "wood", light: "woodLight", dark: "woodDark" },
  signPost: { base: "wood", light: "woodLight", dark: "woodDark" },
  streetLamp: { base: "iron", light: "ironLight", dark: "ironDark" },
  fence: { base: "wood", light: "woodLight", dark: "woodDark" },
  driftwood: { base: "driftwood", light: "driftwoodLight", dark: "driftwoodDark" },
};

/** Petals, one per flower variant, so a meadow isn't all one colour. */
export const PETALS: readonly MaterialName[] = [
  "petalCream",
  "petalRose",
  "petalBrass",
  "petalCream",
];

/**
 * Light a prop makes rather than receives.
 *
 * Warm orange, exactly as DESIGN.md §Lighting Rules assigns a lantern. Not
 * dimmed by the ambient — it *is* the light, so only its strength changes.
 */
export const EMISSIVE = {
  lamp: 0xffc184,
} as const;

// --- The lamp's flicker ------------------------------------------------------

export interface FlickerSettings {
  /** How far the flame wanders, 0–1 of full brightness. */
  depth: number;
  /** Two beating rates, so the flicker never finds a loop. */
  rateA: number;
  rateB: number;
  /** Alpha of the soft glow around a lamp, at full night. */
  glowAlpha: number;
  /** Radius of that glow, in pixels. */
  glowRadius: number;
}

export const FLICKER: FlickerSettings = {
  depth: 0.16,
  rateA: 2.7,
  rateB: 4.3,
  // Bigger and brighter than they were. A lantern reads by its halo long
  // before its flame, and the halo is what makes a night island look lit
  // rather than merely visible.
  glowAlpha: 0.72,
  glowRadius: 17,
};

// --- Placement ---------------------------------------------------------------

/** Where the land is, in CSS pixels. Read off the ground rather than recomputed. */
export interface GroundAnchors {
  /** Where the land begins — `Ground.topY`. */
  shorelineY: number;
  /** How tall the land band is. */
  groundHeight: number;
}

export interface EnvironmentOptions {
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
  /** Total width of the world in CSS pixels. Defaults to the viewport width. */
  worldWidth?: number;
  /** Pass the sky's `pixelScale` so every system shares one pixel grid. */
  pixelScale?: number;
  /** Where the land is. */
  anchors: GroundAnchors;
  /** The world's seed. The same number always grows the same shore. */
  seed?: number;
  /** Ground kept clear for buildings. Defaults to the ground's own layout. */
  plots?: readonly PlotArea[];
  /** Per-kind overrides, for density experiments. */
  kinds?: Partial<Record<PropKind, Partial<KindConfig>>>;
  /**
   * How thickly a place wants a kind to grow, as a multiplier at a world x.
   *
   * This is how a scene gets a bare working site or an overgrown one that the
   * shore is taking back, without the environment knowing what a scene is. It
   * is handed a function and asks it a question; who answers is not its
   * business. `x` is in world CSS pixels.
   */
  plantingAt?: (x: number, kind: PropKind) => number;
  /** Global motion multiplier. 0 for `prefers-reduced-motion: reduce`. */
  motionScale?: number;
  /**
   * How far beyond the viewport props are kept alive, in CSS pixels.
   *
   * The margin is what stops a tree popping into existence at the edge of the
   * screen. Wider costs sprites; narrower costs the illusion.
   */
  cullMargin?: number;
}

/** Baselines props stand on. The ground's own, so nothing floats. */
export const BASELINES = PROP_BASELINES;

/** Bands a building plot swallows. Anything nearer the viewer stays plantable. */
export const RESERVED_BANDS = PLOT_RESERVED_BANDS;

/** Ground kept clear for buildings, unless told otherwise. */
export const DEFAULT_PLOTS = BUILDING_PLOTS;

export const DEFAULT_SEED = 0x5eed;
export { DEFAULT_PIXEL_HEIGHT } from "../shared";
export const DEFAULT_CULL_MARGIN = 160;
