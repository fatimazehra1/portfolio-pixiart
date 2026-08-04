import type { Texture } from "pixi.js";
import { ditherIndex, maskToTexture as bakeMask, toTexture as bakeTexture } from "../shared";
import { range, rangeInt } from "./random";
import { sampleGradient } from "./palette";
import type { GradientStop } from "./types";

/**
 * Procedural pixel-art texture factory for the sky.
 *
 * Every texture here is written pixel-by-pixel with hard edges and no
 * anti-aliasing, then uploaded with `scaleMode: "nearest"` — the sky is drawn at
 * a small internal resolution and scaled up by a whole number, so these pixels
 * survive to the screen exactly as authored (CLAUDE.md §Pixel Art Rules).
 *
 * Smooth ramps (gradient, haze, glow) are quantised to a handful of colours and
 * Bayer-dithered between them. That's what makes a pixel sky read as *smooth*
 * without ever becoming a blurry 24-bit gradient.
 *
 * TODO(assets): clouds, sun and moon are generated because no authored art
 * exists yet (public/assets/sky/ is empty). CloudLayer and CelestialBody both
 * accept textures from outside, so final art drops in without code changes.
 */

// --- Baking ------------------------------------------------------------------

/**
 * Bake with sky's name on any failure.
 *
 * Thin aliases over `@/engine/shared` — the implementation is shared by every
 * system in the engine; only the label on a context-creation failure is local.
 */
function toTexture(
  width: number,
  height: number,
  paint: (pixels: Uint8ClampedArray) => void
): Texture {
  return bakeTexture(width, height, paint, "Sky");
}

function maskToTexture(width: number, height: number, mask: Uint8Array): Texture {
  return bakeMask(width, height, mask, "Sky");
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** White RGB with a per-pixel alpha mask — the shape sprites we tint at runtime. */

// --- Sky gradient ------------------------------------------------------------

/**
 * The vertical sky ramp, baked at the sky's internal resolution.
 *
 * The ramp is first reduced to `bands` discrete colours, then each row picks
 * between its two neighbouring bands using the dither threshold — so the
 * transition between bands is a woven checker of two colours rather than a
 * blur. Reads smooth at a distance, stays pixel art up close.
 */
export function createGradientTexture(
  width: number,
  height: number,
  stops: readonly GradientStop[],
  bands: number
): Texture {
  const steps = Math.max(2, Math.floor(bands));

  // Pre-sample the ramp once, so the per-pixel loop is a lookup.
  const ramp = new Array<number>(steps);
  for (let i = 0; i < steps; i++) {
    ramp[i] = sampleGradient(stops, i / (steps - 1));
  }

  return toTexture(width, height, (pixels) => {
    for (let y = 0; y < height; y++) {
      const v = height === 1 ? 0 : y / (height - 1);
      for (let x = 0; x < width; x++) {
        const color = ramp[ditherIndex(v, steps, x, y)];
        const o = (y * width + x) * 4;
        pixels[o] = (color >> 16) & 0xff;
        pixels[o + 1] = (color >> 8) & 0xff;
        pixels[o + 2] = color & 0xff;
        pixels[o + 3] = 255;
      }
    }
  });
}

// --- Horizon haze ------------------------------------------------------------

/**
 * A white band whose alpha ramps from nothing to full over `fadeHeight` rows and
 * then holds — the thickening of the air as it approaches the horizon. Tinted at
 * runtime so it can follow the time of day without being rebaked.
 *
 * The ramp is deliberately bottom-weighted: a plain linear fade announces where
 * the band starts with a visible edge, whereas a curve that stays near nothing
 * for the first half and only gathers near the horizon reads as air rather than
 * as a gradient someone pasted on. Eight levels is the most dithering can carry
 * before the banding stops being legible as pixel art.
 */
export function createHazeTexture(width: number, height: number, fadeHeight: number): Texture {
  const fade = Math.max(1, Math.floor(fadeHeight));
  const mask = new Uint8Array(width * height);
  const levels = 8;

  for (let y = 0; y < height; y++) {
    const t = clamp01(y / fade);
    // Smoothstep twice, then bias low: a long, soft toe into a firm horizon.
    const smooth = t * t * (3 - 2 * t);
    const eased = smooth * smooth * (3 - 2 * smooth);
    for (let x = 0; x < width; x++) {
      mask[y * width + x] = Math.round((ditherIndex(eased, levels, x, y) / (levels - 1)) * 255);
    }
  }

  return maskToTexture(width, height, mask);
}

// --- Celestial bodies --------------------------------------------------------

/** A hard-edged filled circle, `radius` sky pixels. No anti-aliasing anywhere. */
export function createDiscTexture(radius: number): Texture {
  const r = Math.max(1, Math.round(radius));
  const size = r * 2;
  const mask = new Uint8Array(size * size);

  for (let y = 0; y < size; y++) {
    const dy = y + 0.5 - r;
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - r;
      if (dx * dx + dy * dy <= r * r) mask[y * size + x] = 255;
    }
  }

  return maskToTexture(size, size, mask);
}

