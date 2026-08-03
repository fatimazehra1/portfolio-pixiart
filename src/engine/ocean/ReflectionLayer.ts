import { Container, Sprite, Texture } from "pixi.js";
import {
  createGlintTexture,
  createSunPathTexture,
  createWaterTexture,
} from "./textures";
import { createRandom, range } from "./random";
import type { OceanPalette } from "./OceanConfig";

/** One winking highlight on the sun's path. */
interface Glint {
  sprite: Sprite;
  /** Position within the reflection cone: 0 at the horizon, 1 nearest. */
  depth: number;
  /** Sideways position within the cone at that depth, −1 … 1. */
  offset: number;
  /** Its own rhythm, so the water never blinks all at once. */
  phase: number;
  rate: number;
  sway: number;
}

/** How many highlights ride the sun's path. Enough to sparkle, few enough to stay calm. */
const GLINT_COUNT = 34;

/** Glint lengths in sky pixels, picked at random per highlight. */
const GLINT_WIDTHS = [1, 2, 3] as const;

/**
 * The sky, seen in the water.
 *
 * Three things, all reflection:
 *
 *  - **The water body itself.** Its colour ramp is the sky gradient read
 *    backwards (see `deriveOceanPalette`), so the sea is literally painted out
 *    of the sky's own colours. This is the layer that carries "soft pixel-art
 *    reflections of the sky" and the subtle variation that stops the water
 *    looking flat.
 *  - **The sun's path** — the broad column of light spreading from the horizon
 *    towards the viewer.
 *  - **The shimmer** — small highlights riding that path, each fading in and
 *    out on its own slow cycle and swaying a pixel either way.
 *
 * The body is a full-colour bake, so a change of time of day cross-fades
 * between two sprites. The path and the shimmer are white masks and just get
 * re-tinted, which is why the sun's reflection can follow the sunset smoothly
 * without re-baking anything.
 *
 * Mounted in two pieces: `backdrop` goes behind the waves, `shimmer` in front
 * of them, because light sits *on* the surface.
 */
export class ReflectionLayer {
  /** Water body and the sun's path. Mount behind the wave layers. */
  readonly backdrop = new Container();
  /** The winking highlights. Mount in front of the wave layers. */
  readonly shimmer = new Container();

  private readonly waterCurrent = new Sprite();
  private readonly waterNext = new Sprite();
  private waterCurrentTexture: Texture | null = null;
  private waterNextTexture: Texture | null = null;
  private currentRamp: readonly number[] = [];
  private nextRamp: readonly number[] | null = null;

  private readonly sunPath = new Sprite();
  private sunPathTexture: Texture | null = null;

  private readonly glints: Glint[] = [];
  private readonly glintTextures: Texture[];

  private width = 0;
  private height = 0;
  private elapsed = 0;
  private shimmerX = 0.5;
  private shimmerHalfWidth = 0;
  private intensity = 1;

