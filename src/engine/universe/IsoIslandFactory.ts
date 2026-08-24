import { createRandom, ditherIndex, range, toTexture } from "../shared";
import type { Texture } from "pixi.js";

/**
 * Isometric floating islands, generated rather than drawn.
 *
 * One shape function, three parts: an organic top face in true 2:1 iso
 * proportions, side walls with real thickness, and a rock underside that
 * tapers to a point. Every island on the hub comes from this with different
 * parameters — there is no per-chapter hand-plotted geometry here, only a
 * palette and a seed.
 */

export interface IsoIslandParams {
  /** Overall scale — roughly the top face's horizontal half-width, in px. */
  size: number;
  /** Top-face palette, light to dark. Picked per pixel by a dithered ramp. */
  topPalette: readonly number[];
  /** Wall + underside palette, light to dark. */
  rockPalette: readonly number[];
  /** Drives the organic edge noise. Same seed, same island. */
  edgeSeed: number;
  /** How far the tapered rock hangs below the walls, in px. */
  undersideLength: number;
}

export interface IsoIsland {
  texture: Texture;
  width: number;
  height: number;
  /** Where the top face's centre sits, in texture pixels. Plant things here. */
  topCenter: { x: number; y: number };
  /** The top face's footprint, for scaling a building or scattering props. */
  topBounds: { left: number; right: number; top: number; bottom: number };
  /** Surface y at each column (texture space) — the top face's own contour. -1 = no land there. */
  surface: Int32Array;
}

/** Light comes from the upper-left, consistently, across every island. */
const LIGHT_X = -1;
const LIGHT_Y = -1;

const WALL_HEIGHT_RATIO = 0.22;
const MARGIN = 3;