export interface GlowOptions {
  /** Vertical halo radius in sky pixels. */
  radius: number;
  /** Radius held at full strength before the falloff begins. */
  coreRadius: number;
  /**
   * Horizontal stretch. Above 1 the halo spreads sideways, the way low sun
   * spreads along the haze. Baked into the texture — the sprite is never scaled.
   */
  aspect?: number;
  /** Quantisation steps. Few = graphic dithered rings; many = a blur. */
  levels?: number;
}

/**
 * A halo quantised into a handful of dithered rings.
 *
 * This is the difference between pixel-art light and a modern blur. A blur is a
 * smooth 256-step falloff; this is four steps, each boundary broken up by the
 * Bayer pattern into a scatter of individual pixels. Up close you can count the
 * rings and see the dither; from a normal viewing distance it reads as soft
 * light. Squaring the falloff keeps the brightness concentrated near the body,
 * so it reads as glow rather than fog.
 */
export function createGlowTexture(options: GlowOptions): Texture {
  const { radius, coreRadius, aspect = 1, levels = 4 } = options;

  const ry = Math.max(2, Math.round(radius));
  const rx = Math.max(2, Math.round(radius * aspect));
  const width = rx * 2;
  const height = ry * 2;
  const core = clamp01(coreRadius / radius);
  const mask = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const dy = (y + 0.5 - ry) / ry;
    for (let x = 0; x < width; x++) {
      const dx = (x + 0.5 - rx) / rx;
      // Normalised elliptical distance: 0 at the centre, 1 at the rim.
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;

      const t = d <= core ? 1 : 1 - (d - core) / (1 - core);
      const eased = t * t;
      mask[y * width + x] = Math.round((ditherIndex(eased, levels, x, y) / (levels - 1)) * 255);
    }
  }

  return maskToTexture(width, height, mask);
}

/**
 * Craters: a few darker discs inside the moon, kept clear of the rim.
 *
 * They're pushed out towards the edge on purpose — a moon this small is only
 * ~16 pixels across, and craters clustered near the middle merge into one blob
 * that reads as a smudge rather than as surface detail.
 */
export function createCraterTexture(radius: number, rand: () => number): Texture {
  const r = Math.max(2, Math.round(radius));
  const size = r * 2;
  const mask = new Uint8Array(size * size);
  const count = rangeInt(rand, 2, 3);

  for (let i = 0; i < count; i++) {
    const cr = Math.max(1, Math.round(range(rand, r * 0.1, r * 0.22)));
    // Keep the whole crater inside the disc with a pixel of margin.
    const maxOffset = Math.max(0, r - cr - 1);
    // Spread them around the disc rather than piling them all in the centre.
    const angle = (i / count) * Math.PI * 2 + range(rand, -0.6, 0.6);
    const dist = range(rand, 0.45, 1) * maxOffset;
    const cx = r + Math.cos(angle) * dist;
    const cy = r + Math.sin(angle) * dist;

    for (let y = 0; y < size; y++) {
      const dy = y + 0.5 - cy;
      for (let x = 0; x < size; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= cr * cr) mask[y * size + x] = 255;
      }
    }
  }

  return maskToTexture(size, size, mask);
}

/** The sun's hot centre — a smaller disc laid over the body. */
export function createCoreTexture(radius: number): Texture {
  return createDiscTexture(Math.max(1, Math.round(radius)));
}

// --- Clouds ------------------------------------------------------------------

