import type { Texture } from "pixi.js";
import { ditherAlpha, maskToTexture as bakeMask } from "../shared";
import { range, rangeInt } from "./random";

/**
 * Procedural and hand-plotted pixel-art texture factory for the ground.
 *
 * Same discipline as the sky and the sea: hard edges, no anti-aliasing,
 * `scaleMode: "nearest"`, baked at the size they're drawn and never scaled.
 *
 * The split here is deliberate. Small graphic objects — rocks, flowers,
 * driftwood, fence sections — are *hand-plotted bitmaps*, because at five or
 * six pixels across a shape has to be placed pixel by pixel or it turns to
 * mush. Organic masses — bushes, mottled terrain, cobbles — are generated,
 * because what they need is endless variation rather than exact control.
 *
 * TODO(assets): everything is drawn in code because `public/assets/props/` is
 * empty. Every layer accepts textures from outside, so authored art drops in
 * without code changes.
 */

// --- Baking ------------------------------------------------------------------

/**
 * Bake with the ground's name on any failure.
 *
 * A thin alias over `@/engine/shared` — the implementation is shared by every
 * system in the engine; only the label on a context-creation failure is local.
 */
export function maskToTexture(width: number, height: number, mask: Uint8Array): Texture {
  return bakeMask(width, height, mask, "Ground");
}

// --- Edges -------------------------------------------------------------------

/**
 * An uneven boundary line across the world.
 *
 * A long sine looks drawn with a compass and a pure random walk looks like
 * static; together they read as a coastline. Every band edge on the shore comes
 * from this, which is why nothing in the ground has a straight horizontal seam.
 */
export function makeEdge(
  width: number,
  baseY: number,
  wobble: number,
  roughness: number,
  rand: () => number
): Int16Array {
  const edge = new Int16Array(width);
  const phase = rand() * Math.PI * 2;
  const phase2 = rand() * Math.PI * 2;

  let walk = 0;
  for (let x = 0; x < width; x++) {
    const swell =
      Math.sin((x / width) * Math.PI * 2 * 1.6 + phase) * wobble +
      Math.sin((x / width) * Math.PI * 2 * 4.3 + phase2) * wobble * 0.45;

    if (rand() < 0.3) walk += rand() < 0.5 ? -1 : 1;
    walk = Math.max(-roughness, Math.min(roughness, walk));

    edge[x] = Math.round(baseY + swell + walk);
  }

  return edge;
}

// --- Terrain -----------------------------------------------------------------

/** A band of ground: its body, plus lighter and darker mottling to break it up. */
export interface BandTextures {
  base: Texture;
  light: Texture;
  dark: Texture;
  width: number;
  height: number;
}

/**
 * Fill a band between two uneven edges and mottle it.
 *
 * The mottling is what stops a large flat area of sand or grass reading as a
 * coloured rectangle. It's low-frequency patches rather than per-pixel noise —
 * noise looks like dirt on the screen, patches look like ground.
 */
function fillBand(
  width: number,
  height: number,
  top: Int16Array,
  bottom: Int16Array | null,
  rand: () => number,
  options: { patchScale: number; lightAmount: number; darkAmount: number }
): BandTextures {
  const base = new Uint8Array(width * height);
  const light = new Uint8Array(width * height);
  const dark = new Uint8Array(width * height);

  const seedA = rand() * 100;
  const seedB = rand() * 100;
  const { patchScale, lightAmount, darkAmount } = options;

  for (let x = 0; x < width; x++) {
    const from = Math.max(0, top[x]);
    const to = bottom ? Math.min(height - 1, bottom[x]) : height - 1;

    for (let y = from; y <= to; y++) {
      const i = y * width + x;
      base[i] = 255;

      // Two beating frequencies: patches, not stripes and not static.
      const field =
        Math.sin(x / patchScale + seedA) * Math.cos(y / (patchScale * 0.55) + seedB) +
        Math.sin(x / (patchScale * 2.7) + seedB) * 0.6;

      if (field > 0.55) light[i] = ditherAlpha((field - 0.55) * lightAmount, 3, x, y);
      else if (field < -0.5) dark[i] = ditherAlpha((-field - 0.5) * darkAmount, 3, x, y);
    }
  }

  return {
    base: maskToTexture(width, height, base),
    light: maskToTexture(width, height, light),
    dark: maskToTexture(width, height, dark),
    width,
    height,
  };
}

