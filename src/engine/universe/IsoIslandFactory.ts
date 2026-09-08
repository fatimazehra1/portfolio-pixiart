import { createRandom, ditherIndex, range, toTexture } from "../shared";
import type { Texture } from "pixi.js";

/**
 * Isometric floating islands, generated rather than drawn.
 *
 * One shape function, three parts: an organic top face in true 2:1 iso
 * proportions, side walls with real thickness, and a rock underside that
 * tapers to a point. Every island on the hub comes from this with different
 * parameters — there is no per-chapter hand-plotted geometry here, only a
 * palette, a seed, and the silhouette knobs below.
 *
 * # Why the knobs exist
 * Seed alone was not enough. Nine islands drawn from one radius with one
 * wobble amplitude, one projection ratio and one taper came out as nine
 * near-identical blobs at slightly different sizes — the seed only moved the
 * bumps around the same circle. `elongation`, `aspect`, `roughness`,
 * `wallRatio` and `undersideTaper` are the axes that actually change a
 * silhouette: plan-view stretch, how deep the projection runs, how broken the
 * coast is, how thick the slab is, and whether the rock below is a stub or a
 * spike. The seed still owns where every bump lands.
 */

/**
 * One horizontal band of the rock below the cap.
 *
 * An island is a cross-section, not a lump: topsoil over clay over pale stone
 * over bedrock, each laid down at a different time and each a different colour.
 * One dithered ramp down the whole mass — what this replaced — reads as a
 * single grey block with a gradient on it, which is the one thing a floating
 * island in a bright sky must not be.
 *
 * `weight` is relative thickness across the *whole* rock depth (wall plus
 * underside), so a band does not have to know how long the spike below it is.
 */
export interface RockBand {
  color: number;
  weight: number;
}

/**
 * A raised level on the top face, and where its cliff falls.
 *
 * `at` is a depth fraction across the cap, 0 at the back rim and 1 at the
 * front edge; everything *behind* it is lifted by `rise` art pixels and a
 * cliff of that height is drawn along the line. Two steps make two levels, and
 * a plateau with a terrace in front of it is one step at ~0.6.
 *
 * Kept as data rather than a flag because "stepped" is not one shape: which
 * islands are stepped, how many levels they have and where the edge falls is
 * the whole of the variety, and a boolean would give nine identical steps.
 */
export interface TopStep {
  /** Depth across the cap, 0 (back rim) to 1 (front edge). */
  at: number;
  /** How far the land behind the line stands proud, in island pixels. */
  rise: number;
}

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
  /**
   * Plan-view stretch along x. 1 reads as round; above 1 is long and narrow,
   * below 1 is short and deep. Applied before the projection, so it stretches
   * the land itself rather than the camera.
   */
  elongation?: number;
  /** Multiplier on the 2:1 projection's vertical run. Below 1 squat, above 1 deep. */
  aspect?: number;
  /** Coastline irregularity. ~0.5 is a smooth headland, ~1.8 broken and jagged. */
  roughness?: number;
  /** Side-wall height as a fraction of `size` — how thick the slab reads. */
  wallRatio?: number;
  /** Underside taper exponent. ~1.1 is a stubby wedge, ~3 a long dramatic spike. */
  undersideTaper?: number;
  /** A second, smaller rock hanging in the void under the point. */
  secondaryRock?: boolean;
  /**
   * Horizontal rock bands, top to bottom. Three to five is the useful range.
   *
   * Falls back to one band per entry in `rockPalette` when omitted, which is
   * what the far-field islands take — they are haze, and a stratigraphy nobody
   * can resolve is texture memory spent on nothing.
   */
  strata?: readonly RockBand[];
  /** Raised levels on the top face, back to front. See `TopStep`. */
  steps?: readonly TopStep[];
  /** How many strands trail from the underside. A few islands, never all. */
  vines?: number;
  /** What those strands are made of, light to dark. Leaf green, or bare root. */
  vineTones?: readonly number[];
  /** Rim, dirt and a worn path on the top face. See `IsoGround`. */
  ground?: IsoGround;
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
  /**
   * The *front* edge of the top face at each column — where the cap stops and
   * the wall begins. -1 where there is no land.
   *
   * `surface` alone is only half a footprint. Anything dressing the ground
   * needs to know how deep the cap runs at a given column, or every stool and
   * every crate ends up in a line along the back rim.
   */
  capBottom: Int32Array;
}