/**
 * One cloud, as three white masks that get tinted at runtime.
 *
 * Splitting body / underside / lit edge into separate sprites is what lets a
 * cloud hold three *different hues* (warm top, dusty body, plum shadow at
 * sunset) while still cross-fading smoothly between times of day — a single
 * tinted sprite could only ever shift all three tones together.
 */
export interface CloudShapeTextures {
  /** The full silhouette, painted in the body tone. */
  body: Texture;
  /** The underside strip, painted in the shadow tone. */
  shadow: Texture;
  /** The top-lit edge, painted in the highlight tone. */
  highlight: Texture;
  width: number;
  height: number;
}

/**
 * Build one cumulus cloud: an asymmetric mass of ellipses on a flat base, edges
 * roughened by hand, then shaded to follow its own form.
 *
 * Four things do the work of making these look drawn rather than generated
 * (ART_DIRECTION.md §Art Style Rules — nothing should look procedurally
 * generated):
 *
 *  1. Each cloud fills only part of the box it's given, so one layer holds
 *     stubby puffs and long low banks instead of N variants of one rectangle.
 *  2. One blob is the crown and sits off-centre, with the others falling away
 *     from it — real cumulus are lopsided, evenly-spaced bumps are not.
 *  3. Edges are both bitten into and built out from, so an outline has notches
 *     *and* nubs. Erosion alone just looks uniformly nibbled.
 *  4. The lit cap thickens over crowns and thins in the valleys between them,
 *     instead of running as a constant band across the top. This is the single
 *     biggest difference between "shaded" and "hand-shaded".
 */
export function createCloudShape(
  boxWidth: number,
  boxHeight: number,
  rand: () => number
): CloudShapeTextures {
  const w = Math.max(9, Math.round(boxWidth * range(rand, 0.62, 1)));
  const h = Math.max(5, Math.round(boxHeight * range(rand, 0.68, 1)));
  const mask = new Uint8Array(w * h);

  // Cumulus sit on a level of the atmosphere, so the base is flat — but a
  // perfectly straight cut looks like a shelf. A short random walk keeps the
  // base reading as flat while stepping it a pixel or two along its length.
  const baseY = Math.round(h * range(rand, 0.78, 0.94));
  const baseJitter = new Int8Array(w);
  let level = 0;
  for (let x = 0; x < w; x++) {
    if (rand() < 0.24) level += rand() < 0.5 ? -1 : 1;
    level = Math.max(-2, Math.min(0, level));
    baseJitter[x] = level;
  }

  const blobs = rangeInt(rand, 3, 6);
  // Where along the cloud the tallest mass sits. Off-centre by design.
  const crownAt = range(rand, 0.2, 0.8);

  for (let i = 0; i < blobs; i++) {
    const spread = blobs === 1 ? 0.5 : i / (blobs - 1);
    // Blobs shrink with distance from the crown, so the mass has one clear peak.
    const prominence = 1 - Math.min(1, Math.abs(spread - crownAt) * 1.6);

    const cx = w * (0.14 + 0.72 * spread) + range(rand, -w * 0.06, w * 0.06);
    const rx = w * range(rand, 0.12, 0.24);
    // Even the flanking blobs keep real body — on a background cloud only nine
    // pixels tall, a shallower one erodes away to a scratch.
    const ry = h * (0.26 + 0.3 * prominence) * range(rand, 0.85, 1.15);
    const cy = baseY - ry * range(rand, 0.5, 0.95);

    stampEllipse(mask, w, h, cx, cy, rx, ry);
  }

  // A smaller puff riding on the shoulder of the main mass. Not every cloud
  // gets one, and it sits close enough to touch — a genuinely detached blob
  // reads as a speck of dirt on the screen, not as cloud.
  if (rand() < 0.4) {
    const side = rand() < 0.5 ? -1 : 1;
    const wispR = Math.max(2, w * range(rand, 0.07, 0.11));
    const cx = w * (crownAt + side * range(rand, 0.18, 0.3));
    const cy = baseY - h * range(rand, 0.35, 0.62);
    stampEllipse(mask, w, h, cx, cy, wispR, wispR * range(rand, 0.7, 1));
  }

  // Flatten everything below the base line.
  for (let x = 0; x < w; x++) {
    const cut = baseY + baseJitter[x];
    for (let y = cut; y < h; y++) mask[y * w + x] = 0;
  }

  roughenEdges(mask, w, h, baseY, rand);
  // Order matters: trimming first severs the hairline tails that would
  // otherwise chain a crumb to the main mass and smuggle it past the cull.
  trimSpurs(mask, w, h, 2);
  removeSpecks(mask, w, h, Math.max(5, Math.round(h * 0.9)));

  const { highlight, shadow } = shadeCloud(mask, w, h, rand);

  const body = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) body[i] = mask[i] ? 255 : 0;

  return {
    body: maskToTexture(w, h, body),
    shadow: maskToTexture(w, h, shadow),
    highlight: maskToTexture(w, h, highlight),
    width: w,
    height: h,
  };
}

