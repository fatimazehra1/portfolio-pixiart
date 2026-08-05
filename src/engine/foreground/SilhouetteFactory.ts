import { Texture } from "pixi.js";
import { createRandom, maskToTexture, range, rangeInt } from "../shared";
import { SILHOUETTES } from "./ForegroundConfig";
import type { SilhouetteKind } from "./ForegroundConfig";

/**
 * Bakes the near-foreground shapes.
 *
 * White masks only — every silhouette is one flat colour at runtime, so the
 * shape is baked once and the colour is a tint. That is what lets the whole
 * layer answer a change in the light with one assignment per sprite instead of
 * a texture upload.
 *
 * The shapes are plotted rather than drawn from assets for the same reason the
 * lighthouse is: `public/assets/` is empty, and a silhouette is simple enough
 * that code makes a better one than a placeholder would. When real art arrives,
 * it replaces this file and nothing else — the placement, the parallax, the
 * culling and the lighting never learn where the pixels came from.
 */
export class SilhouetteFactory {
  private readonly cache = new Map<string, Texture>();
  private readonly seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /** A baked shape. Identical requests share one texture. */
  get(kind: SilhouetteKind, variant: number, width: number, height: number): Texture {
    const key = `${kind}:${variant}:${width}x${height}`;
    const hit = this.cache.get(key);
    if (hit) return hit;

    const texture = this.bake(kind, variant, width, height);
    this.cache.set(key, texture);
    return texture;
  }

  destroy(): void {
    for (const texture of this.cache.values()) texture.destroy(true);
    this.cache.clear();
  }

  // --- Internal --------------------------------------------------------------

  private bake(kind: SilhouetteKind, variant: number, w: number, h: number): Texture {
    const mask = new Uint8Array(w * h);
    const rand = createRandom(this.seed + variant * 7919 + w * 131 + h);
    // The mask is an alpha channel, not a flag — `maskToTexture` writes these
    // bytes straight into the texture's alpha. Opaque means 255.
    const set = (x: number, y: number) => {
      if (x >= 0 && x < w && y >= 0 && y < h) mask[y * w + x] = 255;
    };

    switch (kind) {
      case "grass":
        this.plotGrass(set, w, h, rand);
        break;
      case "reed":
        this.plotReed(set, w, h, rand);
        break;
      case "branch":
        this.plotBranch(set, w, h, rand);
        break;
      case "post":
        this.plotPost(set, w, h, rand);
        break;
      case "rock":
        this.plotRock(set, w, h, rand);
        break;
    }

    return maskToTexture(w, h, mask, "Foreground");
  }

  /** A fan of blades from a common root, each leaning a different way. */
  private plotGrass(
    set: (x: number, y: number) => void,
    w: number,
    h: number,
    rand: () => number
  ): void {
    const blades = rangeInt(rand, 3, Math.max(4, w - 2));
    const root = w >> 1;

    for (let i = 0; i < blades; i += 1) {
      // Blades spread outward from the root; the ones at the edges are shorter,
      // which is what makes the tuft read as a clump rather than a comb.
      const lean = range(rand, -1, 1);
      const length = Math.round(h * range(rand, 0.45, 1));
      const start = root + Math.round(range(rand, -w / 3, w / 3));

      for (let step = 0; step < length; step += 1) {
        const t = step / Math.max(1, length - 1);
        const x = Math.round(start + lean * t * t * (w / 2));
        set(x, h - 1 - step);
      }
    }
  }

  /** A single stiff stalk with a head on it. */
  private plotReed(
    set: (x: number, y: number) => void,
    w: number,
    h: number,
    rand: () => number
  ): void {
    const x = w >> 1;
    const lean = range(rand, -0.6, 0.6);
    const headHeight = Math.max(2, Math.round(h * 0.18));

    for (let step = 0; step < h; step += 1) {
      const t = step / Math.max(1, h - 1);
      const cx = Math.round(x + lean * t * t * (w / 2));
      set(cx, h - 1 - step);
      // The head is the seed cluster at the top — two pixels wide, no more.
      if (step >= h - headHeight) set(cx + 1, h - 1 - step);
    }
  }

  /** A limb entering from one side, with a few sprigs hanging off it. */
  private plotBranch(
    set: (x: number, y: number) => void,
    w: number,
    h: number,
    rand: () => number
  ): void {
    const fromLeft = rand() < 0.5;
    const baseY = Math.round(h * range(rand, 0.25, 0.55));
    const droop = range(rand, 0.3, 0.9);

    for (let i = 0; i < w; i += 1) {
      const x = fromLeft ? i : w - 1 - i;
      const t = i / Math.max(1, w - 1);
      const y = Math.round(baseY + droop * t * t * (h - baseY - 1));
      set(x, y);
      // A branch one pixel thick reads as a wire, so it thickens towards the
      // trunk end and thins out as it reaches.
      if (t < 0.6) set(x, y + 1);

      // Sprigs, hanging down. Sparse, and never from the last few pixels.
      if (t > 0.15 && t < 0.9 && rand() < 0.13) {
        const drop = rangeInt(rand, 2, Math.max(3, Math.round(h * 0.4)));
        for (let d = 1; d <= drop; d += 1) set(x, y + d);
      }
    }
  }

  /** A post, slightly tapered, with a chamfered top. */
  private plotPost(
    set: (x: number, y: number) => void,
    w: number,
    h: number,
    rand: () => number
  ): void {
    const cap = Math.max(1, Math.round(h * 0.06));
    const tilt = range(rand, -0.4, 0.4);

    for (let y = 0; y < h; y += 1) {
      const t = y / Math.max(1, h - 1);
      // Narrower at the top, and leaning a little — nothing on a shoreline is
      // ever quite vertical.
      const halfWidth = Math.max(1, Math.round((w / 2) * (0.72 + 0.28 * t)));
      const centre = Math.round(w / 2 + tilt * (1 - t) * (w / 3));
      const top = y < cap ? 1 : 0;

      for (let x = centre - halfWidth + top; x <= centre + halfWidth - top; x += 1) {
        set(x, y);
      }
    }
  }

  /** A low hump, wider than it is tall, with an uneven crown. */
  private plotRock(
    set: (x: number, y: number) => void,
    w: number,
    h: number,
    rand: () => number
  ): void {
    // One height per column, from a shallow arch plus noise, then filled down.
    // Cheaper than any outline algorithm and it never leaves a hole.
    let previous = 0;

    for (let x = 0; x < w; x += 1) {
      const t = x / Math.max(1, w - 1);
      const arch = Math.sin(t * Math.PI) ** 0.7;
      const wobble = range(rand, -0.14, 0.14);
      const target = Math.round(h * Math.max(0.15, Math.min(1, arch + wobble)));
      // Clamp the step so the profile never jumps and turns into a staircase.
      const height = x === 0 ? target : Math.max(previous - 2, Math.min(previous + 2, target));
      previous = height;

      for (let y = h - height; y < h; y += 1) set(x, y);
    }
  }
}

/** Pick a size for one instance, on whole art pixels. */
export function sizeFor(
  kind: SilhouetteKind,
  rand: () => number
): { width: number; height: number } {
  const config = SILHOUETTES[kind];
  return {
    width: Math.max(1, Math.round(range(rand, config.width[0], config.width[1]))),
    height: Math.max(1, Math.round(range(rand, config.height[0], config.height[1]))),
  };
}
