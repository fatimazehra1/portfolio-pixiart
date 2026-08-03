import { Container, Sprite } from "pixi.js";
import { createWaveTextures, type WaveTextures } from "./textures";
import { createRandom } from "./random";
import type { WaveLayerConfig } from "./OceanConfig";

/**
 * One rolling swell.
 *
 * A layer is a single silhouette tile repeated across the width and scrolled
 * sideways. Because the crest profile is built from whole-number harmonics it
 * closes on itself exactly, so the tile can repeat forever and the scroll wraps
 * invisibly — the sea has no end and no seam (ART_DIRECTION.md §World Scale).
 *
 * Two sprites are drawn per tile: the body, which fades downward into the water
 * beneath it, and the lit lip along the crest. Both are white masks tinted at
 * runtime, so a layer can follow the time of day without re-baking anything.
 *
 * Pixel-perfect rules, same as everywhere else: the texture is baked at the
 * exact size it will be drawn, nothing is ever scaled, and the scroll offset
 * and bob are snapped to whole sky pixels before drawing — so a swell steps
 * across the grid rather than sliding between columns.
 */
export class WaveLayer {
  readonly container = new Container();

  private readonly config: WaveLayerConfig;
  private readonly textures: WaveTextures;
  private readonly ownsTextures: boolean;

  private readonly tiles = new Container();
  private readonly bodies: Sprite[] = [];
  private readonly crests: Sprite[] = [];

  /** Sub-pixel scroll position; wraps at one tile width. */
  private scroll = 0;
  private elapsed = 0;
  private crestY = 0;
  private parallaxOffset = 0;

  /**
   * @param oceanHeight ocean height in sky pixels — sets the band's size.
   * @param textures optional authored art. Omit and the layer bakes its own.
   */
  constructor(
    config: WaveLayerConfig,
    oceanHeight: number,
    seed: number,
    textures?: WaveTextures
  ) {
    this.config = config;
    this.container.label = `ocean:wave:${config.name}`;
    this.container.alpha = config.alpha;
    this.container.addChild(this.tiles);

    this.ownsTextures = textures === undefined;
    this.textures =
      textures ??
      createWaveTextures(
        config.tileWidth,
        Math.max(3, Math.round(oceanHeight * config.band)),
        config.amplitude,
        config.crest,
        config.harmonics,
        config.jitter,
        createRandom(seed)
      );
  }

  /** Lay out enough tiles to cover the width, plus one to scroll into view. */
  resize(oceanWidth: number, oceanHeight: number): void {
    this.crestY = Math.round(this.config.depth * oceanHeight);

    const needed = Math.ceil(oceanWidth / this.textures.width) + 2;

    while (this.bodies.length < needed) {
      const body = new Sprite(this.textures.body);
      const crest = new Sprite(this.textures.crest);
      crest.alpha = this.config.crestAlpha;
      this.tiles.addChild(body);
      this.bodies.push(body);
      this.crests.push(crest);
    }
    while (this.bodies.length > needed) {
      this.bodies.pop()?.destroy();
      this.crests.pop()?.destroy();
    }

    // Crests are added after every body so no body can paint over a lit lip.
    for (const crest of this.crests) this.tiles.addChild(crest);

    this.bodies.forEach((body, i) => {
      body.x = i * this.textures.width;
      this.crests[i].x = body.x;
    });

    this.draw();
  }

  /** Advance the swell. `delta` is seconds. */
  update(delta: number, speedScale: number): void {
    this.elapsed += delta;

    this.scroll += this.config.direction * this.config.speed * speedScale * delta;
    // Wrap at one tile: the profile is periodic, so this is invisible.
    const period = this.textures.width;
    this.scroll = ((this.scroll % period) + period) % period;

    this.draw();
  }

  /** Tint the body and its lit lip. Called per frame during a cross-fade. */
  setTones(body: number, crest: number, alphaScale: number): void {
    this.container.alpha = this.config.alpha * alphaScale;
    for (const sprite of this.bodies) sprite.tint = body;
    for (const sprite of this.crests) sprite.tint = crest;
  }

  /** Shift against camera movement — nearer swells react more. */
  setParallax(viewX: number): void {
    this.parallaxOffset = -viewX * this.config.parallax;
    this.draw();
  }

  destroy(): void {
    if (this.ownsTextures) {
      this.textures.body.destroy(true);
      this.textures.crest.destroy(true);
    }
    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  private draw(): void {
    const period = this.textures.width;

    // Drift and parallax are the same motion as far as the tiles are concerned,
    // so wrap them together. Exact, because the silhouette genuinely repeats at
    // this period — without it, panning a world this wide would drag the tiles
    // clean off the side and leave bare water.
    const shift = (((this.scroll + this.parallaxOffset) % period) + period) % period;

    // Start one tile to the left so the wrap always has material to scroll in.
    this.tiles.x = Math.round(shift) - period;

    // A single pixel of rise and fall, rounded so it steps on the grid.
    const bob = Math.round(
      Math.sin(this.elapsed * this.config.bobRate) * this.config.bob
    );
    this.tiles.y = this.crestY + bob;
  }
}
