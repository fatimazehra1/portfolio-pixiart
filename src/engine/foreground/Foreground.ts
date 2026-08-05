import { Container, Sprite } from "pixi.js";
import { SilhouetteFactory, sizeFor } from "./SilhouetteFactory";
import {
  DEFAULT_CULL_MARGIN,
  DEFAULT_PIXEL_HEIGHT,
  DEFAULT_SEED,
  SILHOUETTES,
  SILHOUETTE_BASE,
  SILHOUETTE_KINDS,
  SILHOUETTE_TINT,
} from "./ForegroundConfig";
import type { SilhouetteKind } from "./ForegroundConfig";
import { createRandom, pixelScaleFor, range } from "../shared";
import { lerpColor } from "../sky";
import type { LightingState } from "../lighting";
import type { GradeManager } from "../grade";

/** One silhouette in the world. Data only; a sprite is lent to it on screen. */
interface Silhouette {
  kind: SilhouetteKind;
  variant: number;
  /** Position in world art pixels. */
  x: number;
  /** Foot position, in art pixels from the top of the field. */
  y: number;
  width: number;
  height: number;
  flip: boolean;
  swayAmount: number;
  swayRate: number;
  swayPhase: number;
}

export interface ForegroundOptions {
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
  /** Total width of the world in CSS pixels. */
  worldWidth: number;
  /** Pass the sky's `pixelScale` so the shapes land on the shared grid. */
  pixelScale?: number;
  motionScale?: number;
  seed?: number;
  cullMargin?: number;
  /** Per-kind spacing multipliers, for tuning density. */
  density?: Partial<Record<SilhouetteKind, number>>;
}

/**
 * The near foreground.
 *
 * Silhouettes rooted at and below the bottom edge of the view, moving faster
 * than the town behind them. See `ForegroundConfig` for why the layer exists at
 * all; in short, it is what stops a side view reading as a diorama.
 *
 * # The same shape as the environment
 * Deliberately: every silhouette in the world is held as data, sorted west to
 * east, and only the ones on screen are given sprites. The world can carry as
 * many as it likes and the cost is the width of the window, not the width of
 * the coast. This is the third system to use that pattern, which is a fair
 * argument that it should eventually be lifted somewhere shared — but not
 * today, and not as part of a refactor that already touches this much.
 *
 * # Where it sits
 * In the stack's `foreground` layer, at parallax > 1. It never sets its own
 * position: the layer carries it, exactly as the camera carries the land.
 */
export class Foreground {
  /** Mount into the `foreground` layer. */
  readonly container = new Container();

  private readonly factory: SilhouetteFactory;
  private readonly fixedPixelScale: number | undefined;
  private readonly worldWidthCss: number;
  private readonly motionScale: number;
  private readonly cullMargin: number;
  private readonly seed: number;
  private readonly density: Partial<Record<SilhouetteKind, number>>;

  /** Every silhouette in the world, sorted west to east. */
  private items: Silhouette[] = [];
  /** Sprites on loan, by index. Sparse — only the window is populated. */
  private views: (Sprite | null)[] = [];
  /** Sprites not currently lent to anything. */
  private pool: Sprite[] = [];

  /** The half-open index range currently holding sprites. */
  private lo = 0;
  private hi = 0;

  private pixelScaleValue = 1;
  private worldPixels = 0;
  private viewportPixels = 0;
  private fieldHeight = 0;
  private viewOffset = 0;
  private elapsed = 0;

  private tint = SILHOUETTE_BASE;
  private unbindLighting: (() => void) | null = null;

  constructor(options: ForegroundOptions) {
    this.fixedPixelScale = options.pixelScale;
    this.worldWidthCss = options.worldWidth;
    this.motionScale = Math.max(0, options.motionScale ?? 1);
    this.cullMargin = options.cullMargin ?? DEFAULT_CULL_MARGIN;
    this.seed = options.seed ?? DEFAULT_SEED;
    this.density = options.density ?? {};

    this.factory = new SilhouetteFactory(this.seed);

    this.container.label = "foreground";
    this.container.eventMode = "none";

    this.resize(options.width, options.height);
  }

  // --- Queries ---------------------------------------------------------------

  /** How many silhouettes exist in the whole world. */
  get count(): number {
    return this.items.length;
  }

  /** How many are on screen. The number that actually costs anything. */
  get visible(): number {
    return this.hi - this.lo;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Where the view is, in world CSS pixels.
   *
   * Culling only. The `foreground` layer moves this system; it does not move
   * itself, for the same reason nothing else inside the camera does.
   */
  setViewOffset(x: number): void {
    this.viewOffset = x;
    this.updateWindow();
  }

  /** Re-fit to a new viewport, in CSS pixels. */
  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;

    this.pixelScaleValue = this.fixedPixelScale ?? pixelScaleFor(height, DEFAULT_PIXEL_HEIGHT);
    this.container.scale.set(this.pixelScaleValue);

    this.worldPixels = Math.ceil(this.worldWidthCss / this.pixelScaleValue);
    this.viewportPixels = Math.ceil(width / this.pixelScaleValue);
    this.fieldHeight = Math.ceil(height / this.pixelScaleValue);

    this.grow();
    this.rewindow();
  }

  /**
   * Follow the graded light.
   *
   * The graded one rather than the global: a silhouette standing in front of an
   * abandoned, colour-drained chapter should be drained too. It is the nearest
   * thing to the viewer, so it is the last thing that should look like it
   * belongs to a different scene.
   */
  bindLighting(grade: GradeManager): () => void {
    this.unbindLighting?.();
    this.unbindLighting = grade.subscribe((state) => this.applyLighting(state));
    return () => {
      this.unbindLighting?.();
      this.unbindLighting = null;
    };
  }