/**
 * Ground dressing baked into the top face.
 *
 * Not props: this is the *surface*, and a surface belongs to the thing that
 * generated it. A rim so the outline is a line rather than a fade, a worn path
 * up to where the building stands, and a scatter of dirt so the cap is not one
 * flat colour under everything standing on it.
 */
export interface IsoGround {
  /** Worn earth, light to dark. Derived from the top palette when omitted. */
  dirt?: readonly number[];
  /** How much of the cap goes to dirt patches, 0–1. */
  patches?: number;
  /** A worn path from the front edge up to the middle, and how wide it runs. */
  path?: number;
}

/** Light comes from the upper-left, consistently, across every island. */
const LIGHT_X = -1;
const LIGHT_Y = -1;

const WALL_HEIGHT_RATIO = 0.22;
const MARGIN = 3;

export function generateIsoIsland(params: IsoIslandParams): IsoIsland {
  const {
    size,
    topPalette,
    rockPalette,
    edgeSeed,
    undersideLength,
    elongation = 1,
    aspect = 1,
    roughness = 1,
    wallRatio = WALL_HEIGHT_RATIO,
    undersideTaper = 1.7,
    secondaryRock = false,
    strata,
    steps,
    vines = 0,
    vineTones,
    ground,
  } = params;
  const rand = createRandom(edgeSeed >>> 0);

  // The organic edge: a base radius perturbed by a few off-frequency
  // harmonics (same idiom as the coast's `mound` form) plus a per-island
  // random phase, so no two islands read as stamped from the same die. The
  // third harmonic is the high-frequency one — at low `roughness` it is
  // invisible, at high `roughness` it is what tears the coast up.
  const h1 = range(rand, 2.5, 3.5);
  const h2 = range(rand, 6, 8);
  const h3 = range(rand, 13, 19);
  const p1 = range(rand, 0, Math.PI * 2);
  const p2 = range(rand, 0, Math.PI * 2);
  const p3 = range(rand, 0, Math.PI * 2);
  const wobbleAmt = range(rand, 0.12, 0.2) * roughness;
  const fineAmt = wobbleAmt * 0.35 * roughness;

  const iso = 0.5 * aspect; // 2:1 projection, per-island deeper or shallower
  const ex = Math.max(0.35, elongation);
  // Headroom for the noisy radius to exceed the base — derived rather than
  // fixed, because a jagged island's radius overshoots much further than a
  // smooth one's and a fixed cap would clip it against the texture edge.
  const bulge = 1 + wobbleAmt + wobbleAmt * 0.6 + fineAmt + 0.05;

  const radiusAt = (theta: number): number => {
    const wobble =
      1 +
      wobbleAmt * Math.sin(theta * h1 + p1) +
      wobbleAmt * 0.6 * Math.sin(theta * h2 + p2) +
      fineAmt * Math.sin(theta * h3 + p3);
    return size * Math.max(0.5, wobble);
  };

  const outerX = Math.ceil(size * bulge * ex);
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
    const dx = (x - cx) / ex;
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

  // --- Stepped top face ---------------------------------------------------
  // Sorted back to front, so the lifts accumulate: a pixel behind two lines is
  // two levels up. The boundary is wobbled per column by a slow harmonic, the
  // same idiom the coastline itself is drawn with — a cliff surveyed with a
  // straight edge is the one thing on an island that reads as CAD.
  const levels = [...(steps ?? [])]
    .filter((step) => step.rise > 0 && step.at > 0.02 && step.at < 0.98)
    .sort((a, b) => a.at - b.at);
  const totalRise = levels.reduce((sum, step) => sum + step.rise, 0);
  const stepPhase = range(rand, 0, Math.PI * 2);
  const stepWave = range(rand, 0.05, 0.11);

  /** Where a step's line falls on this column, as a depth fraction. */
  const stepAt = (step: TopStep, x: number): number =>
    step.at + 0.045 * Math.sin(x * stepWave + stepPhase);

  /** How far the land at this depth on this column stands proud, in pixels. */
  const liftOf = (x: number, depth: number): number => {
    let lift = 0;
    for (const step of levels) if (depth < stepAt(step, x)) lift += step.rise;
    return lift;
  };

  // --- Final layout: content-tight, no dead space between the parts -------
  // The pad above the cap carries the tallest step, or a raised back rim would
  // be lifted straight off the top edge of the texture.
  const topPad = MARGIN + totalRise;
  const capRowOf = (oy: number) => oy - boundsTopOff + topPad;
  const capHeight = boundsBottomOff - boundsTopOff + 1;
  const wallTopRow = topPad + capHeight; // right under the lowest visible cap row
  const wallHeight = Math.max(3, Math.round(size * wallRatio));
  const undersideTopRow = wallTopRow + wallHeight;

  // The second rock, when a chapter asks for one: a small lozenge floating in
  // the gap under the point, the same palette, far enough down to read as a
  // separate piece of the same break rather than a lump on the spike.
  const secondGap = secondaryRock ? Math.max(2, Math.round(undersideLength * 0.12)) : 0;
  const secondLength = secondaryRock ? Math.max(6, Math.round(undersideLength * 0.62)) : 0;
  const secondTopRow = undersideTopRow + undersideLength + secondGap;
  const secondDriftFrac = range(rand, -0.35, 0.35);

  // --- Stratigraphy: the rock, in layers ----------------------------------
  //
  // The bands are measured against the *whole* rock depth — wall plus
  // underside — rather than against either half, so an island with a long
  // spike gets a deep bedrock and a stubby one gets a shallow one, from the
  // same weights. Boundaries are wobbled by two slow harmonics, because a
  // dead-level seam between two earth tones is the one thing geology never
  // does and the eye notices immediately.
  const bands: readonly RockBand[] =
    strata && strata.length > 0 ? strata : rockPalette.map((color) => ({ color, weight: 1 }));
  const rockDepth = Math.max(1, wallHeight + undersideLength);
  const totalWeight = bands.reduce((sum, band) => sum + Math.max(0, band.weight), 0) || 1;
  const bandEdges: number[] = [];
  {
    let acc = 0;
    for (const band of bands) {
      acc += Math.max(0, band.weight) / totalWeight;
      bandEdges.push(acc * rockDepth);
    }
  }
  const bandPhase = range(rand, 0, Math.PI * 2);
  const bandWave = range(rand, 0.06, 0.13);

  const bandAt = (x: number, y: number): number => {
    const d =
      y -
      wallTopRow +
      1.4 * Math.sin(x * bandWave + bandPhase) +
      0.8 * Math.sin(x * bandWave * 2.7 + bandPhase * 1.7);
    for (let i = 0; i < bandEdges.length; i++) if (d < bandEdges[i]) return i;
    return bands.length - 1;
  };

  /**
   * A pixel of the detached fragment. Two bands up from the bottom, so it is
   * made of the same rock as the island's own break and not of its shadow.
   */
  const fragmentTone = (x: number, y: number, lightVal: number): number => {
    const color = bands[Math.max(0, bands.length - 3)].color;
    const tone = ditherIndex(lightVal, 3, x, y);
    return tone === 0 ? shade(color, 1.17) : tone === 1 ? color : shade(color, 0.72);
  };

  /**
   * One rock pixel: which band it falls in, then which of that band's three
   * faces the light says it is. Three tones derived from the band rather than
   * authored, so a band is a *colour* and the lighting stays this file's.
   */
  const rockTone = (x: number, y: number, lightVal: number): number => {
    const color = bands[bandAt(x, y)].color;
    const tone = ditherIndex(lightVal, 3, x, y);
    return tone === 0 ? shade(color, 1.17) : tone === 1 ? color : shade(color, 0.72);
  };

  const height =
    (secondaryRock ? secondTopRow + secondLength : undersideTopRow + undersideLength) + MARGIN;

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
  // silhouette is torn rather than a clean triangle. `undersideTaper` is what
  // separates a stubby island from one hanging off a spike.
  const u1 = range(rand, 3, 5);
  const u2 = range(rand, 8, 11);
  const up1 = range(rand, 0, Math.PI * 2);
  const up2 = range(rand, 0, Math.PI * 2);
  const jag = new Float32Array(width);
  for (let x = 0; x < width; x++) jag[x] = range(rand, -1, 1);

  const underHalfWidthAt = (row: number): number => {
    const t = Math.min(1, row / Math.max(1, undersideLength));
    return halfSpan * Math.pow(1 - t, undersideTaper);
  };

  // --- Ground dressing: the rim, the dirt and the path --------------------
  //
  // All three are painted into the cap rather than laid over it as sprites.
  // They are the surface, and a surface belongs to whatever generated it —
  // a second aligned sprite for a path is a second thing to keep in register
  // with a coastline that is regenerated from a seed.
  const dirt = ground?.dirt ?? topPalette.map((c) => mixColor(c, 0x8a7256, 0.55));
  const patchAmount = ground?.patches ?? 0;
  const pathWidth = ground?.path ?? 0;

  const inCap = (x: number, y: number): boolean =>
    x >= left && x <= right && topTop[x] >= 0 && y >= topTop[x] && y <= topBottom[x];

  /** How far a cap pixel is from the edge of the cap, up to 3. */
  const edgeDistance = (x: number, y: number): number => {
    for (let r = 1; r <= 2; r++) {
      if (
        !inCap(x - r, y) ||
        !inCap(x + r, y) ||
        !inCap(x, y - r) ||
        !inCap(x, y + r) ||
        !inCap(x - r, y - r) ||
        !inCap(x + r, y + r)
      ) {
        return r - 1;
      }
    }
    return 2;
  };

  // Two off-frequency harmonics, the same idiom the coastline is built from —
  // enough to read as worn ground and never enough to read as a pattern.
  const pa = range(rand, 0.09, 0.16);
  const pb = range(rand, 0.13, 0.22);
  const pp1 = range(rand, 0, Math.PI * 2);
  const pp2 = range(rand, 0, Math.PI * 2);
  const pathBend = range(rand, -0.5, 0.5);

  const paintGround = (set: (x: number, y: number, color: number) => void) => {
    if (left < 0) return;

    for (let x = left; x <= right; x++) {
      if (topTop[x] < 0) continue;
      for (let y = topTop[x]; y <= topBottom[x]; y++) {
        const depth = (y - topTop[x]) / Math.max(1, topBottom[x] - topTop[x]);

        // Dirt first, so the rim and the path both draw over it.
        if (patchAmount > 0) {
          const n =
            Math.sin(x * pa + pp1) * Math.sin(y * pb + pp2) +
            0.5 * Math.sin((x + y) * pa * 1.7 + pp2);
          if (n > 1.05 - patchAmount * 1.5) {
            set(x, y, dirt[ditherIndex(0.5 + 0.3 * (1 - depth), dirt.length, x, y)]);
          }
        }

        // The path: a band up the middle of the cap from the front edge,
        // bent a little so it reads as walked rather than surveyed. It stops
        // short of the back rim — a path that runs off the far edge of an
        // island in the sky is a path to nowhere.
        if (pathWidth > 0 && depth > 0.12) {
          const bend = pathBend * Math.sin(depth * Math.PI) * halfSpan * 0.18;
          const half = pathWidth * (0.55 + 0.45 * depth);
          const offset = Math.abs(x - cx - bend);
          if (offset <= half) {
            const worn = offset > half - 1 ? 2 : ditherIndex(0.62, dirt.length, x, y);
            set(x, y, dirt[Math.min(dirt.length - 1, worn)]);
          }
        }

        // The rim, last and over everything: one tone all the way round, lit
        // on the shoulder the sun is on and dark everywhere else. This is what
        // turns a dithered blob into a shape with an outline.
        const d = edgeDistance(x, y);
        if (d <= 1) {
          const nx = (x - cx) / Math.max(1, outerX);
          const ny = depth - 0.5;
          const lit = nx * LIGHT_X + ny * LIGHT_Y > 0.25;
          if (d === 0) set(x, y, lit ? topPalette[0] : topPalette[topPalette.length - 1]);
          else if (!lit) set(x, y, topPalette[topPalette.length - 2]);
        }
      }
    }
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

    // Every cap pixel is drawn at its own row *minus* however far its level
    // stands proud. One expression, and it is the whole of the stepping: the
    // shape, the shading and the ground dressing are all authored flat and the
    // lift is applied on the way to the canvas.
    const capSet = (x: number, y: number, color: number) => {
      const span = Math.max(1, topBottom[x] - topTop[x]);
      set(x, y - liftOf(x, (y - topTop[x]) / span), color);
    };

    // Top face: dithered ramp across the whole blob, lit upper-left.
    for (let x = left; x <= right; x++) {
      if (topTop[x] < 0) continue;
      const span = Math.max(1, topBottom[x] - topTop[x]);
      for (let y = topTop[x]; y <= topBottom[x]; y++) {
        const nx = (x - cx) / Math.max(1, outerX);
        const ny = (y - topTop[x] - capHeight / 2) / Math.max(1, capHeight / 2);
        // A raised level catches more of the sky than the terrace below it.
        const raised = totalRise > 0 ? liftOf(x, (y - topTop[x]) / span) / totalRise : 0;
        const lightVal = 0.5 - 0.35 * (nx * LIGHT_X + ny * LIGHT_Y) + 0.08 * raised;
        const tone = ditherIndex(lightVal, topPalette.length, x, y);
        set(x, y - liftOf(x, (y - topTop[x]) / span), topPalette[tone]);
      }
    }

    paintGround(capSet);

    // The cliff faces, drawn into the rows the lift left empty. Lit along the
    // top course and in bare earth below it — a step is a cut through the same
    // ground the cap is made of, so it is that ground's darkest tones and not
    // the rock's.
    if (levels.length > 0) {
      const cliffEdge = topPalette[0];
      const cliffFace = mixColor(topPalette[topPalette.length - 1], bands[0].color, 0.5);
      const cliffDeep = shade(cliffFace, 0.78);

      for (let x = left; x <= right; x++) {
        if (topTop[x] < 0) continue;
        const span = topBottom[x] - topTop[x];
        // A column three pixels deep has no room for a terrace, a cliff and a
        // plateau; at the ends of the cap the step simply runs out.
        if (span < 5) continue;

        let above = totalRise;
        for (const step of levels) {
          const boundary = topTop[x] + Math.round(stepAt(step, x) * span);
          if (boundary <= topTop[x] || boundary >= topBottom[x]) {
            above -= step.rise;
            continue;
          }
          const start = boundary - above;
          for (let r = 0; r < step.rise; r++) {
            set(x, start + r, r === 0 ? cliffEdge : r === 1 ? cliffFace : cliffDeep);
          }
          above -= step.rise;
        }
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
        set(x, y, rockTone(x, y, 0.55 - 0.4 * side));
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
        set(x, y, rockTone(x, y, 0.6 - 0.35 * side - 0.35 * depth));
      }
    }

    // Vines and trailing roots, hung from the wall's lower edge out where the
    // underside has already narrowed away from it, so a strand falls through
    // open sky rather than down the face of the rock.
    //
    // Never more than a handful, and never on every island: this is the one
    // piece of dressing that reads *below* the silhouette, and a fringe all the
    // way round would turn nine distinct outlines into nine identical mops.
    if (vines > 0) {
      const tones = vineTones ?? [0x7f9a52, 0x64803f, 0x4a622d];
      const wallBottom = wallTopRow + wallHeight - 1;

      for (let i = 0; i < vines; i++) {
        // Out past two-thirds of the span, where the taper has already left
        // the wall — and alternating sides, so a pair never bunches.
        const side = i % 2 === 0 ? -1 : 1;
        const column = Math.round(cx + side * range(rand, halfSpan * 0.55, halfSpan * 0.92));
        if (column < wallLeft || column > wallRight) continue;
        if (topBottom[column] < 0) continue;

        const length = Math.round(range(rand, undersideLength * 0.35, undersideLength * 0.95));
        const drift = range(rand, -0.16, 0.16);
        const sway = range(rand, 0.1, 0.24);
        const phase = range(rand, 0, Math.PI * 2);
        // Starts inside the wall rather than at its lip, so the strand reads as
        // growing out of the rock instead of being taped to it.
        const from = wallBottom - rangeIntLocal(rand, 1, 4);

        for (let r = 0; r < length; r++) {
          const y = from + r;
          if (y >= height - 1) break;
          const x = Math.round(column + drift * r + Math.sin(r * sway + phase) * 1.4);
          const tone = tones[Math.min(tones.length - 1, Math.floor((r / length) * tones.length))];
          set(x, y, tone);
          // A second column every few pixels, so the strand thickens where a
          // leaf would be rather than reading as a drawn line all the way down.
          if (r > 2 && r % 4 === 1) set(x + (side > 0 ? 1 : -1), y, shade(tone, 0.82));
        }
      }
    }

    // The second rock: widest a third of the way down, tapering to nothing at
    // both ends, so it reads as a chunk rather than a smaller copy of the
    // island above it.
    if (secondaryRock) {
      const centre = cx + secondDriftFrac * halfSpan;
      const maxHalf = Math.max(2, halfSpan * 0.36);
      for (let row = 0; row < secondLength; row++) {
        const y = secondTopRow + row;
        const t = (row + 0.5) / secondLength;
        const base = maxHalf * Math.sin(Math.PI * Math.pow(t, 0.7));
        if (base < 0.5) continue;
        for (let x = wallLeft; x <= wallRight; x++) {
          const dx = x - centre;
          const noise = 1 + 0.24 * Math.sin(dx * 0.9 + row * 0.35 + up1);
          if (Math.abs(dx) > base * Math.max(0.2, noise)) continue;
          // Sampled from the pale-stone band rather than from its own row: the
          // fragment hangs *below* the stratigraphy, and a band lookup there
          // returns the deepest shadow every time — which is how this used to
          // come out as a flat black ellipse in open sky.
          set(x, y, fragmentTone(x, y, 0.62 - 0.35 * (dx / maxHalf) - 0.28 * t));
        }
      }
    }
  };

  const texture = toTexture(width, height, paint, "IsoIsland");

  const surface = new Int32Array(width).fill(-1);
  const capBottom = new Int32Array(width).fill(-1);
  for (let x = 0; x < width; x++) {
    // The raised back rim, not the unlifted one — anything that stands on a
    // column reads this, and on a stepped island the two are a cliff apart.
    surface[x] = topTop[x] < 0 ? -1 : topTop[x] - liftOf(x, 0);
    capBottom[x] = topBottom[x];
  }

  return {
    texture,
    width,
    height,
    // Lifted by however far the land at mid-depth stands proud, so whatever is
    // planted here stands *on* the plateau rather than sunk into it. This is
    // the whole of what keeps nine buildings anchored across a change that
    // moved the ground out from under them.
    topCenter: { x: cx, y: topPad + capHeight / 2 - liftOf(cx, 0.5) },
    topBounds: { left, right, top: topPad - totalRise, bottom: topPad + capHeight },
    surface,
    capBottom,
  };
}

/** An integer in [min, max]. Local, so the factory keeps one random source. */
function rangeIntLocal(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

/** Multiply a colour's channels, clamped. A band's lit and shadowed faces. */
function shade(color: number, factor: number): number {
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
  return (
    (clamp(((color >> 16) & 0xff) * factor) << 16) |
    (clamp(((color >> 8) & 0xff) * factor) << 8) |
    clamp((color & 0xff) * factor)
  );
}

/** Blend two colours. The cheapest way to derive one palette from another. */
function mixColor(a: number, b: number, t: number): number {
  const ch = (shift: number) => {
    const av = (a >> shift) & 0xff;
    const bv = (b >> shift) & 0xff;
    return Math.round(av + (bv - av) * t) & 0xff;
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** A stable seed from a string, for callers that want to key off a chapter id. */
export function seedFrom(id: string): number {
  let seed = 0x9e37;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  return seed;
}
