import type { Texture } from "pixi.js";
import { createRandom, maskToTexture, range, rangeInt } from "../shared";
import { KINDS, PROP_KINDS } from "../environment";
import type { PropKind } from "../environment";
import type { DetailTier, IslandForm, ResolvedChapter } from "./UniverseTypes";

/**
 * The landmasses the worlds are cut from.
 *
 * # What an island is, and what it is not
 * A floating landmass with a surface, an underside, and a few things growing on
 * it. It is not a chapter's world seen from far away — the inside of a world is
 * a place you walk, and no amount of zooming out turns a shore into an island.
 * It is a *shape you can recognise a world by*, which is the one thing the map
 * has to do that a labelled dot cannot.
 *
 * # Why the shape carries the identity
 * Colour separates worlds you are already looking at. Silhouette separates
 * worlds you have not looked at yet — it is the only channel that survives the
 * far zoom, where a world is thirty pixels tall and its palette is two muddy
 * tones. So the first thing a chapter declares is its `form`, and the eight
 * forms below are eight genuinely different outlines rather than one outline at
 * eight sizes.
 *
 * Two shapes per island rather than one: a surface flat enough to build on, and
 * a keel tapering underneath. A disc reads as a token on a board; a thing with
 * a top and an underside reads as somewhere you could stand, and the underside
 * is what says nothing is holding it up.
 *
 * # No new buildings
 * Nothing here draws architecture. Structures come from `LandmarkFactory` as
 * silhouettes, and the planting is the shore's own — the same trees, bushes,
 * rocks and flowers `PropFactory` already grows for the waterfront.
 */

/** The three tones a shape is drawn in. White masks, tinted at runtime. */
export interface IslandTones {
  base: Texture;
  light: Texture;
  dark: Texture;
}

/** One thing growing on an island. */
export interface IslandProp {
  kind: PropKind;
  variant: number;
  /** In island pixels, from the island's left edge. */
  x: number;
  /** Baseline, in island pixels down from the island's top edge. */
  y: number;
  flip: boolean;
  /** Where in its own sway cycle it is, so no two move together. */
  phase: number;
  swayRate: number;
  swayAmount: number;
  /** The zoom tier this appears at. Planting is never `far`. */
  tier: DetailTier;
}

/** Everything needed to draw one island. */
export interface Island {
  /** The surface. Drawn over the keel. */
  cap: IslandTones;
  /** The underside. */
  keel: IslandTones;
  width: number;
  height: number;
  /** How far down the island the surface sits, in island pixels. */
  surfaceY: number;
  props: readonly IslandProp[];
  /**
   * The surface height at each column, in island pixels from the top.
   *
   * Kept so landmarks can stand *on the ground* rather than on a nominal
   * baseline — a stepped or bumpy island would otherwise have its tower
   * hovering over the low side.
   */
  surface: Int32Array;
}

/**
 * How a form is cut, per column.
 *
 * Three curves in `nx` (-1 at the west edge, +1 at the east): how far out the
 * land reaches, how far down its surface sits, how deep the keel hangs. Every
 * silhouette on the map is these three, which is what keeps eight outlines to
 * one masking loop.
 */
interface FormProfile {
  /** Land exists where this is above 0. 1 is full width. */
  extent: (nx: number) => number;
  /** Surface offset from the top, 0–1 of the cap's height. */
  dome: (nx: number) => number;
  /** Keel depth, 0–1 of the keel's height. */
  keel: (nx: number) => number;
  /** Cap thickness, as a multiple of the radius. */
  capDepth: number;
  /** Keel length, as a multiple of the radius. */
  keelDepth: number;
  /** How ragged the top edge is, in pixels. 0 leaves it cut square. */
  roughness: number;
}

const mag = (v: number) => Math.abs(v);

/**
 * The eight silhouettes.
 *
 * Each one is a sentence about the chapter it carries, written in geometry.
 */