  constructor(seed: number) {
    const rand = createRandom(seed);

    this.backdrop.label = "ocean:reflection";
    this.shimmer.label = "ocean:shimmer";

    this.waterNext.alpha = 0;
    this.backdrop.addChild(this.waterCurrent, this.waterNext, this.sunPath);

    this.glintTextures = GLINT_WIDTHS.map((w) => createGlintTexture(w));

    for (let i = 0; i < GLINT_COUNT; i++) {
      const sprite = new Sprite(
        this.glintTextures[Math.floor(rand() * this.glintTextures.length)]
      );
      sprite.alpha = 0;
      this.shimmer.addChild(sprite);

      this.glints.push({
        sprite,
        // Biased towards the horizon, where a real sun path is brightest.
        depth: range(rand, 0, 1) ** 1.5,
        offset: range(rand, -1, 1),
        phase: range(rand, 0, Math.PI * 2),
        // Slow. These are meant to breathe, not twinkle.
        rate: range(rand, 0.35, 0.9),
        sway: range(rand, 0.4, 1.1),
      });
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.shimmerHalfWidth = Math.max(6, Math.round(width * 0.075));

    if (this.currentRamp.length > 0) {
      this.setWaterTexture(createWaterTexture(width, height, this.currentRamp), false);
    }
    if (this.nextRamp) {
      const mix = this.waterNext.alpha;
      this.setWaterTexture(createWaterTexture(width, height, this.nextRamp), true);
      this.waterNext.alpha = mix;
    }

    this.replaceSunPath(createSunPathTexture(this.shimmerHalfWidth, height));
    this.layoutShimmer();
  }

  /** Bake `ramp` as the visible water immediately, with no transition. */
  setWater(ramp: readonly number[]): void {
    this.currentRamp = ramp;
    this.nextRamp = null;

    this.setWaterTexture(this.bake(ramp), false);
    this.setWaterTexture(null, true);
  }

  /** Bake `ramp` into the incoming sprite, ready to fade in via `setMix`. */
  prepareWater(ramp: readonly number[]): void {
    this.nextRamp = ramp;
    this.setWaterTexture(this.bake(ramp), true);
  }

  setMix(mix: number): void {
    this.waterNext.alpha = mix;
  }

  /** Promote the incoming water to be the visible one once a fade completes. */
  commit(): void {
    if (!this.nextRamp || !this.waterNextTexture) return;

    this.waterCurrentTexture?.destroy(true);
    this.waterCurrentTexture = this.waterNextTexture;
    this.waterCurrent.texture = this.waterNextTexture;
    this.currentRamp = this.nextRamp;

    this.waterNextTexture = null;
    this.nextRamp = null;
    this.waterNext.texture = Texture.EMPTY;
    this.waterNext.alpha = 0;
  }

  /** Point the reflection at the sun and set how hard it burns. */
  setShimmer(palette: OceanPalette, intensityScale: number): void {
    const { shimmer } = palette;
    this.shimmerX = shimmer.x;
    this.intensity = shimmer.intensity * intensityScale;

    this.sunPath.tint = shimmer.pathColor;
    this.sunPath.alpha = 0.5 * this.intensity;
    this.sunPath.visible = this.intensity > 0.001;

    this.shimmer.visible = this.intensity > 0.001;
    for (const glint of this.glints) glint.sprite.tint = shimmer.glintColor;

    this.layoutShimmer();
  }

  /** Breathe the highlights. `delta` is seconds. */
  update(delta: number): void {
    this.elapsed += delta;
    if (!this.shimmer.visible) return;

    for (const glint of this.glints) {
      // Squared sine: mostly dark, with a soft peak — a glint, not a strobe.
      const pulse = Math.max(0, Math.sin(this.elapsed * glint.rate + glint.phase)) ** 2;
      // Highlights nearest the horizon carry the most light.
      glint.sprite.alpha = pulse * this.intensity * (1 - glint.depth * 0.55);

      const sway = Math.round(Math.sin(this.elapsed * glint.sway + glint.phase));
      glint.sprite.x = this.glintX(glint) + sway;
    }
  }

  destroy(): void {
    this.waterCurrentTexture?.destroy(true);
    this.waterNextTexture?.destroy(true);
    this.sunPathTexture?.destroy(true);
    for (const texture of this.glintTextures) texture.destroy(true);

    this.backdrop.destroy({ children: true });
    this.shimmer.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  private bake(ramp: readonly number[]): Texture | null {
    if (this.width <= 0 || this.height <= 0) return null;
    return createWaterTexture(this.width, this.height, ramp);
  }

  private setWaterTexture(texture: Texture | null, incoming: boolean): void {
    if (incoming) {
      if (this.waterNextTexture !== texture) this.waterNextTexture?.destroy(true);
      this.waterNextTexture = texture;
      this.waterNext.texture = texture ?? Texture.EMPTY;
      this.waterNext.alpha = 0;
    } else {
      if (this.waterCurrentTexture !== texture) this.waterCurrentTexture?.destroy(true);
      this.waterCurrentTexture = texture;
      this.waterCurrent.texture = texture ?? Texture.EMPTY;
    }
  }

  private replaceSunPath(texture: Texture | null): void {
    this.sunPathTexture?.destroy(true);
    this.sunPathTexture = texture;
    this.sunPath.texture = texture ?? Texture.EMPTY;
    this.sunPath.x = Math.round(this.shimmerX * this.width) - this.shimmerHalfWidth;
  }

  /** Where a highlight sits: the cone widens as it comes towards the viewer. */
  private glintX(glint: Glint): number {
    const spread = this.shimmerHalfWidth * (0.2 + 0.8 * glint.depth);
    return Math.round(this.shimmerX * this.width + glint.offset * spread);
  }

  private layoutShimmer(): void {
    this.sunPath.x = Math.round(this.shimmerX * this.width) - this.shimmerHalfWidth;

    for (const glint of this.glints) {
      glint.sprite.x = this.glintX(glint);
      glint.sprite.y = Math.round(glint.depth * (this.height - 1));
    }
  }
}