/** Sand: mottled, with a scatter of brighter grains catching the light. */
export function createSandBand(
  width: number,
  height: number,
  top: Int16Array,
  bottom: Int16Array | null,
  rand: () => number
): BandTextures {
  const band = fillBand(width, height, top, bottom, rand, {
    patchScale: 11,
    lightAmount: 1.1,
    darkAmount: 0.75,
  });
  return band;
}

/**
 * Grass, with tufts standing along its upper edge.
 *
 * The tufts matter more than they sound: a grass band that meets sand along a
 * clean line reads as two flat colours butted together, whereas a few blades
 * breaking upward over the boundary reads as one growing into the other.
 */
export function createGrassBand(
  width: number,
  height: number,
  top: Int16Array,
  rand: () => number
): BandTextures {
  const base = new Uint8Array(width * height);
  const light = new Uint8Array(width * height);
  const dark = new Uint8Array(width * height);

  const seedA = rand() * 100;
  const seedB = rand() * 100;

  for (let x = 0; x < width; x++) {
    const from = Math.max(0, top[x]);

    for (let y = from; y < height; y++) {
      const i = y * width + x;
      base[i] = 255;

      const field =
        Math.sin(x / 9 + seedA) * Math.cos(y / 6 + seedB) +
        Math.sin(x / 23 + seedB) * 0.7 +
        Math.sin(y / 4.5 + seedA) * 0.25;

      if (field > 0.6) light[i] = ditherAlpha((field - 0.6) * 1.2, 3, x, y);
      else if (field < -0.55) dark[i] = ditherAlpha((-field - 0.55) * 0.9, 3, x, y);
    }

    // Blades breaking upward over the boundary.
    if (rand() < 0.34) {
      const blade = rangeInt(rand, 1, 2);
      for (let d = 1; d <= blade; d++) {
        const y = from - d;
        if (y >= 0) {
          base[y * width + x] = 255;
          if (d === blade) light[y * width + x] = 210;
        }
      }
    }
  }

  return {
    base: maskToTexture(width, height, base),
    light: maskToTexture(width, height, light),
    dark: maskToTexture(width, height, dark),
    width,
    height,
  };
}

/** The surf line: a broken bright edge where the water runs up the sand. */
export function createSurfTexture(
  width: number,
  height: number,
  edge: Int16Array,
  rand: () => number
): Texture {
  const mask = new Uint8Array(width * height);

  let x = 0;
  while (x < width) {
    const run = rangeInt(rand, 5, 18);
    const gap = rangeInt(rand, 2, 9);

    for (let i = 0; i < run && x < width; i++, x++) {
      const y = edge[x];
      if (y >= 0 && y < height) mask[y * width + x] = 255;
      // The odd pixel of froth further up the sand.
      if (rand() < 0.22 && y + 1 < height) mask[(y + 1) * width + x] = 130;
    }

    x += gap;
  }

  return maskToTexture(width, height, mask);
}

// --- Stone path --------------------------------------------------------------

export interface PathTextures {
  /** The cobbles themselves. */
  stone: Texture;
  /** Lit top edges. */
  light: Texture;
  /** Joints, cracks and the shadowed lower edges. */
  dark: Texture;
  /** Grass pushing up between the stones. */
  weeds: Texture;
  width: number;
  height: number;
}

/**
 * An old stone path: uneven cobbles, mortar joints, cracks, and grass finding
 * its way through the gaps (ART_DIRECTION.md §Roads).
 *
 * Cobbles are laid in rows of varying width with the joints offset row to row,
 * the way a real path is laid — a grid of identical squares is the one thing
 * that would make this read as tile rather than stone.
 */