export function generateIsoIsland(params: IsoIslandParams): IsoIsland {
  const { size, topPalette, rockPalette, edgeSeed, undersideLength } = params;
  const rand = createRandom(edgeSeed >>> 0);

  // The organic edge: a base radius perturbed by a few off-frequency
  // harmonics (same idiom as the coast's `mound` form) plus a per-island
  // random phase, so no two islands read as stamped from the same die.
  const h1 = range(rand, 2.5, 3.5);
  const h2 = range(rand, 6, 8);
  const p1 = range(rand, 0, Math.PI * 2);
  const p2 = range(rand, 0, Math.PI * 2);
  const wobbleAmt = range(rand, 0.12, 0.2);

  const iso = 0.5; // 2:1 projection: vertical run is half the horizontal
  const bulge = 1.25; // headroom for the noisy radius to exceed the base

  const radiusAt = (theta: number): number => {
    const wobble =
      1 +
      wobbleAmt * Math.sin(theta * h1 + p1) +
      wobbleAmt * 0.6 * Math.sin(theta * h2 + p2);
    return size * Math.max(0.55, wobble);
  };

  const outerX = Math.ceil(size * bulge);
  const outerY = Math.ceil(size * bulge * iso);
  const width = outerX * 2 + 1;
  const cx = outerX;

  // --- Pass 1: the top face's shape, in offsets from its own centre -------
  // Scanned rather than inverse-projected: for every column, walk the
  // vertical span and keep whichever rows the squashed radius test passes.
  // This gives the per-column surface run for free — exactly what a
  // building or a prop needs to stand on.
  const topTopOff = new Int32Array(width).fill(1_000_000);
  const topBottomOff = new Int32Array(width).fill(-1_000_000);

  for (let x = 0; x < width; x++) {
    const dx = x - cx;
    for (let oy = -outerY; oy <= outerY; oy++) {
      const dy = oy / iso;
      const theta = Math.atan2(dy, dx);
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r <= radiusAt(theta)) {
        if (oy < topTopOff[x]) topTopOff[x] = oy;
        if (oy > topBottomOff[x]) topBottomOff[x] = oy;
      }
    }
  }

  let left = -1;
  let right = -1;
  let boundsTopOff = 1_000_000;
  let boundsBottomOff = -1_000_000;
  for (let x = 0; x < width; x++) {
    if (topBottomOff[x] < topTopOff[x]) continue; // empty column
    if (left < 0) left = x;
    right = x;
    boundsTopOff = Math.min(boundsTopOff, topTopOff[x]);
    boundsBottomOff = Math.max(boundsBottomOff, topBottomOff[x]);
  }

  // --- Final layout: content-tight, no dead space between the parts -------
  const capRowOf = (oy: number) => oy - boundsTopOff + MARGIN;
  const capHeight = boundsBottomOff - boundsTopOff + 1;
  const wallTopRow = MARGIN + capHeight; // right under the lowest visible cap row
  const wallHeight = Math.max(3, Math.round(size * WALL_HEIGHT_RATIO));
  const undersideTopRow = wallTopRow + wallHeight;
  const height = undersideTopRow + undersideLength + MARGIN;

  const topTop = new Int32Array(width).fill(-1);
  const topBottom = new Int32Array(width).fill(-1);
  for (let x = left; x <= right; x++) {
    if (topBottomOff[x] < topTopOff[x]) continue;
    topTop[x] = capRowOf(topTopOff[x]);
    topBottom[x] = capRowOf(topBottomOff[x]);
  }

  // --- Walls: dropped from each column's own lowest cap row ---------------
  // Following the ragged bottom edge column by column, not a rectangle
  // under the bounding box — an organic blob wants an organic wall.
  const wallLeft = left;
  const wallRight = right;
  const halfSpan = Math.max(1, (wallRight - wallLeft) / 2);

  // --- Underside: tapers from the wall's footprint to a jagged point ------
  // Eased so it holds its width a while before narrowing — a linear taper
  // reads as a wedge, not as rock — and broken up with layered noise so the
  // silhouette is torn rather than a clean triangle.
  const u1 = range(rand, 3, 5);
  const u2 = range(rand, 8, 11);
  const up1 = range(rand, 0, Math.PI * 2);
  const up2 = range(rand, 0, Math.PI * 2);
  const jag = new Float32Array(width);
  for (let x = 0; x < width; x++) jag[x] = range(rand, -1, 1);

  const underHalfWidthAt = (row: number): number => {
    const t = Math.min(1, row / Math.max(1, undersideLength));
    return halfSpan * Math.pow(1 - t, 1.7);
  };

  const paint = (pixels: Uint8ClampedArray) => {
    const set = (x: number, y: number, color: number) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const o = (y * width + x) * 4;
      pixels[o] = (color >> 16) & 0xff;
      pixels[o + 1] = (color >> 8) & 0xff;
      pixels[o + 2] = color & 0xff;
      pixels[o + 3] = 255;
    };

    // Top face: dithered ramp across the whole blob, lit upper-left.
    for (let x = left; x <= right; x++) {
      if (topTop[x] < 0) continue;
      for (let y = topTop[x]; y <= topBottom[x]; y++) {
        const nx = (x - cx) / Math.max(1, outerX);
        const ny = (y - topTop[x] - capHeight / 2) / Math.max(1, capHeight / 2);
        const lightVal = 0.5 - 0.35 * (nx * LIGHT_X + ny * LIGHT_Y);
        const tone = ditherIndex(lightVal, topPalette.length, x, y);
        set(x, y, topPalette[tone]);
      }
    }

    // Walls: each column drops from its own cap row, so the top edge of the
    // wall traces the same ragged line the top face ends on. Shaded by
    // column position — left of centre is the near-lit face, right of
    // centre the far, shadowed one, which is the cue that reads as "iso".
    for (let x = wallLeft; x <= wallRight; x++) {
      if (topBottom[x] < 0) continue;
      const start = topBottom[x] + 1;
      const end = Math.min(height, wallTopRow + wallHeight);
      for (let y = start; y < end; y++) {
        const side = (x - cx) / halfSpan;
        const lightVal = 0.55 - 0.4 * side;
        const tone = ditherIndex(lightVal, rockPalette.length, x, y);
        set(x, y, rockPalette[tone]);
      }
    }

    // Underside: a rocky taper, not a wedge — the half-width at each row is
    // the eased base minus a ridge of noise, and a per-column jag pulls the
    // centre line off-axis so the point doesn't land dead centre.
    for (let row = 0; row < undersideLength; row++) {
      const y = undersideTopRow + row;
      const base = underHalfWidthAt(row);
      if (base < 0.5) continue;
      const depth = row / Math.max(1, undersideLength);
      const drift = jag[Math.min(width - 1, Math.max(0, Math.round(cx + (row % 7) - 3)))] * 2 * depth;

      for (let x = wallLeft; x <= wallRight; x++) {
        const dx = x - cx - drift;
        const noise =
          1 +
          0.22 * Math.sin(dx * 0.5 + row * u1 * 0.08 + up1) +
          0.14 * Math.sin(dx * 1.1 - row * u2 * 0.05 + up2);
        const edge = base * Math.max(0.15, noise);
        if (Math.abs(dx) > edge) continue;

        const side = dx / halfSpan;
        const lightVal = 0.6 - 0.35 * side - 0.35 * depth;
        const tone = ditherIndex(lightVal, rockPalette.length, x, y);
        set(x, y, rockPalette[tone]);
      }
    }
  };

  const texture = toTexture(width, height, paint, "IsoIsland");

  const surface = new Int32Array(width).fill(-1);
  for (let x = 0; x < width; x++) surface[x] = topTop[x];

  return {
    texture,
    width,
    height,
    topCenter: { x: cx, y: MARGIN + capHeight / 2 },
    topBounds: { left, right, top: MARGIN, bottom: MARGIN + capHeight },
    surface,
  };
}

/** A stable seed from a string, for callers that want to key off a chapter id. */
export function seedFrom(id: string): number {
  let seed = 0x9e37;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  return seed;
}