const FORMS: Record<IslandForm, FormProfile> = {
  /** Wide, flat, room to gather on. */
  plateau: {
    extent: (nx) => 1 - mag(nx) ** 3.2,
    dome: (nx) => 0.35 * nx * nx,
    keel: (nx) => (1 - nx * nx) ** 1.4,
    capDepth: 0.3,
    keelDepth: 0.8,
    roughness: 1,
  },

  /** Built on two levels: flat, then a step down to the east. */
  terrace: {
    extent: (nx) => 1 - mag(nx) ** 3,
    // The step is the whole form. A smooth ramp here reads as a hill, and a
    // hill is not a city.
    dome: (nx) => (nx > 0.15 ? 0.62 : 0.12) + 0.18 * nx * nx,
    keel: (nx) => (1 - nx * nx) ** 1.5,
    capDepth: 0.42,
    keelDepth: 0.9,
    roughness: 1,
  },

  /** Straight sides, flat top, blunt bottom. The only hard-edged form. */
  slab: {
    // Near-vertical walls: extent holds at 1 and then falls off a cliff.
    extent: (nx) => (mag(nx) < 0.92 ? 1 : 0),
    dome: () => 0,
    keel: (nx) => (mag(nx) < 0.86 ? 1 : 0.55),
    capDepth: 0.34,
    keelDepth: 0.5,
    roughness: 0,
  },

  /** One building's worth of ground. */
  knoll: {
    extent: (nx) => 1 - nx * nx,
    dome: (nx) => 0.5 * nx * nx,
    keel: (nx) => (1 - nx * nx) ** 1.2,
    capDepth: 0.36,
    keelDepth: 0.72,
    roughness: 1,
  },

  /** Tall and narrow. Almost all height, almost no ground. */
  peak: {
    extent: (nx) => 1 - mag(nx) ** 1.5,
    dome: (nx) => 0.4 * mag(nx),
    // Long and slow: the keel is most of what you see.
    keel: (nx) => (1 - nx * nx) ** 0.9,
    capDepth: 0.3,
    keelDepth: 1.9,
    roughness: 1,
  },

  /** An irregular heap, still being piled up. */
  mound: {
    extent: (nx) => 1 - mag(nx) ** 2.6,
    // Offset humps, so the top never resolves into a curve.
    dome: (nx) =>
      0.34 * nx * nx + 0.16 * Math.sin(nx * 7.3) + 0.1 * Math.sin(nx * 13.1 + 1.2),
    keel: (nx) => (1 - nx * nx) ** 1.3,
    capDepth: 0.38,
    keelDepth: 0.85,
    roughness: 2,
  },

  /** Broken into pieces that hang together. */
  cluster: {
    // A gap either side of centre: the mass reads as three, not one.
    extent: (nx) => {
      const d = mag(nx);
      if (d > 0.42 && d < 0.56) return 0;
      return 1 - d ** 2.8;
    },
    dome: (nx) => 0.3 * nx * nx + (mag(nx) > 0.56 ? 0.32 : 0),
    keel: (nx) => (1 - nx * nx) ** 1.6,
    capDepth: 0.34,
    keelDepth: 0.7,
    roughness: 2,
  },

  /** Thin, angular, asymmetric. Nothing has settled. */
  shard: {
    // Deliberately lopsided: the west face is a cliff, the east a long slope.
    extent: (nx) => (nx < 0 ? 1 - mag(nx) ** 5 : 1 - nx ** 1.2),
    dome: (nx) => 0.55 * Math.max(0, nx),
    keel: (nx) => (nx < 0 ? (1 - nx * nx) ** 2.4 : (1 - nx * nx) ** 1.1),
    capDepth: 0.28,
    keelDepth: 1.25,
    roughness: 1,
  },
};

/**
 * Which kinds grow on which terrain, and how thickly.
 *
 * A word that already exists on `ChapterIdentity`, doing one more job. A campus
 * is planted, a city is bare and rocky, a vault is barer still, a forge is scrub
 * and stone. Cheap, and it means no world's planting has to be authored.
 */
const PLANTING: Record<string, { kinds: readonly PropKind[]; count: [number, number] }> = {
  campus: { kinds: ["tree", "bush", "flower", "tallGrass"], count: [5, 8] },
  city: { kinds: ["rock", "bush", "tallGrass"], count: [3, 5] },
  vault: { kinds: ["rock", "rock", "bush"], count: [2, 3] },
  forge: { kinds: ["tree", "rock", "bush", "tallGrass"], count: [4, 7] },
  shore: { kinds: ["rock", "driftwood", "tallGrass"], count: [3, 5] },
  spire: { kinds: ["bush", "tallGrass"], count: [3, 5] },
  workshop: { kinds: ["rock", "bush"], count: [3, 5] },
  meadow: { kinds: ["flower", "tallGrass", "bush"], count: [5, 8] },
};

const DEFAULT_PLANTING = PLANTING.shore;

/**
 * Bake one island for one chapter.
 *
 * Seeded off the chapter's id, so a world looks the same every time it is drawn
 * and no two come out alike even where they share a form.
 */
export function bakeIsland(chapter: ResolvedChapter, pixelScale: number): Island {
  const form = FORMS[chapter.identity.form] ?? FORMS.knoll;
  const radius = Math.max(8, Math.round(chapter.overview.radius / pixelScale));
  const width = radius * 2 + 1;
  const capHeight = Math.max(3, Math.round(radius * form.capDepth));
  const keelHeight = Math.max(4, Math.round(radius * form.keelDepth));
  const height = capHeight + keelHeight + 1;

  const rand = createRandom(seedOf(chapter.id));

  // The surface, per column. The roughness is held for a few columns at a time:
  // re-rolled per pixel it shreds the skyline into static, and an island has to
  // have a top edge you could walk along.
  const surface = new Int32Array(width);
  let wobble = 0;
  for (let x = 0; x < width; x++) {
    const nx = (x - radius) / radius;
    if (x % 4 === 0 && form.roughness > 0) wobble = rangeInt(rand, 0, form.roughness);
    surface[x] = Math.round(capHeight * form.dome(nx)) + (form.roughness > 0 ? wobble : 0);
  }

  const capMask = new Uint8Array(width * height);
  const keelMask = new Uint8Array(width * height);

  for (let x = 0; x < width; x++) {
    const nx = (x - radius) / radius;
    if (form.extent(nx) <= 0) continue;

    const top = surface[x];
    const depth = Math.max(0, Math.round(keelHeight * form.keel(nx)));
    const capBottom = Math.min(height - 1, top + capHeight);

    for (let y = top; y < capBottom; y++) capMask[y * width + x] = 255;
    for (let y = capBottom; y < Math.min(height, capBottom + depth); y++) {
      keelMask[y * width + x] = 255;
    }
  }

  // Rock hangs in uneven teeth rather than a smooth cone. Bitten off the bottom
  // rather than added to it, so the silhouette stays inside the shape above.
  // Skipped for the slab, whose whole character is being cut square.
  if (chapter.identity.form !== "slab") erodeUnderside(keelMask, width, height, rand);

  return {
    cap: shade(capMask, width, height),
    keel: shade(keelMask, width, height),
    width,
    height,
    surfaceY: Math.round(capHeight * 0.35),
    surface,
    props: plant(chapter, width, radius, surface, form, rand),
  };
}

