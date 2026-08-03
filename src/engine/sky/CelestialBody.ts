import { Container, Sprite, Texture } from "pixi.js";
import { createRandom } from "./random";
import {
  createCoreTexture,
  createCraterTexture,
  createDiscTexture,
  createGlowTexture,
} from "./textures";
import type { CelestialState } from "./types";

export interface CelestialBodyOptions {
  kind: "sun" | "moon";
  /** Disc radius in sky pixels. */
  radius: number;
  /** Halo radius in sky pixels. Should comfortably exceed `radius`. */
  glowRadius: number;
  /** Horizontal stretch of the halo. 1 is round; above 1 spreads it sideways. */
  glowAspect?: number;
  /** Halo quantisation steps. Fewer = more graphic, more clearly pixel art. */
  glowLevels?: number;
  seed: number;
}

/**
 * The sun or the moon: a hard-edged pixel disc, an inner detail pass and a
 * dithered halo, positioned from a normalised point in the sky.
 *
 * The two share one class because they only differ in their detail layer — the
 * sun gets a hot core, the moon gets craters — and in the colours the palette
 * hands them. Alpha 0 in the palette parks a body off duty (no sun at night)
 * without any special-casing here.
 */
export class CelestialBody {
  readonly container = new Container();

  private readonly glow: Sprite;
  private readonly disc: Sprite;
  private readonly detail: Sprite;

  private readonly glowTexture: Texture;
  private readonly discTexture: Texture;
  private readonly detailTexture: Texture;

  private readonly options: CelestialBodyOptions;

  constructor(options: CelestialBodyOptions) {
    this.options = options;
    const rand = createRandom(options.seed);

    this.glowTexture = createGlowTexture({
      radius: options.glowRadius,
      coreRadius: options.radius * 0.85,
      aspect: options.glowAspect,
      levels: options.glowLevels,
    });
    this.discTexture = createDiscTexture(options.radius);
    this.detailTexture =
      options.kind === "moon"
        ? createCraterTexture(options.radius, rand)
        : createCoreTexture(options.radius * 0.55);

    this.glow = new Sprite(this.glowTexture);
    this.disc = new Sprite(this.discTexture);
    this.detail = new Sprite(this.detailTexture);

    // Anchoring at the centre keeps positioning honest: the palette names where
    // the *body* is, not where its top-left corner lands.
    for (const sprite of [this.glow, this.disc, this.detail]) {
      sprite.anchor.set(0.5);
    }

    this.container.label = `sky:${options.kind}`;
    this.container.addChild(this.glow, this.disc, this.detail);
  }

  /**
   * Place and tint the body. `state.x` / `state.y` are fractions of the sky, so
   * the sun keeps its position in the composition at any viewport size.
   */
  apply(state: CelestialState, skyWidth: number, skyHeight: number): void {
    this.container.x = Math.round(state.x * skyWidth);
    this.container.y = Math.round(state.y * skyHeight);
    this.container.alpha = state.alpha;
    // Fully faded bodies cost nothing to skip entirely.
    this.container.visible = state.alpha > 0.001;

    this.disc.tint = state.color;
    this.detail.tint = state.detailColor;
    this.glow.tint = state.glowColor;
    this.glow.alpha = state.glowAlpha;
  }

  /**
   * Shift with the camera. Bodies are effectively at infinity, so they move a
   * touch less than even the farthest clouds.
   */
  setParallax(viewX: number, depth: number): void {
    this.container.pivot.x = Math.round(viewX * depth);
  }

  destroy(): void {
    this.glowTexture.destroy(true);
    this.discTexture.destroy(true);
    this.detailTexture.destroy(true);
    this.container.destroy({ children: true });
  }

  get kind(): "sun" | "moon" {
    return this.options.kind;
  }
}
