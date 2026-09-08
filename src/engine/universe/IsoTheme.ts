import {
  AptechRenderer,
  BbitRenderer,
  CottageRenderer,
  IdeasTentRenderer,
  LighthouseRenderer,
  NatureTechRenderer,
  Planet01Renderer,
  VaultsysRenderer,
  WorkshopRenderer,
} from "../buildings";
import type { BuildingRenderer } from "../buildings";
import type { IsoGround, RockBand, TopStep } from "./IsoIslandFactory";

/**
 * The hub's own per-chapter styling — palettes, island seeds, and which
 * landmark (if any) stands on each island.
 *
 * Kept apart from `UniverseRegistry` on purpose: the registry is read by both
 * the hub and a chapter's zoomed interior (era, status, camera, scenes), and
 * none of *that* is an isometric-hub concern. This file is the hub's alone —
 * exactly the seam "only the hub screen changes" asks for.
 */

/**
 * Where a piece of dressing goes, rather than what it is.
 *
 * The brief for this pass was "inhabited, not a building alone on a plot", and
 * the difference between the two is almost entirely arrangement. Evenly
 * scattered clutter reads as noise; the same pieces gathered at a door, run
 * along a path and banked up at the rim read as a place somebody uses.
 *
 * - `path`   strung along the worn path the island bakes into its own cap,
 *            just off it, the way things end up beside a route rather than on it
 * - `yard`   clustered close in around the building's foot
 * - `apron`  out on the open ground in front of the building
 * - `rim`    banked against the perimeter, which is also what gives the
 *            outline something to be read against
 */
export type SiteZone = "path" | "yard" | "apron" | "rim";

/** One kind of thing, some number of times, somewhere. */
export interface DressingEntry {
  /** A `SiteFactory` piece, or one of the shore's own `PropKind`s. */
  what: string;
  zone: SiteZone;
  count: number;
}

export interface IsoThemeEntry {
  /** Top-face palette, light to dark. */
  topPalette: readonly number[];
  /** Wall + underside palette, light to dark. */
  rockPalette: readonly number[];
  /** How far the rock tapers below the walls, in island pixels. */
  undersideLength: number;
  /**
   * Silhouette, per island. These are the knobs that make nine islands read as
   * nine places rather than one blob at nine sizes — the seed only ever moved
   * the same bumps around the same circle. See `IsoIslandParams` for the
   * meaning of each; the aim is that any of these is recognisable from its
   * outline alone, with no building on it.
   */
  elongation?: number;
  aspect?: number;
  roughness?: number;
  wallRatio?: number;
  undersideTaper?: number;
  /**
   * A smaller rock fragment hanging under the point.
   *
   * Off everywhere once, and for a good reason: a small grey ellipse in open
   * sky is indistinguishable from a stray contact shadow, and four islands
   * each carried one that looked like a bug. It is back on exactly two — the
   * two with the longest tapers — now that the fragment is banded like the
   * rock above it and reads as a piece of the same break rather than a smudge.
   */
  secondaryRock?: boolean;
  /** The rock, in horizontal bands. See `strata` below and `RockBand`. */
  rockStrata?: readonly RockBand[];
  /** Raised levels on the top face, and where their cliffs fall. */
  steps?: readonly TopStep[];
  /** Strands trailing from the underside. Four islands carry them, five do not. */
  vines?: number;
  /** What those strands are made of, light to dark. */
  vineTones?: readonly number[];
  /** Makes this chapter's landmark, if it has a dedicated renderer. */
  building?: () => BuildingRenderer;
  /**
   * Target building height, as a multiple of the island's own top-face width.
   * Every building is scaled to hit this rather than its raw pixel size, so a
   * squat campus and a five-storey tower read as similar *presences* on the
   * map. 1.0–1.3 for most; Planet01 goes higher on purpose — it is meant to
   * be the tallest thing on the board, just not an outlier.
   */
  heightFactor?: number;
  /**
   * Extra ambient boost applied only to this chapter's building/landmark, on
   * top of the hub's own flat lighting. For the two that read as near-black
   * under plain daylight — Vaultsys's stone is deliberately cool and dark,
   * and Lighthouse leans hard on its `#` shadow tone.
   */
  lightBoost?: number;
  /** Dirt, a worn path and the rim tone, baked into the island's own cap. */
  ground?: IsoGround;
  /**
   * What stands on the ground around the building, and where.
   *
   * Names are resolved against `SiteFactory` first and the shore's own
   * `PropFactory` second — see `OverviewLayer.dressIsland`.
   */
  dressing?: readonly DressingEntry[];
  /**
   * A second scatter, drawn only once one island is most of the frame.
   *
   * Kept per chapter rather than shared for the same reason `dressing` is: a
   * handful of wildflowers is right on a meadow and wrong on an asphalt road,
   * and the close view is precisely where that starts to be noticeable.
   */
  closeDressing?: readonly DressingEntry[];
}

