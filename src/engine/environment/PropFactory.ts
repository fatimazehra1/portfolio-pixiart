import { CanvasSource, Texture } from "pixi.js";
import { PropView, type PropTextures, type ToneTextures } from "./Prop";
import { FLICKER, PROP_KINDS, type PropKind } from "./EnvironmentConfig";

/**
 * The prop workshop: every drawing on this shore, and the pool of sprites that
 * shows them.
 *
 * # Reusable, not one-off
 * A variant is baked *once*, the first time anything asks for it, and every
 * instance of it thereafter shares those textures. Two hundred tufts of grass
 * are two hundred positions and five drawings — which is the whole reason a
 * world this size fits in memory, and why adding another thousand props costs
 * almost nothing.
 *
 * # What's plotted and what's grown
 * Same split the ground uses, for the same reason. Small structured things —
 * rocks, flowers, driftwood, benches, signs, lamps, fencing — are *hand-plotted
 * bitmaps*, because at six pixels across a shape has to be placed pixel by pixel
 * or it turns to mush. Organic masses — trees, bushes, grass — are *grown*,
 * because what they need is endless variation rather than exact control
 * (ART_DIRECTION.md §Trees: wind-shaped, uneven, no perfect circles).
 *
 * TODO(assets): everything is drawn in code because `public/assets/props/` is
 * empty. `textures()` is the only seam that cares — authored art drops in there
 * without the generator, the pool or the animation knowing anything changed.
 */

// --- Plumbing ----------------------------------------------------------------