  applyLighting(state: LightingState): void {
    // Dark, but carrying a little of whatever colour the light is. Never lit in
    // the ordinary sense — a silhouette that answered the ambient properly
    // would stop being a silhouette around noon.
    this.tint = lerpColor(SILHOUETTE_BASE, state.ambientTint, SILHOUETTE_TINT * state.tintStrength * 2);
    for (const sprite of this.views) if (sprite) sprite.tint = this.tint;
  }

  /** Advance the sway. `delta` is in seconds. */
  update(delta: number): void {
    const step = delta * this.motionScale;
    if (step <= 0) return;

    this.elapsed += step;

    for (let i = this.lo; i < this.hi; i += 1) {
      const sprite = this.views[i];
      if (!sprite) continue;
      const item = this.items[i];
      if (item.swayAmount <= 0) continue;

      const sway = item.swayAmount * Math.sin(this.elapsed * item.swayRate + item.swayPhase);
      sprite.x = Math.round(item.x + sway);
    }
  }

  destroy(): void {
    this.unbindLighting?.();
    this.unbindLighting = null;
    this.factory.destroy();
    this.container.destroy({ children: true });
    this.items = [];
    this.views = [];
    this.pool = [];
  }

  // --- Internal --------------------------------------------------------------

  /**
   * Grow the whole world's foreground from the seed.
   *
   * Deterministic: the same seed always produces the same shoreline, which is
   * what makes a screenshot comparable to the one taken before a refactor.
   * Each kind walks the coast independently at its own average spacing, so the
   * result is a mixture rather than a repeating pattern of one-of-each.
   */
  private grow(): void {
    const items: Silhouette[] = [];

    for (const kind of SILHOUETTE_KINDS) {
      const config = SILHOUETTES[kind];
      const multiplier = this.density[kind] ?? 1;
      if (multiplier <= 0) continue;

      const spacing = (config.spacing / this.pixelScaleValue) / multiplier;
      const minGap = config.minGap / this.pixelScaleValue;
      const rand = createRandom(this.seed ^ hash(kind));

      let x = rand() * spacing;
      while (x < this.worldPixels) {
        const { width, height } = sizeFor(kind, rand);
        const [rootFrom, rootTo] = config.rooting;
        // Rooted below the bottom edge, by a fraction of its own height. That
        // overhang is the reason it reads as *in front of* the frame rather
        // than as one more row of scenery standing on the ground.
        const buried = height * range(rand, rootFrom, rootTo);

        items.push({
          kind,
          variant: Math.floor(rand() * config.variants),
          x: Math.round(x),
          y: Math.round(this.fieldHeight - height + buried),
          width,
          height,
          flip: rand() < 0.5,
          swayAmount: range(rand, config.sway.amount[0], config.sway.amount[1]),
          swayRate: range(rand, config.sway.rate[0], config.sway.rate[1]),
          swayPhase: rand() * Math.PI * 2,
        });

        x += Math.max(minGap, spacing * range(rand, 0.45, 1.75));
      }
    }

    items.sort((a, b) => a.x - b.x);
    this.items = items;
    this.views = new Array(items.length).fill(null);
  }

  /** Drop every sprite and re-fill the window from scratch. */
  private rewindow(): void {
    for (let i = this.lo; i < this.hi; i += 1) this.release(i);
    this.lo = 0;
    this.hi = 0;
    this.updateWindow();
  }

  /**
   * Lend sprites to what is on screen and take them back from what isn't.
   *
   * Walks only the edges of the window, so panning costs a handful of
   * assignments per frame regardless of how long the coast is.
   */
  private updateWindow(): void {
    if (this.items.length === 0) return;

    const margin = this.cullMargin / this.pixelScaleValue;
    // The layer moves faster than the world, so what is on screen is not the
    // slice of world the camera is over — it is that slice scaled by the
    // parallax. Culling against the camera's own window would take sprites
    // away from silhouettes that are still visibly on screen.
    const centre = this.viewOffset / this.pixelScaleValue;
    const left = centre - margin;
    const right = centre + this.viewportPixels + margin;

    const lo = lowerBound(this.items, left);
    const hi = lowerBound(this.items, right);

    for (let i = this.lo; i < Math.min(lo, this.hi); i += 1) this.release(i);
    for (let i = Math.max(hi, this.lo); i < this.hi; i += 1) this.release(i);
    for (let i = lo; i < hi; i += 1) if (!this.views[i]) this.acquire(i);

    this.lo = lo;
    this.hi = hi;
  }

  private acquire(index: number): void {
    const item = this.items[index];
    const sprite = this.pool.pop() ?? new Sprite();

    sprite.texture = this.factory.get(item.kind, item.variant, item.width, item.height);
    sprite.eventMode = "none";
    sprite.tint = this.tint;
    sprite.x = item.x;
    sprite.y = item.y;
    sprite.scale.x = item.flip ? -1 : 1;
    sprite.anchor.set(item.flip ? 1 : 0, 0);
    sprite.visible = true;

    this.views[index] = sprite;
    this.container.addChild(sprite);
  }

  private release(index: number): void {
    const sprite = this.views[index];
    if (!sprite) return;
    this.container.removeChild(sprite);
    this.views[index] = null;
    this.pool.push(sprite);
  }
}

/** First index whose x is >= value. The items are sorted. */
function lowerBound(items: readonly Silhouette[], value: number): number {
  let lo = 0;
  let hi = items.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].x < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** A small stable hash, so each kind walks the coast on its own sequence. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
