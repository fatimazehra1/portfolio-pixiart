import { CanvasSource, Container, Sprite, Texture } from "pixi.js";
import { STAR_SIZES, STAR_TINTS, type StarSettings, type StarSize } from "./StarConfig";

/** One star. Position is normalized so a resize repositions rather than rebuilds. */
interface Star {
  sprite: Sprite;
  /** Position across the sky, 0–1. */
  nx: number;
  /** Position down the star band, 0–1. */
  ny: number;
  /** Base brightness, horizon dimming already baked in. */
  brightness: number;
  /** Twinkle phase, so no two stars breathe together. */
  phase: number;
  /** Twinkle rate, radians per second. */
  rate: number;
  /** How much of the brightness the twinkle takes. */
  depth: number;
}

/** mulberry32 — the same seed gives the same sky on every machine. */
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

/**
 * Bake the three star shapes.
 *
 * One pixel is a pixel. Two is a square. Three is a cross with dimmer arms
 * rather than a filled block — at three pixels a solid square reads as a chip
 * of something, while a cross with a bright centre reads as a star. The falloff
 * lives in the texture's alpha, so it costs nothing at runtime and survives
 * every brightness the twinkle puts through it.
 */
function createStarTextures(): Record<StarSize, Texture> {
  const shapes: Record<StarSize, number[][]> = {
    1: [[255]],
    2: [
      [255, 235],
      [235, 205],
    ],
    3: [
      [0, 110, 0],
      [110, 255, 110],
      [0, 110, 0],
    ],
  };

  const textures = {} as Record<StarSize, Texture>;

  for (const key of [1, 2, 3] as StarSize[]) {
    const rows = shapes[key];
    const size = rows.length;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Stars: 2D canvas context unavailable");

    const image = new ImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const o = (y * size + x) * 4;
        image.data[o] = 255;
        image.data[o + 1] = 255;
        image.data[o + 2] = 255;
        image.data[o + 3] = rows[y][x];
      }
    }
    ctx.putImageData(image, 0, 0);

    textures[key] = new Texture({
      source: new CanvasSource({
        resource: canvas,
        scaleMode: "nearest",
        antialias: false,
        autoGenerateMipmaps: false,
      }),
    });
  }

  return textures;
}

/** Pick a weighted entry from a table. */
function pickWeighted<T extends { weight: number }>(items: readonly T[], rand: () => number): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rand() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

/**
 * The stars themselves.
 *
 * Hundreds of one-, two- and three-pixel sprites, each with its own brightness
 * and its own slow rhythm. Nothing here scales, moves or rotates — a star is
 * put on a whole pixel once and from then on only its opacity changes, which is
 * both what the brief asks for and the reason a field this size costs nothing.
 *
 * # Holding 60 FPS
 * Three things keep four hundred sprites cheap. They are grouped by texture, so
 * the whole field batches into three draw calls rather than interleaving.
 * Nothing but alpha is ever touched after placement, so no transform is
 * recalculated. And when the field is invisible — which is most of the day —
 * the update loop returns immediately and the container is switched off, so a
 * noon sky pays nothing at all for stars.
 *
 * The field works in *sky pixels* and does not scale itself, because it is
 * mounted inside the sky's own container, which is already scaled by the whole
 * number that keeps the world pixel-perfect.
 */
export class StarField {
  readonly container = new Container();

  private readonly settings: StarSettings;
  private readonly textures: Record<StarSize, Texture>;
  private readonly stars: Star[] = [];
  private readonly rand: () => number;

  private elapsed = 0;
  private fieldAlpha = 0;
  private skyWidth = 0;
  private bandHeight = 0;

  constructor(settings: StarSettings) {
    this.settings = settings;
    this.rand = createRandom(settings.seed);
    this.textures = createStarTextures();

    this.container.label = "sky:stars";
    this.container.visible = false;

    this.build();
  }

  /** How many stars are in the field. */
  get count(): number {
    return this.stars.length;
  }

  /** Reposition every star for a new sky size. Nothing is regenerated. */
  resize(skyWidth: number, skyHeight: number): void {
    this.skyWidth = skyWidth;
    this.bandHeight = Math.max(1, Math.round(skyHeight * this.settings.horizon));

    for (const star of this.stars) {
      // Whole pixels only. A star on a half pixel is a smudge.
      star.sprite.x = Math.round(star.nx * (skyWidth - 1));
      star.sprite.y = Math.round(star.ny * (this.bandHeight - 1));
    }
  }

  /**
   * How visible the field is overall, 0–1. Driven by the day/night blend.
   *
   * At zero the container is switched off entirely rather than merely being
   * transparent, so an invisible field is skipped by the renderer as well as by
   * the update loop.
   */
  setVisibility(alpha: number): void {
    this.fieldAlpha = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
    this.container.visible = this.fieldAlpha > 0.001;
  }

  /** Advance the twinkle. `delta` is seconds. */
  update(delta: number): void {
    if (!this.container.visible) return;

    this.elapsed += delta;

    for (const star of this.stars) {
      // A slow rise and fall around the star's own brightness. `depth` is small,
      // so this reads as breathing rather than blinking.
      const wave = 0.5 + 0.5 * Math.sin(this.elapsed * star.rate + star.phase);
      star.sprite.alpha =
        star.brightness * (1 - star.depth + star.depth * wave) * this.fieldAlpha;
    }
  }

  /**
   * Apply the field's brightness without advancing the twinkle.
   *
   * Used when the sky is still — under reduced motion, or the moment the field
   * fades in while paused — so a star's own brightness still shows through.
   */
  refresh(): void {
    if (!this.container.visible) return;

    for (const star of this.stars) {
      const wave = 0.5 + 0.5 * Math.sin(this.elapsed * star.rate + star.phase);
      star.sprite.alpha =
        star.brightness * (1 - star.depth + star.depth * wave) * this.fieldAlpha;
    }
  }

  destroy(): void {
    for (const texture of Object.values(this.textures)) texture.destroy(true);
    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  /**
   * Generate the field.
   *
   * Built one size class at a time so every sprite sharing a texture is
   * adjacent in the display list, which is what lets the field batch. Draw
   * order within the field is irrelevant — they are points of light on the same
   * plane — so the grouping is free.
   */
  private build(): void {
    const { count, twinkleRate, twinkleDepth, horizon, fadeStart } = this.settings;

    // How far down the band the dimming runs, as a fraction of the band itself.
    const fadeFrom = Math.min(0.999, fadeStart / horizon);

    for (const sizeClass of STAR_SIZES) {
      const share = Math.round(count * sizeClass.weight);

      for (let i = 0; i < share; i++) {
        const nx = this.rand();
        const ny = this.rand();

        // Dim towards the horizon rather than stopping dead at it: the air
        // thickens down there, it isn't that the stars run out.
        const fade =
          ny <= fadeFrom ? 1 : 1 - (ny - fadeFrom) / Math.max(0.001, 1 - fadeFrom);

        const brightness = range(this.rand, sizeClass.brightness[0], sizeClass.brightness[1]);

        const sprite = new Sprite(this.textures[sizeClass.size]);
        sprite.tint = pickWeighted(STAR_TINTS, this.rand).color;
        sprite.alpha = 0;
        this.container.addChild(sprite);

        this.stars.push({
          sprite,
          nx,
          ny,
          brightness: brightness * fade * fade,
          phase: range(this.rand, 0, Math.PI * 2),
          rate: range(this.rand, twinkleRate[0], twinkleRate[1]),
          depth: range(this.rand, twinkleDepth[0], twinkleDepth[1]),
        });
      }
    }
  }
}