/** A deterministic little generator, so a grown prop grows the same way twice. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const range = (rand: () => number, min: number, max: number) => min + rand() * (max - min);
const rangeInt = (rand: () => number, min: number, max: number) =>
  Math.floor(range(rand, min, max + 1));
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60,
  28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47,
  7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

/** Quantise a smooth falloff to a few levels and dither the steps. */
function ditherAlpha(value: number, levels: number, x: number, y: number): number {
  const p = clamp01(value) * (levels - 1);
  const floor = Math.floor(p);
  const threshold = (BAYER_8[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
  const index = Math.min(levels - 1, p - floor > threshold ? floor + 1 : floor);
  return Math.round((index / (levels - 1)) * 255);
}

/** White RGB with a per-pixel alpha mask — every shape here is tinted at runtime. */
function maskToTexture(width: number, height: number, mask: Uint8Array): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Environment: 2D canvas context unavailable");

  const image = new ImageData(width, height);
  for (let i = 0; i < mask.length; i++) {
    const o = i * 4;
    image.data[o] = 255;
    image.data[o + 1] = 255;
    image.data[o + 2] = 255;
    image.data[o + 3] = mask[i];
  }
  ctx.putImageData(image, 0, 0);

  return new Texture({
    source: new CanvasSource({
      resource: canvas,
      scaleMode: "nearest",
      antialias: false,
      autoGenerateMipmaps: false,
    }),
  });
}

/** Three masks being filled in together. */
interface Tones {
  base: Uint8Array;
  light: Uint8Array;
  dark: Uint8Array;
}

const makeTones = (size: number): Tones => ({
  base: new Uint8Array(size),
  light: new Uint8Array(size),
  dark: new Uint8Array(size),
});

const bakeTones = (width: number, height: number, tones: Tones): ToneTextures => ({
  base: maskToTexture(width, height, tones.base),
  light: maskToTexture(width, height, tones.light),
  dark: maskToTexture(width, height, tones.dark),
});

// --- Hand-plotted bitmaps ----------------------------------------------------

/**
 * `.` empty · `X` body · `o` lit · `#` shadowed · `*` flame.
 *
 * Light comes from the upper left throughout — the one convention everything on
 * this shore already agrees on, from the cloud tops to the lighthouse.
 */
const BITMAPS: Record<string, readonly (readonly string[])[]> = {
  rock: [
    // Low and wide.
    [".oo..", "oXXX#", "#####"],
    // The big one, with a shoulder.
    ["..ooo..", ".oXXXX.", "oXXXXX#", "#######"],
    // A pebble.
    [".o.", "oX#", "##."],
    // Upright, half-buried.
    ["..oo..", ".oXXX#", "oXXXXX#", "#######"],
  ],

  flower: [
    // An open head on a short stem.
    [".o.", "oXo", ".#.", ".#."],
    // Taller, fuller head.
    [".o.", "oXo", ".o.", ".#.", ".#."],
    // A tight bud, not yet open.
    ["oo", "oX", ".#", ".#"],
    // Long-stemmed, nodding.
    [".oo", "oXo", ".X.", ".#.", ".#.", ".#."],
  ],

  driftwood: [
    // A long bleached plank, split at one end.
    ["..oooooo...", ".oXXXXXXo#.", "..##..###.."],
    // A shorter, thicker log.
    [".oooooo.", "oXXXXXX#", ".#####.."],
    // A tangle, half-sunk in the sand.
    ["...ooooo..", "..oXXXXXo.", ".oXXXXX#..", "..###....."],
  ],

  fence: [
    // A post carrying two rails.
    [
      ".o........",
      ".X........",
      ".X........",
      "oXoooooooo",
      "#X########",
      ".X........",
      "oXoooooooo",
      "#X########",
      ".X........",
      ".X........",
      ".#........",
    ],
    // The same run, weathered: a shorter post and a broken lower rail.
    [
      "..........",
      ".o........",
      ".X........",
      "oXoooooooo",
      "#X########",
      ".X........",
      "oXoooo.oo.",
      "#X###...#.",
      ".X........",
      ".X........",
      ".#........",
    ],
    // A post that has given up and leant into the wind.
    [
      "..........",
      "..o.......",
      "..X.......",
      ".oXoooooo.",
      ".#X#######",
      ".oX.......",
      "oXoooooooo",
      "#X########",
      ".X........",
      ".X........",
      ".#........",
    ],
  ],

  bench: [
    // Slatted back, facing the water.
    [
      "..oooooooooo..",
      "..XXXXXXXXXX..",
      "..##########..",
      "..#........#..",
      "..#........#..",
      "oooooooooooooo",
      "XXXXXXXXXXXXXX",
      "##############",
      ".#..........#.",
      ".#..........#.",
      ".#..........#.",
    ],
    // A plain plank seat, no back. Older, and lower.
    ["oooooooooo", "XXXXXXXXXX", "##########", ".#......#.", ".#......#.", ".#......#."],
  ],

  signPost: [
    // A board on a post.
    [
      "oooooooo",
      "oXXXXXX#",
      "oXXXXXX#",
      "oXXXXXX#",
      "########",
      "...oX#..",
      "...oX#..",
      "...oX#..",
      "...oX#..",
      "...oX#..",
      "...oX#..",
      "...##...",
    ],
    // A fingerpost, pointing on down the shore.
    [
      "ooooooo.",
      "oXXXXXXo",
      "oXXXXXX#",
      "#######.",
      "..oX#...",
      "..oX#...",
      "..oX#...",
      "..oX#...",
      "..oX#...",
      "..oX#...",
      "..##....",
    ],
  ],

  streetLamp: [
    // Cast iron, with a glazed head.
    [
      "..oXo..",
      ".oXXX#.",
      "oX***X#",
      "oX***X#",
      "oX***X#",
      ".#XXX#.",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      ".oXXX#.",
      "oXXXXX#",
      "#######",
    ],
    // A shorter one, the sort that stands at a corner.
    [
      "..oXo..",
      ".oXXX#.",
      "oX***X#",
      "oX***X#",
      ".#XXX#.",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      "..oX#..",
      ".oXXX#.",
      "oXXXXX#",
      "#######",
    ],
  ],
};

/** Bake a hand-plotted bitmap into its tone masks, plus a flame if it has one. */
function bakeBitmap(rows: readonly string[]): PropTextures {
  const height = rows.length;
  const width = Math.max(...rows.map((row) => row.length));
  const tones = makeTones(width * height);

  let flame: Uint8Array | null = null;
  let lightY: number | undefined;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const cell = rows[y][x];
      if (cell === ".") continue;

      const i = y * width + x;

      if (cell === "*") {
        if (!flame) flame = new Uint8Array(width * height);
        flame[i] = 255;
        // The light comes from the middle of whatever is burning.
        lightY = height - y;
        continue;
      }

      tones.base[i] = 255;
      if (cell === "o") tones.light[i] = 255;
      else if (cell === "#") tones.dark[i] = 255;
    }
  }

  return {
    body: bakeTones(width, height, tones),
    flame: flame ? maskToTexture(width, height, flame) : undefined,
    lightY,
    width,
    height,
  };
}

// --- Grown props -------------------------------------------------------------

