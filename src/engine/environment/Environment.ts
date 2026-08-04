import { Container } from "pixi.js";
import { PropFactory } from "./PropFactory";
import { generate, standProps } from "./EnvironmentGenerator";
import type { Prop, PropView } from "./Prop";
import {
  BASELINES,
  DEFAULT_CULL_MARGIN,
  DEFAULT_PIXEL_HEIGHT,
  DEFAULT_PLOTS,
  DEFAULT_SEED,
  KINDS,
  KIND_TONES,
  MATERIALS,
  PETALS,
  PROP_KINDS,
  type EnvironmentOptions,
  type GroundAnchors,
  type KindConfig,
  type MaterialName,
  type PropKind,
} from "./EnvironmentConfig";
import { applyAmbient } from "../lighting";
import type { LightingState } from "../lighting";
import type { GroundBand, PlotArea } from "../ground";

/**
 * Something that hands out the state of the light and lets you listen to it.
 *
 * Structural rather than the concrete `LightingSystem`, and deliberately not the
 * clock — props are lit by the world's ambient, and lamps burn on what that
 * ambient leaves over for local sources. The chain is clock → day/night →
 * lighting → this, one way.
 */
export interface LightingSource {
  subscribe(listener: (state: LightingState) => void): () => void;
}

/** Bands back to front, so a bush at your feet covers a rock up the beach. */
const BAND_ORDER = (Object.keys(BASELINES) as GroundBand[]).sort(
  (a, b) => BASELINES[a] - BASELINES[b]
);

