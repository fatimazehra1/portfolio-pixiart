import type { Texture } from "pixi.js";
import { ditherAlpha, ditherIndex, maskToTexture as bakeMask, toTexture as bakeTexture } from "../shared";
import type { Harmonic } from "./OceanConfig";

/**
 * Procedural pixel-art texture factory for the ocean.
 *
 * Same discipline as the rest of the world: every texture is written pixel by
 * pixel with hard edges, uploaded with `scaleMode: "nearest"`, and drawn at a
 * small internal resolution that is scaled up by a whole number. Smooth ramps
 * are quantised to a few levels and Bayer-dithered between them, so the water
 * reads as soft without ever becoming a 24-bit gradient.
 *
 * The baking and dithering helpers now live in `@/engine/shared`. They used to
 * be duplicated here on the principle that the ocean should not reach into the
 * sky's internals — which was right until a sixth system copied them, at which
 * point five identical copies had become the bigger coupling.
 *
 * TODO(assets): every texture here is generated because `public/assets/ocean/`
 * is empty. WaveLayer and FoamLayer both accept textures from outside, so
 * authored art drops in without code changes.
 */

// --- Baking ------------------------------------------------------------------

/**
 * Bake with ocean's name on any failure.
 *
 * Thin aliases over `@/engine/shared` — the implementation is shared by every
 * system in the engine; only the label on a context-creation failure is local.
 */
function toTexture(
  width: number,
  height: number,
  paint: (pixels: Uint8ClampedArray) => void
): Texture {
  return bakeTexture(width, height, paint, "Ocean");
}

function maskToTexture(width: number, height: number, mask: Uint8Array): Texture {
  return bakeMask(width, height, mask, "Ocean");
}

// --- Water body --------------------------------------------------------------

/**
 * The body of the water: the derived ramp, dithered down the height, with a
 * slow horizontal wander laid over it.
 *
 * The wander is the difference between water and a gradient. It's tiny — a
 * couple of ramp steps at most — but it means no two columns of the sea are
 * quite the same shade, which is what stops a large flat area from looking
 * printed. It fades out towards the horizon, where real water compresses into a
 * single tone.
 */
export function createWaterTexture(width: number, height: number, ramp: readonly number[]): Texture {
  const steps = ramp.length;

  return toTexture(width, height, (pixels) => {
    for (let y = 0; y < height; y++) {
      const depth = height === 1 ? 0 : y / (height - 1);

      for (let x = 0; x < width; x++) {
        // Two low frequencies beating against each other: no visible period.
        const wander =
          (Math.sin((x / width) * Math.PI * 2 * 1.5 + 0.7) * 0.6 +
            Math.sin((x / width) * Math.PI * 2 * 3.5 + 2.3) * 0.4) *
          0.035 *
          depth;

        const color = ramp[ditherIndex(depth + wander, steps, x, y)];
        const o = (y * width + x) * 4;
        pixels[o] = (color >> 16) & 0xff;
        pixels[o + 1] = (color >> 8) & 0xff;
        pixels[o + 2] = color & 0xff;
        pixels[o + 3] = 255;
      }
    }
  });
}

// --- Waves -------------------------------------------------------------------

export interface WaveTextures {
  /** The swell's body, fading out downward so it melts into the water. */
  body: Texture;
  /** The lit lip riding along the crest. */
  crest: Texture;
  width: number;
  height: number;
}

/**
 * Build one swell: a wrapped crest profile, a body that fades below it, and a
 * lit lip along the top.
 *
 * The profile is a sum of harmonics whose frequencies are whole numbers, so it
 * closes on itself exactly and the tile can repeat forever without a seam —
 * that's what lets the sea be endless. Different harmonic mixes are what make
 * each of the five layers a different silhouette; the per-column jitter on top
 * is what stops any of them looking like a plotted sine.
 */