/** Roughen an outline so nothing has a drawn-with-a-compass edge. */
function roughen(mask: Uint8Array, w: number, h: number, rand: () => number, chance: number) {
  const snapshot = mask.slice();
  const filled = (x: number, y: number) =>
    x < 0 || y < 0 || x >= w || y >= h ? 0 : snapshot[y * w + x];

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w; x++) {
      if (!snapshot[y * w + x]) continue;
      const exposed =
        !filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1);
      if (exposed && rand() < chance) mask[y * w + x] = 0;
    }
  }
}

/**
 * Light a solid mass from the upper left and shade it underneath.
 *
 * The same three-tone treatment every leafy thing here gets: a lit crown deeper
 * on the left flank, shadow gathering along the bottom, and the odd tip standing
 * proud of the mass so the silhouette never closes into a blob.
 */
function shadeMass(
  mask: Uint8Array,
  tones: Tones,
  w: number,
  h: number,
  rand: () => number,
  options: { litDepth: number; shadeDepth: number; tips: number }
): void {
  for (let x = 0; x < w; x++) {
    let top = -1;
    let bottom = -1;
    for (let y = 0; y < h; y++) {
      if (mask[y * w + x]) {
        if (top === -1) top = y;
        bottom = y;
      }
    }
    if (top === -1) continue;

    for (let y = top; y <= bottom; y++) {
      if (mask[y * w + x]) tones.base[y * w + x] = 255;
    }

    const lit = Math.max(1, Math.round(h * options.litDepth)) + (x < w * 0.45 ? 1 : 0);
    for (let y = top; y < Math.min(top + lit, bottom + 1); y++) {
      if (mask[y * w + x]) tones.light[y * w + x] = 255;
    }

    const shade = Math.max(1, Math.round(h * options.shadeDepth));
    for (let y = Math.max(top, bottom - shade + 1); y <= bottom; y++) {
      if (mask[y * w + x]) tones.dark[y * w + x] = 255;
    }

    if (top > 0 && rand() < options.tips) {
      tones.base[(top - 1) * w + x] = 255;
      tones.light[(top - 1) * w + x] = 255;
    }
  }
}

/** Coastal scrub: overlapping blobs leaning whichever way the wind has pushed. */
function growBush(width: number, height: number, rand: () => number): PropTextures {
  const w = Math.max(6, width);
  const h = Math.max(5, height);
  const mask = new Uint8Array(w * h);

  const lean = range(rand, -0.16, 0.16);
  const blobs = rangeInt(rand, 3, 5);

  for (let i = 0; i < blobs; i++) {
    const spread = blobs === 1 ? 0.5 : i / (blobs - 1);
    const prominence = 1 - Math.abs(spread - (0.5 + lean)) * 1.4;

    const cx = w * (0.18 + 0.64 * spread) + range(rand, -w * 0.06, w * 0.06);
    const rx = w * range(rand, 0.2, 0.34);
    const ry = h * (0.3 + 0.34 * Math.max(0, prominence)) * range(rand, 0.85, 1.1);
    const cy = h - 1 - ry * range(rand, 0.45, 0.8);

    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(h - 1, Math.ceil(cy + ry)); y++) {
      const dy = (y + 0.5 - cy) / ry;
      for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(w - 1, Math.ceil(cx + rx)); x++) {
        const dx = (x + 0.5 - cx) / rx;
        if (dx * dx + dy * dy <= 1) mask[y * w + x] = 1;
      }
    }
  }

  roughen(mask, w, h, rand, 0.2);

  const tones = makeTones(w * h);
  shadeMass(mask, tones, w, h, rand, { litDepth: 0.22, shadeDepth: 0.2, tips: 0.22 });

  return { body: bakeTones(w, h, tones), width: w, height: h };
}

/**
 * A coastal tree: a leaning trunk and a canopy shaped by the wind.
 *
 * Trunk and canopy are baked into *separate* mask sets. That is what lets the
 * leaves move while the trunk stands still, and it costs three extra textures
 * per variant rather than three per tree (ART_DIRECTION.md §Animation Rules —
 * everything should breathe, subtly).
 */
