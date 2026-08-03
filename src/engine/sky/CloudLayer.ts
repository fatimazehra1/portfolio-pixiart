import { Container, Sprite } from "pixi.js";
import { createCloudShape, type CloudShapeTextures } from "./textures";
import { createRandom, range, rangeInt } from "./random";
import type { CloudLayerConfig, CloudTones } from "./types";

interface Cloud {
  view: Container;
  /** Sub-pixel horizontal position; snapped to whole sky pixels when drawn. */
  x: number;
  y: number;
  /** Per-cloud speed jitter so a layer never marches in lockstep. */
  speed: number;
  /** Width of the shape currently assigned — needed to place a mirrored cloud. */
  width: number;
  /** -1 draws the shape mirrored, doubling the apparent variety for free. */
  flip: 1 | -1;
  body: Sprite;
  shadow: Sprite;
  highlight: Sprite;
}

/**
 * One band of drifting clouds.
 *
 * Three of these stacked at different speeds, sizes and heights *are* the
 * parallax: background clouds sit low near the horizon, are physically smaller
 * and crawl; foreground clouds ride high overhead, are large and drift
 * noticeably faster. Within a band, every cloud draws from a pool of generated
 * silhouettes, faces either way, and carries its own weight and speed.
 *
 * Two rules keep it pixel-perfect:
 *   - sprites are never scaled — each layer generates its shapes at the exact
 *     pixel size it needs, so a "small" cloud is genuinely fewer pixels, not a
 *     resampled big one;
 *   - positions are snapped to whole sky pixels before drawing, so clouds move
 *     in pixel steps rather than sliding across a sub-pixel grid.
 */
export class CloudLayer {
  readonly container = new Container();

  private readonly config: CloudLayerConfig;
  private readonly rand: () => number;
  private readonly shapes: CloudShapeTextures[];
  private readonly clouds: Cloud[] = [];

  /** Distance a cloud travels before it recycles to the far side. */
  private recycleSpan = 0;
  private skyWidth = 0;
  private skyHeight = 0;
  private parallaxOffset = 0;

  /**
   * @param shapes optional authored cloud art. Omit and the layer generates its
   *   own — see TODO(assets) in textures.ts.
   */
  constructor(config: CloudLayerConfig, seed: number, shapes?: CloudShapeTextures[]) {
    this.config = config;
    this.rand = createRandom(seed);
    this.container.label = `sky:clouds:${config.name}`;
    this.container.alpha = config.alpha;

    this.shapes =
      shapes ??
      Array.from({ length: config.shapes }, () =>
        createCloudShape(config.cloudWidth, config.cloudHeight, this.rand)
      );

    for (let i = 0; i < config.count; i++) {
      this.clouds.push(this.createCloud());
    }
  }

  /** Recompute the drift track and re-scatter the clouds across the new sky. */
  resize(skyWidth: number, skyHeight: number): void {
    this.skyWidth = skyWidth;
    this.skyHeight = skyHeight;

    // The track has to be at least a screen plus a cloud, or a recycled cloud
    // would pop into view instead of easing in from off-screen.
    const spacing = Math.max(
      this.config.cloudWidth * 1.5,
      (skyWidth + this.config.cloudWidth * 2) / this.config.count
    );
    this.recycleSpan = spacing * this.config.count;

    this.clouds.forEach((cloud, i) => {
      cloud.x = wrap(i * spacing + range(this.rand, 0, spacing * 0.4), this.recycleSpan);
      cloud.y = this.pickY();
    });

    this.draw();
  }

  /** Advance the drift. `delta` is seconds; speeds are sky pixels per second. */
  update(delta: number): void {
    if (this.recycleSpan <= 0) return;

    for (const cloud of this.clouds) {
      // Wind blows in off the sea, right to left.
      cloud.x -= cloud.speed * delta;

      if (cloud.x < -this.config.cloudWidth) {
        cloud.x += this.recycleSpan;
        // Safely off-screen: reshuffle so the sky never visibly repeats itself.
        cloud.y = this.pickY();
        this.assignShape(cloud);
      }
    }

    this.draw();
  }

  /** Retint every cloud. Called each frame while a time-of-day change is in flight. */
  setTones(tones: CloudTones, alpha: number): void {
    this.container.alpha = alpha * this.config.alpha;

    for (const cloud of this.clouds) {
      cloud.body.tint = tones.mid;
      cloud.shadow.tint = tones.shadow;
      cloud.highlight.tint = tones.highlight;
    }
  }

  /**
   * Shift the layer against camera movement. Depth decides how much: the far
   * band barely reacts, the near band tracks almost one-to-one.
   *
   * The offset is folded into each cloud's own wrapped position rather than
   * shifting the whole container. Sliding the container would drag the entire
   * cloud field off the side of a world this wide and leave an empty sky
   * behind it; wrapping per cloud keeps the field endless.
   */
  setParallax(viewX: number): void {
    this.parallaxOffset = -viewX * this.config.depth;
    this.draw();
  }

  destroy(): void {
    for (const shape of this.shapes) {
      shape.body.destroy(true);
      shape.shadow.destroy(true);
      shape.highlight.destroy(true);
    }
    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  private createCloud(): Cloud {
    const view = new Container();

    // Draw order is the shading order: body, then belly, then lit crown.
    const body = new Sprite();
    const shadow = new Sprite();
    const highlight = new Sprite();
    view.addChild(body, shadow, highlight);
    this.container.addChild(view);

    const cloud: Cloud = {
      view,
      body,
      shadow,
      highlight,
      x: 0,
      y: 0,
      width: 0,
      flip: 1,
      speed: this.config.speed * range(this.rand, 0.82, 1.18),
    };

    this.assignShape(cloud);
    return cloud;
  }

  /** Give a cloud a shape, a facing and its own weight in the band. */
  private assignShape(cloud: Cloud): void {
    const shape = this.shapes[rangeInt(this.rand, 0, this.shapes.length - 1)];
    cloud.body.texture = shape.body;
    cloud.shadow.texture = shape.shadow;
    cloud.highlight.texture = shape.highlight;
    cloud.width = shape.width;

    // Mirroring is exact at nearest-neighbour with integer positions, so it
    // costs nothing and no two neighbours have to share a silhouette.
    cloud.flip = this.rand() < 0.5 ? -1 : 1;
    cloud.view.scale.x = cloud.flip;

    // A band of identically-weighted clouds reads as one flat sheet.
    const jitter = this.config.alphaJitter;
    cloud.view.alpha = 1 + range(this.rand, -jitter, jitter);
  }

  private pickY(): number {
    const [from, to] = this.config.yRange;
    return Math.round(range(this.rand, from, to) * this.skyHeight);
  }

  /** Snap to whole sky pixels — sub-pixel positions would blur the pixel grid. */
  private draw(): void {
    const span = this.recycleSpan;
    const box = this.config.cloudWidth;

    for (const cloud of this.clouds) {
      let x = cloud.x + this.parallaxOffset;

      // Wrap into [-box, span - box). Both ends of that range are off-screen,
      // because the track is always at least a screen plus two clouds long — so
      // a cloud can never be seen jumping from one side to the other.
      if (span > 0) x = wrap(x + box, span) - box;

      // A mirrored container draws to the left of its origin, so shift it back
      // by its own width to keep `x` meaning the same edge either way.
      cloud.view.x = Math.round(x) + (cloud.flip === -1 ? cloud.width : 0);
      cloud.view.y = cloud.y;
    }
  }
}

function wrap(value: number, span: number): number {
  return span <= 0 ? value : ((value % span) + span) % span;
}