/**
 * The rock below an island, in bands: topsoil, then whatever that island is
 * standing on.
 *
 * Read as a cross-section, top to bottom, with a relative thickness each — the
 * weights are relative to the island's own rock depth, so the same five bands
 * describe a stubby wedge and a long spike without either being retuned. Three
 * bands where an island is small enough that five would be one pixel each.
 */
const strata = (...entries: (readonly [number, number])[]): RockBand[] =>
  entries.map(([color, weight]) => ({ color, weight }));

/** Raised levels on the top face, back rim first. See `TopStep`. */
const stepped = (...entries: (readonly [number, number])[]): TopStep[] =>
  entries.map(([at, rise]) => ({ at, rise }));

/** Shorthand, because these lists are long and the shape never varies. */
const at = (zone: SiteZone, ...items: (readonly [string, number])[]): DressingEntry[] =>
  items.map(([what, count]) => ({ what, zone, count }));

export const ISO_THEME: Readonly<Record<string, IsoThemeEntry>> = {
  aptech: {
    // Warm sand — the campus, golden hour.
    topPalette: [0xf3e2ab, 0xe0c581, 0xc7a55d, 0xa3823f],
    rockPalette: [0xa88f66, 0x8a7350, 0x6b5a3e, 0x4a3f2c],
    undersideLength: 46,
    elongation: 1.35,
    aspect: 0.85,
    roughness: 0.7,
    wallRatio: 0.26,
    undersideTaper: 1.3,
    // A campus on old dune sand: dark topsoil, an ochre clay, then the pale
    // limestone the whole coast is built on.
    rockStrata: strata(
      [0x7d6743, 1.0],
      [0xa8794a, 0.9],
      [0xbdb08a, 1.3],
      [0x6a5940, 1.5],
      [0x3d3325, 1.1]
    ),
    // One level: the campus stands on a plateau with a terrace in front of it,
    // which is what a building you are *let into* looks like from outside.
    steps: stepped([0.6, 3]),
    building: () => new AptechRenderer(1),
    // Low and wide by design (ART_DIRECTION.md — a campus you're let into, not
    // a tower you look up at); a width cap keeps it from overrunning its
    // island, so its own height comes out under the shared target.
    heightFactor: 1.0,
    // A campus you are let into: a path to the door, seats beside it, and the
    // flag over the entrance the landmark always carried.
    // A courtyard, not a yard: brick underfoot and the beds planted rather
    // than grown. Barely any bare earth — this is ground that was laid.
    ground: {
      patches: 0.08,
      path: 7,
      surface: "brick",
      paving: [0xc98f6a, 0xb0764f, 0x91603f, 0x6d4730],
      dirt: [0xd9c08a, 0xbfa471, 0xa08757, 0x7d6942],
    },
    dressing: [
      ...at("yard", ["flagpole", 1], ["noticeBoard", 1], ["bench", 1]),
      ...at("path", ["bench", 1], ["planter", 1]),
      ...at("apron", ["gardenPatch", 2], ["bench", 1]),
      ...at("rim", ["hedge", 2], ["bush", 2], ["tallGrass", 2]),
    ],
    closeDressing: [...at("apron", ["flower", 3]), ...at("rim", ["tallGrass", 3])],
  },
  freelance: {
    // A meadow desk — soft green, small.
    topPalette: [0xd8e0ab, 0xbccf85, 0x9cb464, 0x748f45],
    rockPalette: [0x8f8a66, 0x726d4f, 0x554f39, 0x3a3527],
    undersideLength: 32,
    elongation: 0.85,
    aspect: 1.15,
    roughness: 1.5,
    wallRatio: 0.16,
    undersideTaper: 2.4,
    rockStrata: strata([0x5f5f3c, 1.0], [0x8a7a4c, 1.1], [0x9e9c7e, 1.2], [0x45412e, 1.6]),
    // A low bank at the back, not a plateau. The cottage sits on the lower,
    // wider half — a desk somebody works from is not on a podium.
    steps: stepped([0.36, 2]),
    vines: 3,
    vineTones: [0x8fb56d, 0x6b8f52, 0x4e6a3a],
    building: () => new CottageRenderer(1),
    heightFactor: 0.95,
    // A desk somebody works from: a bed of vegetables, pots by the door, and
    // just enough fence to say the garden has an edge.
    // Grass, with a run of flagstones laid through it by somebody who was not
    // a paver. The gaps in it are the point.
    ground: {
      patches: 0.14,
      path: 5,
      surface: "flagstone",
      paving: [0xb9b3a4, 0x9d9686, 0x7e786a, 0x5e594e],
      dirt: [0xb9c184, 0x9da76a, 0x818b53, 0x62693d],
    },
    dressing: [
      ...at("yard", ["pottedPlant", 2], ["washingLine", 1], ["gardenPatch", 1]),
      ...at("path", ["picketFence", 2], ["flower", 2]),
      ...at("apron", ["gardenPatch", 1], ["picketFence", 1], ["flower", 2]),
      ...at("rim", ["bush", 3], ["tallGrass", 3]),
    ],
    closeDressing: [...at("apron", ["flower", 3]), ...at("rim", ["tallGrass", 3])],
  },
  planet01: {
    // Poured concrete, not city stone. This is the one island whose ground is
    // manufactured, and a warm sandstone under a steel-and-glass tower read as
    // the same earth every other island is made of.
    topPalette: [0xd6d4cd, 0xb6b3aa, 0x94908a, 0x726f6a],
    rockPalette: [0x8c8478, 0x6e675c, 0x534d44, 0x38332c],
    undersideLength: 60,
    elongation: 1.1,
    aspect: 1.0,
    roughness: 0.6,
    wallRatio: 0.34,
    undersideTaper: 2.9,
    secondaryRock: true,
    rockStrata: strata(
      [0x6f6552, 0.9],
      [0x94836a, 1.0],
      [0xb2ab98, 1.5],
      [0x5d564a, 1.5],
      [0x322e27, 1.2]
    ),
    // Two levels, the only island with them: the tallest thing on the board
    // earns the most ground under it, and terracing is how a city gets height
    // out of a hillside.
    steps: stepped([0.64, 4], [0.3, 3]),
    building: () => new Planet01Renderer(1),
    // Tallest on the board, deliberately — a rooftop-classroom tower earns
    // more presence than the others, capped well under 1.5x their height.
    heightFactor: 1.35,
    // A city block: lamps along the kerb, planters between them, bollards
    // where the paving stops. Nothing grows here that was not planted.
    // A road, and that is the only word for it: asphalt with a broken centre
    // line, kerbed on both sides. `paving` reads differently here than
    // elsewhere — see the `asphalt` case in `IsoIslandFactory.surfaceColor`:
    // the first entry is the *line*, the middle two the surface, the last the
    // kerb.
    ground: {
      patches: 0.05,
      path: 9,
      surface: "asphalt",
      paving: [0xf0ece0, 0x4c4c4f, 0x414144, 0x8e8b84],
      dirt: [0xc4c1b8, 0xa8a49b, 0x8b877f, 0x6d6a64],
    },
    dressing: [
      ...at("yard", ["lampPost", 1], ["bollard", 3], ["planter", 1]),
      ...at("path", ["roadSign", 1], ["lampPost", 1], ["bollard", 2]),
      ...at("apron", ["parkedCar", 1], ["bollard", 2], ["planter", 1]),
      ...at("rim", ["planter", 2], ["bollard", 2], ["hedge", 1]),
    ],
    closeDressing: [...at("rim", ["bollard", 2]), ...at("path", ["planter", 1])],
  },
  // Matches `ChapterConfig.id` in the registry, which is spelled with one
  // "t" — a mismatch here silently falls back to `DEFAULT_ISO_THEME` (no
  // `building`), and the real renderer never gets used at all.
  vaulsys: {
    // Fortified grey stone — cool, shut, exact.
    topPalette: [0xc7ccd4, 0xa7adb8, 0x878e9a, 0x686f7a],
    rockPalette: [0x6a707a, 0x565b64, 0x42464e, 0x2e3136],
    undersideLength: 50,
    elongation: 0.8,
    aspect: 0.8,
    roughness: 0.5,
    wallRatio: 0.4,
    undersideTaper: 1.0,
    rockStrata: strata([0x6a707a, 0.9], [0x878e9a, 1.2], [0x4a4f58, 1.5], [0x24272c, 1.3]),
    // A high, hard platform with a shallow apron in front. Fortification.
    steps: stepped([0.58, 4]),
    building: () => new VaultsysRenderer(1),
    heightFactor: 1.2,
    lightBoost: 1.3,
    // Shut and formal: a paved forecourt, clipped hedges, and a line of
    // bollards making it clear where you may and may not drive.
    // Polished slabs, laid square, with almost nothing growing between them.
    // The only island where the ground itself is trying to look expensive.
    ground: {
      patches: 0.04,
      path: 8,
      surface: "paving",
      paving: [0xd2d6dc, 0xb4b9c1, 0x969ba4, 0x747982],
      dirt: [0xbcc1c8, 0x9fa4ad, 0x848992, 0x686d76],
    },
    dressing: [
      ...at("yard", ["hedge", 2], ["lampPost", 1], ["flagpole", 1]),
      ...at("path", ["bollard", 3], ["barrierGate", 1]),
      ...at("apron", ["hedge", 2], ["bollard", 2]),
      ...at("rim", ["hedge", 3], ["lowWall", 1]),
    ],
    closeDressing: [...at("rim", ["hedge", 1]), ...at("apron", ["bollard", 1])],
  },
  naturetech: {
    // Green construction earth — the current work, warm and active.
    topPalette: [0xc3d9a0, 0x9fc178, 0x7ea856, 0x5f8a3d],
    rockPalette: [0x8a7a5a, 0x6d6045, 0x504632, 0x362f21],
    undersideLength: 58,
    elongation: 1.45,
    aspect: 0.95,
    roughness: 1.2,
    wallRatio: 0.2,
    undersideTaper: 2.2,
    rockStrata: strata(
      [0x6b6b3f, 1.1],
      [0x8f7c4c, 1.0],
      [0xa79f7c, 1.2],
      [0x5b5138, 1.5],
      [0x322c1e, 1.1]
    ),
    // Two shallow levels: a site cut into a slope, which is what half-built
    // ground actually looks like.
    steps: stepped([0.7, 3], [0.34, 2]),
    vines: 4,
    vineTones: [0x7ea856, 0x5f8a3d, 0x44652a],
    building: () => new NatureTechRenderer(1),
    heightFactor: 1.15,
    // A live site: pallets and stacked materials where the work is, cones and
    // fencing where it is not, and one machine parked half in the way.
    // Churned dirt with gravel run over it, which is what ground looks like
    // while it is being built on rather than after.
    ground: {
      patches: 0.52,
      path: 7,
      surface: "gravel",
      paving: [0xa39a86, 0x877e6c, 0x6b6354, 0x4e483d],
      dirt: [0xa8a06c, 0x8b8456, 0x6f6942, 0x524d30],
    },
    dressing: [
      ...at("yard", ["scaffold", 1], ["pallet", 2], ["cone", 2], ["materialStack", 1]),
      ...at("path", ["cone", 2], ["siteFence", 2], ["crate", 1]),
      ...at("apron", ["cementMixer", 1], ["floodlight", 1], ["pallet", 1], ["cone", 1]),
      ...at("rim", ["siteFence", 2], ["tallGrass", 3], ["bush", 2]),
    ],
    closeDressing: [...at("path", ["cone", 2]), ...at("rim", ["tallGrass", 2])],
  },
  bbit: {
    // Pale purple-grey. The old palette was a lavender strong enough to be the
    // loudest thing on the board, on the one island whose whole argument is
    // that it is quiet.
    topPalette: [0xd8d2e2, 0xbcb4cc, 0x9d95b0, 0x7e7692],
    rockPalette: [0x6f6178, 0x584d61, 0x413849, 0x2c2632],
    undersideLength: 40,
    elongation: 0.7,
    aspect: 1.25,
    roughness: 0.8,
    wallRatio: 0.3,
    undersideTaper: 2.6,
    rockStrata: strata([0x6f6178, 1.0], [0x8d7c94, 1.1], [0x453b4c, 1.6], [0x241f2a, 1.2]),
    // Unstepped, deliberately. The spire is the only vertical on the map and
    // the ground under it should say nothing at all.
    building: () => new BbitRenderer(1),
    heightFactor: 1.3,
    // The spire's ashlar is cool and a step darker than the island it stands
    // on. A small lift keeps the coursing and the clock face readable without
    // washing out the one window that is meant to be the brightest thing here.
    lightBoost: 1.2,
    // Almost nothing, deliberately. The spire is the only vertical on the map
    // and the one thing about this island worth reading; a full yard of hedges
    // and walls around it turned into a dark ring competing with it. A path, a
    // bench at the door, three hedges. That is the whole campus.
    // Stone paving, older and softer than Vaultsys's, and a good deal more of
    // it left alone.
    ground: {
      patches: 0.08,
      path: 6,
      surface: "paving",
      paving: [0xc9c3d2, 0xaba4b8, 0x8d869c, 0x6d667c],
      dirt: [0xc0b9cc, 0xa39bb0, 0x867e94, 0x685f78],
    },
    dressing: [
      ...at("yard", ["bench", 1], ["campusLamp", 1]),
      ...at("path", ["hedge", 1], ["lowWall", 1]),
      ...at("apron", ["bench", 1], ["hedge", 1]),
      ...at("rim", ["hedge", 2], ["tallGrass", 2]),
    ],
    closeDressing: [...at("rim", ["tallGrass", 2]), ...at("apron", ["flower", 1])],
  },
  workshop: {
    // Dark earth and rust — a bench, half-finished.
    topPalette: [0xc9ad84, 0xa88a61, 0x866c47, 0x63502f],
    rockPalette: [0x746452, 0x5a4d3f, 0x40372c, 0x2b251d],
    undersideLength: 36,
    elongation: 1.2,
    aspect: 0.75,
    roughness: 1.7,
    wallRatio: 0.22,
    undersideTaper: 1.2,
    rockStrata: strata([0x6c5a44, 1.0], [0x8f6a45, 1.0], [0x9c9078, 1.2], [0x2f2820, 1.6]),
    // A yard levelled by hand, once, badly: a step across the middle of it.
    steps: stepped([0.44, 3]),
    building: () => new WorkshopRenderer(1),
    heightFactor: 0.85,
    // A yard that has been added to more than once: a bench outside because
    // the bay is full, a rack of tools, and everything else in a pile.
    // Packed dirt with gravel trodden into it, which is what a yard becomes
    // when nobody has ever decided what it is.
    ground: {
      patches: 0.44,
      path: 6,
      surface: "gravel",
      paving: [0xa89880, 0x8a7a63, 0x6d5f4c, 0x4e4335],
      dirt: [0xbba178, 0x9c8460, 0x7d6a4b, 0x5c4d36],
    },
    dressing: [
      ...at("yard", ["workbench", 1], ["toolRack", 1], ["cableSpool", 1], ["crate", 2]),
      ...at("path", ["crate", 1], ["scrapPile", 1], ["tarp", 1]),
      ...at("apron", ["scrapPile", 1], ["pallet", 1], ["cableSpool", 1]),
      ...at("rim", ["rock", 3], ["tallGrass", 2]),
    ],
    closeDressing: [...at("path", ["papers", 2]), ...at("rim", ["rock", 2])],
  },
  ideas: {
    // Dark earth, warmer — a tent, arrivals unannounced.
    topPalette: [0xd9b98a, 0xc19a63, 0xa17c48, 0x7d5f34],
    rockPalette: [0x6b5642, 0x534333, 0x3c3126, 0x28211a],
    undersideLength: 34,
    elongation: 0.95,
    aspect: 1.05,
    roughness: 1.9,
    wallRatio: 0.14,
    undersideTaper: 1.6,
    // Three bands, not five. The island is small enough that five would be a
    // pixel each, which is stripes rather than strata.
    rockStrata: strata([0x6b5642, 1.0], [0x8a6d4a, 1.1], [0x2e251c, 1.7]),
    // Flat: nothing here has been dug into or built up, somebody camped.
    vines: 3,
    vineTones: [0x8a6d4a, 0x6b5642, 0x463628],
    building: () => new IdeasTentRenderer(1),
    heightFactor: 0.9,
    // Somebody camped here this morning: stools pulled up, crates for a
    // table, paper everywhere, and a second sign nobody has read.
    // Rough dirt and nothing else. No surface was ever laid here; the path is
    // where people walked, and that is the whole of the groundworks.
    ground: {
      patches: 0.48,
      path: 4,
      surface: "dirt",
      dirt: [0xc9a670, 0xab8a56, 0x8a6e42, 0x66502f],
    },
    dressing: [
      ...at("yard", ["sack", 2], ["ropeCoil", 1], ["oilLantern", 1], ["stool", 1]),
      ...at("path", ["stake", 2], ["handSign", 1]),
      ...at("apron", ["sack", 1], ["stake", 2], ["papers", 1]),
      ...at("rim", ["tallGrass", 3], ["bush", 2]),
    ],
    closeDressing: [...at("path", ["papers", 2]), ...at("rim", ["tallGrass", 3])],
  },
  lighthouse: {
    // Pale stone — the beacon, always lit.
    topPalette: [0xe8e2d4, 0xcfc7b3, 0xb0a793, 0x8f8776],
    rockPalette: [0x716b5e, 0x5a554a, 0x433f37, 0x2d2a25],
    undersideLength: 44,
    elongation: 1.5,
    aspect: 0.7,
    roughness: 1.3,
    wallRatio: 0.24,
    undersideTaper: 3.4,
    secondaryRock: true,
    rockStrata: strata(
      [0x6e685a, 0.9],
      [0x8a8272, 0.9],
      [0xb4ad9c, 1.4],
      [0x534e44, 1.5],
      [0x2b2823, 1.3]
    ),
    // The tower stands on the high rock and the jetty runs down toward the
    // water, which is the whole reason a lighthouse is where it is.
    steps: stepped([0.64, 4]),
    building: () => new LighthouseRenderer(1),
    // Pulled back from 1.3 as the island widened, so the extra ground stays
    // ground instead of being handed straight back to the tower.
    heightFactor: 1.1,
    lightBoost: 1.35,
    // A shore, not a garden: rock, coarse grass, and a run of jetty posts
    // coming up out of the ground toward the door.
    // A shore: bleached rock, coarse grass, and a jetty coming up out of the
    // water toward the door. Nothing here was laid, only weathered.
    ground: {
      patches: 0.32,
      path: 5,
      surface: "dirt",
      dirt: [0xcfc7b3, 0xb2ab98, 0x948e7d, 0x726d5f],
    },
    dressing: [
      ...at("yard", ["jettyPost", 2], ["buoy", 1], ["rock", 2]),
      ...at("path", ["jetty", 1], ["jettyPost", 3], ["rock", 1]),
      ...at("apron", ["buoy", 1], ["driftwood", 2], ["rock", 2]),
      ...at("rim", ["rock", 3], ["tallGrass", 3]),
    ],
    closeDressing: [...at("rim", ["tallGrass", 3], ["rock", 2])],
  },
};

export const DEFAULT_ISO_THEME: IsoThemeEntry = {
  topPalette: [0xcccccc, 0xaaaaaa, 0x888888, 0x666666],
  rockPalette: [0x777777, 0x5f5f5f, 0x474747, 0x303030],
  undersideLength: 36,
};