/** Rasterise a hard-edged ellipse into the mask. No anti-aliasing. */
function stampEllipse(
  mask: Uint8Array,
  w: number,
  h: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): void {
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

/**
 * Bite pixels off the outline and add a few back on, so edges read as drawn.
 * Both passes read from a snapshot, so neither can run away with itself. The
 * base line is left alone — that's the one edge that should stay level.
 */
function roughenEdges(
  mask: Uint8Array,
  w: number,
  h: number,
  baseY: number,
  rand: () => number
): void {
  const filledIn = (source: Uint8Array, x: number, y: number) =>
    x < 0 || y < 0 || x >= w || y >= h ? 0 : source[y * w + x];

  // Pass 1 — notches. Bite less out of small clouds: the same erosion rate that
  // gives a thirty-pixel cloud character will chew a nine-pixel one to a thread.
  const erodeChance = h >= 16 ? 0.15 : 0.08;
  const beforeErode = mask.slice();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!beforeErode[y * w + x]) continue;
      const exposed =
        !filledIn(beforeErode, x - 1, y) ||
        !filledIn(beforeErode, x + 1, y) ||
        !filledIn(beforeErode, x, y - 1) ||
        !filledIn(beforeErode, x, y + 1);
      if (exposed && rand() < erodeChance) mask[y * w + x] = 0;
    }
  }

  // Pass 2 — nubs. Only pixels sitting in a genuine pit (three sides already
  // cloud) are candidates. Filling anything with two neighbours would pave over
  // every diagonal staircase and square the silhouette off, which is exactly
  // the machined look this is here to avoid.
  const beforeDilate = mask.slice();
  for (let y = 0; y < Math.min(h, baseY); y++) {
    for (let x = 0; x < w; x++) {
      if (beforeDilate[y * w + x]) continue;
      const neighbours =
        filledIn(beforeDilate, x - 1, y) +
        filledIn(beforeDilate, x + 1, y) +
        filledIn(beforeDilate, x, y - 1) +
        filledIn(beforeDilate, x, y + 1);
      if (neighbours >= 3 && rand() < 0.3) mask[y * w + x] = 1;
    }
  }
}

/**
 * Erode one-pixel spurs — the hairline tails erosion leaves trailing off a
 * silhouette, which read as scratches on the screen rather than as vapour.
 * A pixel with at most one filled neighbour is the end of a thread, not part of
 * a body, so it goes. Each pass shortens every thread by one pixel.
 */
function trimSpurs(mask: Uint8Array, w: number, h: number, passes: number): void {
  for (let pass = 0; pass < passes; pass++) {
    const source = mask.slice();
    const filled = (x: number, y: number) =>
      x < 0 || y < 0 || x >= w || y >= h ? 0 : source[y * w + x];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!source[y * w + x]) continue;
        const neighbours =
          filled(x - 1, y) + filled(x + 1, y) + filled(x, y - 1) + filled(x, y + 1);
        if (neighbours <= 1) mask[y * w + x] = 0;
      }
    }
  }
}

/**
 * Drop islands too small to read as cloud.
 *
 * Erosion and stray puffs both leave one- and two-pixel crumbs floating in open
 * sky, which look like dust on the monitor rather than weather. Anything under
 * the threshold goes; a puff big enough to be a puff stays.
 */