export function createPathTextures(
  width: number,
  height: number,
  top: Int16Array,
  bottom: Int16Array,
  rand: () => number
): PathTextures {
  const stone = new Uint8Array(width * height);
  const light = new Uint8Array(width * height);
  const dark = new Uint8Array(width * height);
  const weeds = new Uint8Array(width * height);

  // Work out the rows first, so joints can be offset between them.
  const minTop = Math.min(...top);
  const maxBottom = Math.max(...bottom);
  const span = Math.max(2, maxBottom - minTop);
  const rows = Math.max(2, Math.round(span / 4));
  const rowHeight = span / rows;

  for (let row = 0; row < rows; row++) {
    const rowTop = minTop + row * rowHeight;
    const rowBottom = minTop + (row + 1) * rowHeight;

    // Offset each row's first joint so seams never line up down the path.
    let x = -rangeInt(rand, 0, 7);

    while (x < width) {
      const cobble = rangeInt(rand, 4, 9);
      const right = x + cobble;

      for (let px = Math.max(0, x); px < Math.min(width, right); px++) {
        // Only inside the path's own uneven upper and lower edges.
        const from = Math.max(top[px], Math.round(rowTop));
        const to = Math.min(bottom[px], Math.round(rowBottom) - 1);

        for (let py = from; py <= to; py++) {
          if (py < 0 || py >= height) continue;
          const i = py * width + px;
          stone[i] = 255;

          if (py === from) light[i] = 200;
          if (py === to) dark[i] = 170;
        }

        // The joint down the right-hand side of each cobble.
        if (px === Math.min(width, right) - 1) {
          for (let py = from; py <= to; py++) {
            if (py >= 0 && py < height) dark[py * width + px] = 210;
          }
        }
      }

      // Grass in the joint, now and then.
      if (rand() < 0.22) {
        const px = Math.min(width - 1, Math.max(0, right - 1));
        const py = Math.max(top[px], Math.round(rowTop));
        if (py >= 0 && py < height) weeds[py * width + px] = 255;
      }

      x = right;
    }
  }

  // A few cracks running across the stones.
  const cracks = Math.max(1, Math.round(width / 90));
  for (let c = 0; c < cracks; c++) {
    let px = rangeInt(rand, 0, width - 1);
    let py = Math.round(range(rand, minTop + 1, maxBottom - 1));
    const length = rangeInt(rand, 4, 11);

    for (let i = 0; i < length; i++) {
      if (px >= 0 && px < width && py >= 0 && py < height && stone[py * width + px]) {
        dark[py * width + px] = 235;
      }
      px += rand() < 0.75 ? 1 : 0;
      py += rand() < 0.4 ? (rand() < 0.5 ? -1 : 1) : 0;
    }
  }

  return {
    stone: maskToTexture(width, height, stone),
    light: maskToTexture(width, height, light),
    dark: maskToTexture(width, height, dark),
    weeds: maskToTexture(width, height, weeds),
    width,
    height,
  };
}

// --- Props -------------------------------------------------------------------

/**
 * A prop, as three tinted masks: body, lit face and shadowed face.
 *
 * Three tones is the whole vocabulary. It's enough to give a six-pixel rock a
 * light side and a dark side, and few enough that a shore full of props still
 * reads as one palette.
 */
export interface PropTextures {
  base: Texture;
  light: Texture;
  dark: Texture;
  width: number;
  height: number;
}

/**
 * Hand-plotted prop bitmaps.
 *
 * `.` empty · `X` body · `o` lit · `#` shadowed.
 *
 * Light comes from the upper left throughout, matching the sky's clouds — the
 * one convention everything on screen has to agree on.
 */
const PROP_BITMAPS: Record<string, readonly (readonly string[])[]> = {
  rock: [
    // Low and wide.
    [".oo..", "oXXX#", "#####"],
    // The big one, with a shoulder.
    ["..ooo..", ".oXXXX.", "oXXXXX#", "#######"],
    // A pebble.
    [".o.", "oX#", "##."],
  ],

  // Petals are `o`, the centre is `X`, the stem is `#`. Deliberately no leaves:
  // three tones can't carry petal, centre, stem *and* green all at once, and
  // the petal is the only part worth spending colour on at four pixels tall.
  flower: [
    // An open head on a short stem.
    [".o.", "oXo", ".#.", ".#."],
    // Taller, fuller head.
    [".o.", "oXo", ".o.", ".#.", ".#."],
    // A tight bud, not yet open.
    ["oo", "oX", ".#", ".#"],
  ],

  driftwood: [
    // A long bleached plank, split at one end.
    ["..oooooo...", ".oXXXXXXo#.", "..##..###.."],
    // A shorter, thicker log.
    [".oooooo.", "oXXXXXX#", ".#####.."],
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
  ],
};