function growTree(width: number, height: number, rand: () => number): PropTextures {
  const w = Math.max(12, width);
  const h = Math.max(16, height);

  const trunkMask = new Uint8Array(w * h);
  const crownMask = new Uint8Array(w * h);

  // Which way this one has spent its life being pushed.
  const lean = range(rand, -0.22, 0.22);
  // Most of the tree is trunk. A canopy that starts halfway down reads as a
  // bush on a stick — coastal trees carry their crown high, which is what
  // gives them a silhouette worth having against the sea.
  const trunkHeight = Math.round(h * range(rand, 0.54, 0.66));
  const trunkWidth = Math.max(2, Math.round(w * range(rand, 0.1, 0.15)));
  const rootX = w / 2 - lean * w * 0.18;

  for (let i = 0; i < trunkHeight; i++) {
    const y = h - 1 - i;
    const t = i / Math.max(1, trunkHeight - 1);
    // Curves rather than tilts: a straight leaning trunk reads as a fallen one.
    const cx = rootX + lean * w * 0.45 * t * t;
    const thickness = Math.max(1, Math.round(trunkWidth * (1 - t * 0.45)));

    for (let d = 0; d < thickness; d++) {
      const x = Math.round(cx - thickness / 2) + d;
      if (x >= 0 && x < w) trunkMask[y * w + x] = 1;
    }
  }

  // The canopy sits on top of the trunk and is blown the same way.
  const crownCx = rootX + lean * w * 0.45;
  const crownCy = h - trunkHeight - Math.round(h * 0.08);
  const blobs = rangeInt(rand, 4, 6);

  for (let i = 0; i < blobs; i++) {
    const angle = (i / blobs) * Math.PI * 2 + range(rand, -0.4, 0.4);
    const spread = range(rand, 0.25, 0.62);
    const cx = crownCx + Math.cos(angle) * w * spread * 0.5 + lean * w * 0.1;
    const cy = crownCy + Math.sin(angle) * h * spread * 0.2;
    const rx = w * range(rand, 0.22, 0.34);
    const ry = h * range(rand, 0.11, 0.18);

    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(h - 1, Math.ceil(cy + ry)); y++) {
      const dy = (y + 0.5 - cy) / ry;
      for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(w - 1, Math.ceil(cx + rx)); x++) {
        const dx = (x + 0.5 - cx) / rx;
        if (dx * dx + dy * dy <= 1) crownMask[y * w + x] = 1;
      }
    }
  }

  roughen(crownMask, w, h, rand, 0.22);

  const trunkTones = makeTones(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (!trunkMask[y * w + x]) continue;
      const i = y * w + x;
      trunkTones.base[i] = 255;
      // Bark: lit down one side, shadowed down the other.
      const leftEdge = x === 0 || !trunkMask[i - 1];
      const rightEdge = x === w - 1 || !trunkMask[i + 1];
      if (leftEdge) trunkTones.light[i] = 255;
      else if (rightEdge) trunkTones.dark[i] = 255;
    }
  }

  const crownTones = makeTones(w * h);
  shadeMass(crownMask, crownTones, w, h, rand, {
    litDepth: 0.16,
    shadeDepth: 0.14,
    tips: 0.26,
  });

  return {
    body: bakeTones(w, h, trunkTones),
    crown: bakeTones(w, h, crownTones),
    width: w,
    height: h,
  };
}

/**
 * A tuft of tall grass: blades from a common root, each leaning its own way.
 *
 * Drawn blade by blade rather than as a mass, because grass is the one thing on
 * the shore whose silhouette is made of gaps.
 */
function growGrass(width: number, height: number, rand: () => number): PropTextures {
  const w = Math.max(4, width);
  const h = Math.max(4, height);
  const tones = makeTones(w * h);

  const blades = rangeInt(rand, 4, 7);
  const lean = range(rand, -0.5, 0.5);

  for (let i = 0; i < blades; i++) {
    const rootX = Math.round(range(rand, 1, w - 2));
    const length = Math.round(h * range(rand, 0.5, 1));
    const bend = lean + range(rand, -0.35, 0.35);

    for (let step = 0; step < length; step++) {
      const t = step / Math.max(1, length - 1);
      const x = Math.round(rootX + bend * t * t * w * 0.5);
      const y = h - 1 - step;
      if (x < 0 || x >= w || y < 0) continue;

      const idx = y * w + x;
      tones.base[idx] = 255;
      // The tip catches the light; the root sits in the shade of the tuft.
      if (t > 0.75) tones.light[idx] = 255;
      else if (t < 0.25) tones.dark[idx] = 255;
    }
  }

  return { body: bakeTones(w, h, tones), width: w, height: h };
}