function removeSpecks(mask: Uint8Array, w: number, h: number, minSize: number): void {
  const seen = new Uint8Array(w * h);
  const component: number[] = [];
  const stack: number[] = [];

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;

    component.length = 0;
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;

    while (stack.length > 0) {
      const index = stack.pop()!;
      component.push(index);

      const x = index % w;
      const y = (index / w) | 0;

      // 4-connected: diagonal-only links are too thin to hold a shape together.
      if (x > 0) push(index - 1);
      if (x < w - 1) push(index + 1);
      if (y > 0) push(index - w);
      if (y < h - 1) push(index + w);
    }

    if (component.length < minSize) {
      for (const index of component) mask[index] = 0;
    }
  }

  function push(index: number): void {
    if (mask[index] && !seen[index]) {
      seen[index] = 1;
      stack.push(index);
    }
  }
}

/**
 * Light the cloud from the upper left.
 *
 * The lit cap is not a constant band: its depth follows how prominent each
 * column is, so crowns catch a thick highlight and the dips between them get a
 * thin one. Both cap and belly are capped as a fraction of the column so the
 * body tone always survives between them — three tones, always readable.
 */
function shadeCloud(
  mask: Uint8Array,
  w: number,
  h: number,
  rand: () => number
): { highlight: Uint8Array; shadow: Uint8Array } {
  const highlight = new Uint8Array(w * h);
  const shadow = new Uint8Array(w * h);

  const tops = new Int16Array(w).fill(-1);
  const bottoms = new Int16Array(w).fill(-1);
  let highestTop = h;
  let lowestTop = 0;

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (mask[y * w + x]) {
        if (tops[x] === -1) tops[x] = y;
        bottoms[x] = y;
      }
    }
    if (tops[x] !== -1) {
      highestTop = Math.min(highestTop, tops[x]);
      lowestTop = Math.max(lowestTop, tops[x]);
    }
  }

  const relief = Math.max(1, lowestTop - highestTop);
  const baseLight = Math.max(1, Math.round(h * 0.1));
  const crownLight = Math.max(1, Math.round(h * 0.15));
  const baseShade = Math.max(1, Math.round(h * 0.15));

  for (let x = 0; x < w; x++) {
    const top = tops[x];
    const bottom = bottoms[x];
    if (top === -1) continue;

    const thickness = bottom - top + 1;
    const prominence = (lowestTop - top) / relief;

    // Thick over crowns, thin in the valleys, plus a pixel on the sunward flank.
    let lit = baseLight + Math.round(prominence * crownLight) + (x < w * 0.45 ? 1 : 0);
    // An occasional single-pixel break keeps the lit edge from looking machined.
    if (rand() < 0.12) lit -= 1;
    lit = Math.max(1, Math.min(lit, Math.floor(thickness * 0.6)));

    const shade = Math.max(1, Math.min(baseShade, Math.floor(thickness * 0.4)));

    for (let y = top; y < top + lit; y++) {
      if (mask[y * w + x]) highlight[y * w + x] = 255;
    }
    for (let y = bottom - shade + 1; y <= bottom; y++) {
      if (y >= 0 && mask[y * w + x]) shadow[y * w + x] = 255;
    }
  }

  return { highlight, shadow };
}

// --- Birds -------------------------------------------------------------------

/**
 * A distant bird, hand-plotted at 5×3 pixels across a three-frame flap.
 *
 * At this size a bird is a glyph, not a drawing — the shape has to be placed
 * pixel by pixel or it turns to mush, which is why these are literal bitmaps
 * rather than anything generated. The cycle runs 0 → 1 → 2 → 1: wings up,
 * level, wings down, level. Symmetric left-to-right, so a bird flying the other
 * way needs no mirrored copy.
 */
const BIRD_FRAMES: readonly (readonly string[])[] = [
  ["X...X", ".X.X.", "..X.."],
  [".....", "XX.XX", "..X.."],
  ["..X..", ".X.X.", "X...X"],
];

/** Frame order for one wingbeat. */
export const BIRD_FLAP_CYCLE = [0, 1, 2, 1] as const;

/** Bake the bird flap frames. White masks, tinted per time of day. */
export function createBirdFrames(): Texture[] {
  return BIRD_FRAMES.map((rows) => {
    const h = rows.length;
    const w = rows[0].length;
    const mask = new Uint8Array(w * h);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (rows[y][x] === "X") mask[y * w + x] = 255;
      }
    }

    return maskToTexture(w, h, mask);
  });
}