/** First index whose x is at or past `target`. Props are sorted west to east. */
function lowerBound(props: readonly Prop[], target: number): number {
  let lo = 0;
  let hi = props.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (props[mid].x < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The Environment — everything growing on, standing on, or washed up on the
 * shore.
 *
 * Trees, bushes, rocks, wildflowers, tall grass, benches, sign posts, street
 * lamps, fencing and driftwood. Not ten one-off objects: ten *kinds*, each with
 * several drawings, placed by one generator and drawn by one pooled renderer.
 * Adding an eleventh is a config entry and a bitmap.
 *
 * # Thousands of props
 * The world holds every prop as a flat record and gives sprites only to the ones
 * on screen. As the camera moves, a window slides along an array sorted west to
 * east: props leaving the window hand their sprites straight to props entering
 * it, so panning the whole shore allocates nothing after the first screenful.
 * Cost per frame is proportional to what you can *see*, not to what exists —
 * which is what makes the difference between a thousand props and ten thousand
 * a memory question rather than a frame-rate one.
 *
 * Drawings are shared: two hundred tufts of grass are two hundred positions and
 * five textures.
 *
 * # Same seed, same shore
 * Placement is deterministic from the seed and never touches `Math.random`.
 * Density comes from a low-frequency field per kind rather than from even
 * spacing, so the shore has copses and clearings and thickets, and the empty
 * stretches are as deliberate as the full ones.
 *
 * # What moves
 * Grass and flowers sway, bushes stir, tree canopies move while their trunks
 * stand still, and lamps flicker after dark. Everything else is stone and dead
 * wood and stays put. All of it is driven by shared elapsed time and a per-prop
 * phase, so a prop that has been off screen for a minute comes back exactly
 * where it would have been (ART_DIRECTION.md §Animation Rules — everything
 * should breathe, subtly; nothing bounces).
 *
 * # Usage
 * ```ts
 * const environment = new Environment({
 *   width, height,
 *   worldWidth: WORLD_WIDTH,
 *   pixelScale: sky.pixelScale,
 *   anchors: { shorelineY: ground.topY, groundHeight },
 * });
 * app.stage.addChildAt(environment.container, 3);
 * const off = environment.bindLighting(lightingManager);
 * app.ticker.add((t) => environment.update(t.deltaMS / 1000));
 * environment.setViewOffset(viewLeft);
 * ```
 *
 * No physics, no interaction, no dialogue.
 */
export class Environment {
  /** Mount this in front of the ground. */
  readonly container = new Container();

  private readonly factory: PropFactory;
  private readonly bands = new Map<GroundBand, Container>();

  private readonly seed: number;
  private readonly plots: readonly PlotArea[];
  private readonly scheme: Record<PropKind, KindConfig>;
  private readonly motionScale: number;
  private readonly cullMargin: number;
  private readonly fixedPixelScale: number | undefined;
  private readonly worldWidthCss: number | undefined;

  /** Every prop in the world, sorted west to east. */
  private props: Prop[] = [];
  /** Views on loan, by prop index. Sparse — only the window is populated. */
  private views: (PropView | null)[] = [];

  /** The half-open index range currently holding views. */
  private lo = 0;
  private hi = 0;

  private pixelScaleValue = 1;
  private worldPixels = 0;
  private viewportPixels = 0;
  private anchors: GroundAnchors;
  private viewOffset = 0;

  private elapsed = 0;
  private lighting: LightingState | null = null;
  private unsubscribe: (() => void) | null = null;

  /** Every material, lit for the current moment. Recomputed only when it changes. */
  private lit: Record<MaterialName, number>;

  constructor(options: EnvironmentOptions) {
    this.seed = options.seed ?? DEFAULT_SEED;
    this.plots = options.plots ?? DEFAULT_PLOTS;
    this.motionScale = Math.max(0, options.motionScale ?? 1);
    this.cullMargin = options.cullMargin ?? DEFAULT_CULL_MARGIN;
    this.fixedPixelScale = options.pixelScale;
    this.worldWidthCss = options.worldWidth;
    this.anchors = options.anchors;

    this.scheme = mergeScheme(options.kinds);
    this.factory = new PropFactory({ seed: this.seed });
    this.lit = { ...MATERIALS };

    this.container.label = "environment";
    this.container.eventMode = "none";

    for (const band of BAND_ORDER) {
      const layer = new Container();
      layer.label = `environment:${band}`;
      layer.eventMode = "none";
      // Only the jitter inside a band needs sorting; the bands themselves are
      // already in the right order, which is most of the depth problem solved
      // for the cost of six containers.
      layer.sortableChildren = true;
      this.bands.set(band, layer);
      this.container.addChild(layer);
    }

    this.resize(options.width, options.height, options.anchors);
  }

  // --- Queries ---------------------------------------------------------------

  /** Whole screen pixels per world pixel. Matches the sky's. */
  get pixelScale(): number {
    return this.pixelScaleValue;
  }

  /** Every prop in the world. Read-only — the generator owns this. */
  get all(): readonly Prop[] {
    return this.props;
  }

  /**
   * What it currently costs.
   *
   * `total` is the size of the world, `visible` is what is being drawn, and the
   * gap between them is the point of the whole design.
   */
  get stats(): {
    total: number;
    visible: number;
    views: number;
    drawings: number;
  } {
    return {
      total: this.props.length,
      visible: this.hi - this.lo,
      views: this.factory.pooled,
      drawings: this.factory.baked,
    };
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Follow the world's lighting. Returns an unsubscribe function.
   *
   * Fires immediately with the current light, so a shore built at midnight has
   * its lamps burning on its first frame.
   */
  bindLighting(source: LightingSource): () => void {
    this.unsubscribe?.();

    this.unsubscribe = source.subscribe((state) => {
      this.applyLighting(state);
    });

    return () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
    };
  }

  /**
   * Take a lighting reading, without subscribing to anything.
   *
   * Every material is lit once here — two dozen colours — and the visible props
   * then just read from the result. Lighting a thousand props individually would
   * be a thousand times the work for exactly the same answer.
   */
  applyLighting(state: LightingState): void {
    this.lighting = state;

    const lit = {} as Record<MaterialName, number>;
    for (const name of Object.keys(MATERIALS) as MaterialName[]) {
      lit[name] = applyAmbient(MATERIALS[name], state);
    }
    this.lit = lit;

    const local = state.localLightMultiplier;

    for (let i = this.lo; i < this.hi; i++) {
      const view = this.views[i];
      if (!view) continue;

      this.tone(view, this.props[i]);
      view.setActivation(local);
      // Pushed rather than left to `update`, so a lamp is right even under
      // reduced motion, where the clock this animates against never advances.
      if (this.props[i].motion === "flicker") view.animate(this.elapsed);
    }
  }

  /** Feed the environment the camera's horizontal position, in world CSS pixels. */
  setViewOffset(x: number): void {
    this.viewOffset = x;
    // Rounded to the shared pixel grid, exactly as the ground rounds it, so the
    // planting and the beach it grows out of move as one thing.
    this.container.x = -Math.round(x / this.pixelScaleValue) * this.pixelScaleValue;
    this.updateWindow();
  }

  /** Re-fit to a new viewport, in CSS pixels. */
  resize(width: number, height: number, anchors: GroundAnchors = this.anchors): void {
    if (width <= 0 || height <= 0) return;

    this.anchors = anchors;

    const scale = this.fixedPixelScale ?? Math.max(1, Math.floor(height / DEFAULT_PIXEL_HEIGHT));
    const worldPixels = Math.ceil((this.worldWidthCss ?? width) / scale);

    this.viewportPixels = Math.ceil(width / scale);

    // The world is only re-grown when the pixel grid itself changes — which is
    // the one case where "the same world" genuinely means something different,
    // because a coarser grid fits fewer props of the same pixel size along the
    // same shore. Every other resize just re-stands what is already there.
    const regrow = scale !== this.pixelScaleValue || worldPixels !== this.worldPixels;

    this.pixelScaleValue = scale;
    this.worldPixels = worldPixels;
    this.container.scale.set(scale);

    if (regrow) {
      this.release();
      this.props = generate({
        worldWidth: worldPixels,
        seed: this.seed,
        plots: this.plots,
        kinds: this.scheme,
      });
      this.views = new Array<PropView | null>(this.props.length).fill(null);
    }

    standProps(this.props, anchors.shorelineY / scale, anchors.groundHeight / scale);

    // Baselines have moved, so anything still on screen has to be re-stood.
    if (!regrow) {
      for (let i = this.lo; i < this.hi; i++) {
        const view = this.views[i];
        if (view) this.place(view, this.props[i], i);
      }
    }

    this.setViewOffset(this.viewOffset);
  }

  /**
   * Advance the idle animation. `delta` is in seconds.
   *
   * Walks only what is on screen, and only the part of that which moves. A world
   * of ten thousand props costs the same here as a world of one thousand.
   */
  update(delta: number): void {
    const step = delta * this.motionScale;
    if (step <= 0) return;

    this.elapsed += step;

    for (let i = this.lo; i < this.hi; i++) {
      const prop = this.props[i];
      if (prop.motion === "none") continue;

      const view = this.views[i];
      if (view) view.animate(this.elapsed);
    }
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;

    this.release();
    this.factory.destroy();
    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  /** Work out which props are on screen, and hand the sprites around. */
  private updateWindow(): void {
    if (this.props.length === 0) return;

    const margin = this.cullMargin / this.pixelScaleValue;
    const left = this.viewOffset / this.pixelScaleValue - margin;
    const right = left + this.viewportPixels + margin * 2;

    const nextLo = lowerBound(this.props, left);
    const nextHi = lowerBound(this.props, right);

    if (nextLo === this.lo && nextHi === this.hi) return;

    if (nextLo >= this.hi || nextHi <= this.lo) {
      // A jump rather than a pan — nothing in common, so swap the lot.
      for (let i = this.lo; i < this.hi; i++) this.deactivate(i);
      for (let i = nextLo; i < nextHi; i++) this.activate(i);
    } else {
      // A pan. Only the two ends changed, so only the two ends are touched —
      // this is what keeps a full traverse of the shore free of allocation.
      for (let i = this.lo; i < nextLo; i++) this.deactivate(i);
      for (let i = nextHi; i < this.hi; i++) this.deactivate(i);
      for (let i = nextLo; i < this.lo; i++) this.activate(i);
      for (let i = this.hi; i < nextHi; i++) this.activate(i);
    }

    this.lo = nextLo;
    this.hi = nextHi;
  }

  private activate(index: number): void {
    if (this.views[index]) return;

    const prop = this.props[index];
    const view = this.factory.acquire();
    const textures = this.factory.textures(prop.kind, prop.variant);
    const glow = prop.motion === "flicker" ? this.factory.glowTexture() : null;

    view.bind(prop, textures, glow);
    this.tone(view, prop);
    view.setActivation(this.lighting?.localLightMultiplier ?? 0);
    view.animate(this.elapsed);

    this.bands.get(prop.band)?.addChild(view.container);
    this.views[index] = view;
  }

  private deactivate(index: number): void {
    const view = this.views[index];
    if (!view) return;

    view.container.removeFromParent();
    this.factory.release(view);
    this.views[index] = null;
  }

  /** Re-stand a bound view after the ground has moved under it. */
  private place(view: PropView, prop: Prop, index: number): void {
    const textures = this.factory.textures(prop.kind, prop.variant);
    const glow = prop.motion === "flicker" ? this.factory.glowTexture() : null;
    view.bind(prop, textures, glow);
    this.tone(view, prop);
    view.setActivation(this.lighting?.localLightMultiplier ?? 0);
    view.animate(this.elapsed);
    this.views[index] = view;
  }

  /** Light one prop from the pre-lit material table. */
  private tone(view: PropView, prop: Prop): void {
    const tones = KIND_TONES[prop.kind];
    // Flowers are the one kind whose lit tone varies by variant — a meadow all
    // one colour is a lawn.
    const light =
      prop.kind === "flower"
        ? this.lit[PETALS[prop.variant % PETALS.length]]
        : this.lit[tones.light];

    view.setTones(this.lit[tones.base], light, this.lit[tones.dark]);
  }

  /** Hand every view back. Leaves the props themselves alone. */
  private release(): void {
    for (let i = this.lo; i < this.hi; i++) this.deactivate(i);
    this.lo = 0;
    this.hi = 0;
  }
}

/** Fold per-kind overrides over the shore's own scheme. */
function mergeScheme(
  overrides: Partial<Record<PropKind, Partial<KindConfig>>> | undefined
): Record<PropKind, KindConfig> {
  if (!overrides) return KINDS;

  const merged = {} as Record<PropKind, KindConfig>;
  for (const kind of PROP_KINDS) {
    merged[kind] = { ...KINDS[kind], ...overrides[kind] };
  }
  return merged;
}