export function createWaveTextures(
  tileWidth: number,
  bandHeight: number,
  amplitude: number,
  crestThickness: number,
  harmonics: readonly Harmonic[],
  jitter: number,
  rand: () => number
): WaveTextures {
  const w = Math.max(8, Math.round(tileWidth));
  const h = Math.max(3, Math.round(bandHeight));
  const amp = Math.max(1, Math.round(amplitude));

  const weight = harmonics.reduce((sum, term) => sum + Math.abs(term.amp), 0) || 1;
  const tops = new Int16Array(w);

  for (let x = 0; x < w; x++) {
    let v = 0;
    for (const term of harmonics) {
      v += term.amp * Math.sin((Math.PI * 2 * term.freq * x) / w + term.phase);
    }
    v /= weight; // −1 … 1

    // Crest where v is highest, so the profile hangs below the band's top edge.
    let top = ((1 - v) / 2) * amp;
    if (jitter > 0) top += (rand() * 2 - 1) * jitter;

    tops[x] = Math.max(0, Math.min(h - 1, Math.round(top)));
  }

  const body = new Uint8Array(w * h);
  const crest = new Uint8Array(w * h);

  // Hold the tone solid just under the crest, then let it fall away. A band
  // with a hard bottom edge reads as a stripe; one that fades reads as water.
  const solid = Math.max(1, Math.round(h * 0.25));

  for (let x = 0; x < w; x++) {
    const top = tops[x];

    for (let y = top; y < h; y++) {
      const below = y - top;
      const remaining = Math.max(1, h - top - solid);
      const strength = below <= solid ? 1 : 1 - (below - solid) / remaining;
      body[y * w + x] = ditherAlpha(strength, 5, x, y);
    }

  }

  // The lit lip, broken into runs.
  //
  // This is the difference between water and a stack of ribbons. An unbroken
  // highlight along every crest reads as a contour line drawn across the whole
  // sea; the same highlight cut into dashes reads as light catching the surface
  // where it happens to tilt towards you. Same silhouette, completely different
  // material.
  let x = 0;
  while (x < w) {
    const run = 4 + Math.floor(rand() * 11);
    const gap = 3 + Math.floor(rand() * 15);
    // Vary the weight run to run so the surface isn't uniformly lit.
    const weightAlpha = rand() < 0.45 ? 175 : 255;

    for (let i = 0; i < run && x < w; i++, x++) {
      const top = tops[x];
      for (let y = top; y < Math.min(top + crestThickness, h); y++) {
        crest[y * w + x] = weightAlpha;
      }
    }

    x += gap;
  }

  // A scatter of short ripples across the band's face. Calm water isn't smooth
  // between swells — it's flecked with little catches of light.
  const ripples = Math.round((w / 26) * (1 + h / 24));
  for (let i = 0; i < ripples; i++) {
    const rx = Math.floor(rand() * w);
    const length = 2 + Math.floor(rand() * 3);
    const depth = 2 + Math.floor(rand() * Math.max(1, h * 0.55));

    for (let d = 0; d < length; d++) {
      const px = (rx + d) % w;
      const py = tops[px] + depth;
      if (py >= 0 && py < h) crest[py * w + px] = 120;
    }
  }

  return {
    body: maskToTexture(w, h, body),
    crest: maskToTexture(w, h, crest),
    width: w,
    height: h,
  };
}

// --- Sun reflection ----------------------------------------------------------

/**
 * The broad path of light the sun lays on the water: brightest and narrowest at
 * the horizon, spreading and dimming as it comes towards the viewer.
 */
export function createSunPathTexture(halfWidth: number, height: number): Texture {
  const hw = Math.max(3, Math.round(halfWidth));
  const w = hw * 2;
  const h = Math.max(2, Math.round(height));
  const mask = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    const depth = h === 1 ? 0 : y / (h - 1);
    // Narrow at the horizon, opening out towards the viewer.
    const spread = hw * (0.2 + 0.8 * depth);
    // And fading as it spreads, so the light stays gathered near the horizon.
    const strength = (1 - depth) ** 1.6;

    for (let x = 0; x < w; x++) {
      const offset = Math.abs(x + 0.5 - hw) / spread;
      if (offset > 1) continue;
      mask[y * w + x] = ditherAlpha((1 - offset) ** 1.5 * strength, 5, x, y);
    }
  }

  return maskToTexture(w, h, mask);
}

/** A single horizontal glint, `width` pixels long and one pixel tall. */
export function createGlintTexture(width: number): Texture {
  const w = Math.max(1, Math.round(width));
  return maskToTexture(w, 1, new Uint8Array(w).fill(255));
}

// --- Foam --------------------------------------------------------------------

/**
 * The broken line of foam riding the ocean's top edge.
 *
 * Drawn as runs and gaps rather than a continuous rule — an unbroken line reads
 * as a border on a rectangle, whereas a line that keeps stopping and starting
 * reads as water catching the light. A few flecks above the line give it froth.
 */
export function createFoamTexture(
  tileWidth: number,
  height: number,
  rand: () => number
): Texture {
  const w = Math.max(8, Math.round(tileWidth));
  const h = Math.max(2, Math.round(height));
  const mask = new Uint8Array(w * h);

  const midline = (h - 1) / 2;
  const lineAt = (x: number) =>
    Math.max(
      0,
      Math.min(
        h - 1,
        Math.round(midline + Math.sin((Math.PI * 2 * 2 * x) / w + 0.5) * (midline * 0.9))
      )
    );

  let x = 0;
  while (x < w) {
    const run = 3 + Math.floor(rand() * 9);
    const gap = 2 + Math.floor(rand() * 8);

    for (let i = 0; i < run && x < w; i++, x++) {
      const y = lineAt(x);
      mask[y * w + x] = 255;
      // The odd fleck lifting off the crest.
      if (rand() < 0.16 && y > 0) mask[(y - 1) * w + x] = 150;
    }

    x += gap;
  }

  return maskToTexture(w, h, mask);
}