// --- Internal ----------------------------------------------------------------

/** A stable number from a chapter id, so an island is the same island twice. */
function seedOf(id: string): number {
  let seed = 0x9e37;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  return seed;
}

/**
 * Split a mask into three tones: lit top-left, shadowed bottom-right, body.
 *
 * The one lighting convention everything in this world already agrees on
 * (ART_DIRECTION.md), applied the cheapest way that reads: a pixel with nothing
 * above or to its left is lit, a pixel with nothing below or to its right is
 * shadowed, everything else is body. No gradients — this is a mark on a map.
 */
function shade(mask: Uint8Array, w: number, h: number): IslandTones {
  const base = new Uint8Array(w * h);
  const light = new Uint8Array(w * h);
  const dark = new Uint8Array(w * h);

  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;

      base[i] = 255;
      if (!at(x, y - 1) || !at(x - 1, y)) light[i] = 255;
      else if (!at(x, y + 1) || !at(x + 1, y)) dark[i] = 255;
    }
  }

  return {
    base: maskToTexture(w, h, base, "Island"),
    light: maskToTexture(w, h, light, "Island"),
    dark: maskToTexture(w, h, dark, "Island"),
  };
}

/**
 * Bite uneven teeth out of the bottom of the keel.
 *
 * Skips any column too thin to spare a pixel. Without that guard the point of
 * the keel is eaten out from under itself, and what is left is a scatter of
 * single pixels below the island — which reads as dirt on the screen, not rock.
 */
function erodeUnderside(mask: Uint8Array, w: number, h: number, rand: () => number): void {
  for (let x = 0; x < w; x++) {
    let filled = 0;
    for (let y = 0; y < h; y++) if (mask[y * w + x]) filled++;
    if (filled < 6) continue;

    let bite = rangeInt(rand, 0, 1);
    for (let y = h - 1; y >= 0 && bite > 0; y--) {
      const i = y * w + x;
      if (!mask[i]) continue;
      mask[i] = 0;
      bite--;
    }
  }
}

/** Scatter this chapter's planting across the island's surface. */
function plant(
  chapter: ResolvedChapter,
  width: number,
  radius: number,
  surface: Int32Array,
  form: FormProfile,
  rand: () => number
): IslandProp[] {
  const scheme = PLANTING[chapter.identity.terrain] ?? DEFAULT_PLANTING;
  const count = rangeInt(rand, scheme.count[0], scheme.count[1]);
  const props: IslandProp[] = [];

  for (let i = 0; i < count; i++) {
    const kind = scheme.kinds[rangeInt(rand, 0, scheme.kinds.length - 1)];
    if (!PROP_KINDS.includes(kind)) continue;

    const config = KINDS[kind];
    // Kept inboard of both edges: a tree on the very lip of an island hangs
    // over nothing and reads as a mistake rather than as planting.
    const nx = range(rand, -0.72, 0.72);
    // And off any column the form has cut away — the cluster form has real gaps
    // in it, and a bush growing in one would be floating.
    if (form.extent(nx) <= 0) continue;

    const x = Math.max(1, Math.min(width - 2, Math.round(radius + nx * radius)));

    props.push({
      kind,
      variant: rangeInt(rand, 0, Math.max(0, config.variants - 1)),
      x,
      // Stood a pixel into the surface, so nothing floats.
      y: surface[x] + 2,
      flip: config.flip ? rand() < 0.5 : false,
      phase: range(rand, 0, Math.PI * 2),
      swayRate: range(rand, config.sway?.rate[0] ?? 0.3, config.sway?.rate[1] ?? 0.5),
      swayAmount: config.sway?.amount[0] ?? 1,
      // Planting is never `far`. At that zoom a world is read by its outline and
      // its one big structure; a six-pixel bush is noise on the edge of it, and
      // not building it is most of what makes the far view cheap.
      tier: i < 3 ? "mid" : "near",
    });
  }

  // West to east, so overlapping sprites draw in a consistent order.
  return props.sort((a, b) => a.x - b.x);
}