/** Bake a hand-plotted bitmap into its three tinted masks. */
function bakeBitmap(rows: readonly string[]): PropTextures {
  const h = rows.length;
  const w = rows[0].length;

  const base = new Uint8Array(w * h);
  const light = new Uint8Array(w * h);
  const dark = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cell = rows[y][x];
      if (cell === ".") continue;

      const i = y * w + x;
      base[i] = 255;
      if (cell === "o") light[i] = 255;
      else if (cell === "#") dark[i] = 255;
    }
  }

  return {
    base: maskToTexture(w, h, base),
    light: maskToTexture(w, h, light),
    dark: maskToTexture(w, h, dark),
    width: w,
    height: h,
  };
}

/** All variants of a hand-plotted prop. */
export function createPropTextures(kind: keyof typeof PROP_BITMAPS): PropTextures[] {
  return PROP_BITMAPS[kind].map(bakeBitmap);
}

/**
 * A bush, grown rather than plotted.
 *
 * Coastal scrub is wind-shaped and never symmetrical (ART_DIRECTION.md §Trees),
 * so these are built from overlapping blobs leaning one way, roughened at the
 * edges, then lit from the upper left and given a scatter of leaf tips along
 * the top. Generated because what a bush needs is variation, not precision.
 */
export function createBushTextures(
  width: number,
  height: number,
  rand: () => number
): PropTextures {
  const w = Math.max(6, Math.round(width));
  const h = Math.max(5, Math.round(height));
  const mask = new Uint8Array(w * h);

  // Which way the wind has pushed it.
  const lean = range(rand, -0.16, 0.16);
  const blobs = rangeInt(rand, 3, 5);

  for (let i = 0; i < blobs; i++) {
    const spread = blobs === 1 ? 0.5 : i / (blobs - 1);
    const prominence = 1 - Math.abs(spread - (0.5 + lean)) * 1.4;

    const cx = w * (0.18 + 0.64 * spread) + range(rand, -w * 0.06, w * 0.06);
    const rx = w * range(rand, 0.2, 0.34);
    const ry = h * (0.3 + 0.34 * Math.max(0, prominence)) * range(rand, 0.85, 1.1);
    const cy = h - 1 - ry * range(rand, 0.45, 0.8);

    const x0 = Math.max(0, Math.floor(cx - rx));
    const x1 = Math.min(w - 1, Math.ceil(cx + rx));
    const y0 = Math.max(0, Math.floor(cy - ry));
    const y1 = Math.min(h - 1, Math.ceil(cy + ry));

    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / ry;
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx;
        if (dx * dx + dy * dy <= 1) mask[y * w + x] = 1;
      }
    }
  }

  // Roughen the outline so no bush has a drawn-with-a-compass edge.
  const snapshot = mask.slice();
  const filled = (x: number, y: number) =>
    x < 0 || y < 0 || x >= w || y >= h ? 0 : snapshot[y * w + x];

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w; x++) {
      if (!snapshot[y * w + x]) continue;
      const exposed =
        !filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1);
      if (exposed && rand() < 0.2) mask[y * w + x] = 0;
    }
  }

  const base = new Uint8Array(w * h);
  const light = new Uint8Array(w * h);
  const dark = new Uint8Array(w * h);

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
      if (mask[y * w + x]) base[y * w + x] = 255;
    }

    // Lit crown, deeper on the left flank where the light comes from.
    const litDepth = Math.max(1, Math.round(h * 0.22)) + (x < w * 0.45 ? 1 : 0);
    for (let y = top; y < Math.min(top + litDepth, bottom + 1); y++) {
      if (mask[y * w + x]) light[y * w + x] = 255;
    }

    // Shadow gathering underneath.
    const shadeDepth = Math.max(1, Math.round(h * 0.2));
    for (let y = Math.max(top, bottom - shadeDepth + 1); y <= bottom; y++) {
      if (mask[y * w + x]) dark[y * w + x] = 255;
    }

    // A leaf tip standing proud of the mass.
    if (top > 0 && rand() < 0.22) {
      base[(top - 1) * w + x] = 255;
      light[(top - 1) * w + x] = 255;
    }
  }

  return {
    base: maskToTexture(w, h, base),
    light: maskToTexture(w, h, light),
    dark: maskToTexture(w, h, dark),
    width: w,
    height: h,
  };
}
