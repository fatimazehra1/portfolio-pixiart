import { Container, Sprite, Texture } from "pixi.js";
import { createFoamTexture } from "./textures";
import { createRandom } from "./random";

/** One strand of the foam line: its own tile, speed and weight. */
interface Strand {
  tiles: Container;
  sprites: Sprite[];
  texture: Texture;
  tileWidth: number;
  speed: number;
  direction: 1 | -1;
  alpha: number;
  y: number;
  bobRate: number;
  scroll: number;
}

/** Two strands at different speeds. One alone reads as a moving dashed rule. */
const STRANDS = [
  { tileWidth: 104, speed: 3.4, direction: -1 as const, alpha: 1, y: 0, bobRate: 0.5 },
  { tileWidth: 136, speed: 2.1, direction: 1 as const, alpha: 0.55, y: 1, bobRate: 0.37 },
];

/** Strand height in sky pixels. Thin, per the brief. */
const STRAND_HEIGHT = 3;

/**
 * The thin line of foam along the ocean's top edge.
 *
 * Two broken strands drift across each other at different speeds and in
 * opposite directions. That crossing is the entire point: a single scrolling
 * dashed line reads as a marquee border, while two sliding over one another
 * read as light catching moving water. Each strand tile repeats exactly, so
 * the line runs to both edges of the world without a seam.
 *
 * White masks, tinted at runtime — the foam picks up the horizon's colour and
 * follows the time of day without re-baking.
 *
 * TODO(assets): the strand pattern is generated. Pass `textures` to swap in
 * authored art — see TODO(assets) in textures.ts.
 */
export class FoamLayer {
  readonly container = new Container();

  private readonly strands: Strand[] = [];
  private readonly ownsTextures: boolean;
  private elapsed = 0;

  constructor(seed: number, textures?: Texture[]) {
    this.container.label = "ocean:foam";
    this.ownsTextures = textures === undefined;

    const rand = createRandom(seed);

    STRANDS.forEach((config, i) => {
      const tiles = new Container();
      this.container.addChild(tiles);

      this.strands.push({
        tiles,
        sprites: [],
        texture: textures?.[i] ?? createFoamTexture(config.tileWidth, STRAND_HEIGHT, rand),
        tileWidth: config.tileWidth,
        speed: config.speed,
        direction: config.direction,
        alpha: config.alpha,
        y: config.y,
        bobRate: config.bobRate,
        scroll: 0,
      });
    });
  }

  /** Lay out enough tiles per strand to cover the width, plus one to spare. */
  resize(oceanWidth: number): void {
    for (const strand of this.strands) {
      const needed = Math.ceil(oceanWidth / strand.tileWidth) + 2;

      while (strand.sprites.length < needed) {
        const sprite = new Sprite(strand.texture);
        sprite.alpha = strand.alpha;
        strand.tiles.addChild(sprite);
        strand.sprites.push(sprite);
      }
      while (strand.sprites.length > needed) {
        strand.sprites.pop()?.destroy();
      }

      strand.sprites.forEach((sprite, i) => {
        sprite.x = i * strand.tileWidth;
      });
    }

    this.draw();
  }

  /** Drift the strands. `delta` is seconds. */
  update(delta: number, speedScale: number): void {
    this.elapsed += delta;

    for (const strand of this.strands) {
      strand.scroll += strand.direction * strand.speed * speedScale * delta;
      const period = strand.tileWidth;
      strand.scroll = ((strand.scroll % period) + period) % period;
    }

    this.draw();
  }

  setTone(color: number, alpha: number): void {
    this.container.alpha = alpha;
    this.container.visible = alpha > 0.001;

    for (const strand of this.strands) {
      for (const sprite of strand.sprites) sprite.tint = color;
    }
  }

  destroy(): void {
    if (this.ownsTextures) {
      for (const strand of this.strands) strand.texture.destroy(true);
    }
    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  private draw(): void {
    for (const strand of this.strands) {
      // Start one tile left so the wrap always has material to scroll in.
      strand.tiles.x = Math.round(strand.scroll) - strand.tileWidth;
      // Rides the same gentle swell as the waves below it.
      strand.tiles.y = strand.y + Math.round(Math.sin(this.elapsed * strand.bobRate));
    }
  }
}