/** Sizes for the grown kinds, one per variant. Variety comes from here. */
const GROWN_SIZES: Partial<Record<PropKind, readonly (readonly [number, number])[]>> = {
  tree: [
    [26, 34],
    [32, 42],
    [22, 28],
    [34, 46],
  ],
  bush: [
    [13, 9],
    [10, 7],
    [16, 10],
    [19, 12],
    [8, 6],
  ],
  tallGrass: [
    [7, 8],
    [9, 10],
    [6, 6],
    [11, 12],
    [8, 9],
  ],
};

/** A soft round glow, for the light a lamp throws. */
function createGlowTexture(radius: number): Texture {
  const r = Math.max(2, Math.round(radius));
  const size = r * 2;
  const mask = new Uint8Array(size * size);

  for (let y = 0; y < size; y++) {
    const dy = (y + 0.5 - r) / r;
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - r) / r;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      mask[y * size + x] = ditherAlpha((1 - d) ** 2, 5, x, y);
    }
  }

  return maskToTexture(size, size, mask);
}

// --- The factory -------------------------------------------------------------

export interface PropFactoryOptions {
  /** The world's seed. Grown props are grown from it. */
  seed: number;
}

/**
 * Bakes drawings on demand, caches them forever, and lends out sprites.
 *
 * Two responsibilities that belong together because they are both about *not
 * making things twice*: one drawing per variant however many instances exist,
 * and one sprite per visible prop however many props exist.
 */
export class PropFactory {
  private readonly seed: number;
  private readonly cache = new Map<string, PropTextures>();
  private readonly pool: PropView[] = [];

  private glow: Texture | null = null;
  private issued = 0;

  constructor(options: PropFactoryOptions) {
    this.seed = options.seed;
  }

  // --- Queries ---------------------------------------------------------------

  /** How many views are currently out on loan. The count of visible props. */
  get active(): number {
    return this.issued;
  }

  /** How many views exist in total — the high-water mark of what was visible. */
  get pooled(): number {
    return this.pool.length + this.issued;
  }

  /** How many distinct drawings have been baked. */
  get baked(): number {
    return this.cache.size;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * The drawing for one variant of one kind, baked on first ask and shared
   * thereafter.
   */
  textures(kind: PropKind, variant: number): PropTextures {
    const key = `${kind}:${variant}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const built = this.build(kind, variant);
    this.cache.set(key, built);
    return built;
  }

  /** The glow a lamp throws. One texture, shared by every lamp in the world. */
  glowTexture(): Texture {
    if (!this.glow) this.glow = createGlowTexture(FLICKER.glowRadius);
    return this.glow;
  }

  /** Borrow a view. Recycled if one is free, made if not. */
  acquire(): PropView {
    this.issued++;
    return this.pool.pop() ?? new PropView();
  }

  /** Give a view back. It keeps its sprites, ready for the next prop. */
  release(view: PropView): void {
    view.release();
    this.issued--;
    this.pool.push(view);
  }

  destroy(): void {
    for (const view of this.pool) view.destroy();
    this.pool.length = 0;
    this.issued = 0;

    for (const textures of this.cache.values()) {
      for (const tone of [textures.body, textures.crown]) {
        if (!tone) continue;
        tone.base.destroy(true);
        tone.light.destroy(true);
        tone.dark.destroy(true);
      }
      textures.flame?.destroy(true);
    }
    this.cache.clear();

    this.glow?.destroy(true);
    this.glow = null;
  }

  // --- Internal --------------------------------------------------------------

  private build(kind: PropKind, variant: number): PropTextures {
    const sizes = GROWN_SIZES[kind];

    if (sizes) {
      const [width, height] = sizes[variant % sizes.length];
      // Seeded per kind and variant, so a bush is the same bush in every world
      // built from the same seed, and never the same bush as its neighbour.
      const rand = createRandom(this.seed + PROP_KINDS.indexOf(kind) * 977 + variant * 31);

      if (kind === "tree") return growTree(width, height, rand);
      if (kind === "tallGrass") return growGrass(width, height, rand);
      return growBush(width, height, rand);
    }

    const bitmaps = BITMAPS[kind];
    if (!bitmaps) throw new Error(`Environment: no drawing for prop kind "${kind}"`);
    return bakeBitmap(bitmaps[variant % bitmaps.length]);
  }
}
