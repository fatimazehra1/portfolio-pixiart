import { Container } from "pixi.js";
import { DEFAULT_TIME_OF_DAY } from "../sky";
import type { TimeOfDay } from "../sky";
import { PathLayer } from "./PathLayer";
import { PropLayer } from "./PropLayer";
import { Shoreline } from "./Shoreline";
import { TerrainLayer } from "./TerrainLayer";
import { makeEdge } from "./textures";
import { createRandom } from "./random";
import {
  BANDS,
  DEFAULT_PIXEL_HEIGHT,
  DEFAULT_SEED,
  DEFAULT_SHORELINE,
  DEFAULT_TRANSITION_SECONDS,
  deriveGroundPalette,
  lerpGroundPalette,
} from "./GroundConfig";
import type { GroundOptions, GroundPalette } from "./GroundConfig";
import { BUILDING_PLOTS } from "./GroundLayout";

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/**
 * The Ground — the shore the town will be built on.
 *
 * Composition, back to front: wet sand and surf at the waterline, dry sand,
 * grass, the stone path, and everything standing on the land. Read top to
 * bottom it is simply *distance*: the waterline is furthest away, the planting
 * at the bottom edge is at your feet.
 *
 * # Lit by the sky
 * Like the sea, the land has no palette of its own. Materials are declared once
 * as their own colours and then lit by whatever the sky is doing — darkened by
 * how much light there is, tinted towards the colour on the horizon. The beach
 * goes gold at sunset and blue under the moon without anyone authoring four
 * versions of it (see `deriveGroundPalette`).
 *
 * # Hand-placed
 * Every rock, flower, log, bush and fence post comes from GroundLayout, where
 * it was put deliberately. Only mottling, cobble shapes and bush silhouettes
 * are generated. The empty stretches are as authored as the clusters: four
 * plots covering roughly three fifths of the shore are held clear for
 * buildings, and `plots` reports where they are so whatever builds there later
 * doesn't have to repeat the layout.
 *
 * # Pixel-perfect
 * Draws into the same internal grid as the sky and the sea and is scaled up by
 * the same whole number — pass the sky's `pixelScale`. Every edge on the shore
 * is an uneven per-column line rather than a straight seam, and every prop is
 * snapped to the grid.
 *
 * # Usage
 * ```ts
 * const ground = new Ground({ width, height, pixelScale: sky.pixelScale });
 * app.stage.addChildAt(ground.container, 2);   // in front of the ocean
 * app.ticker.add((t) => ground.update(t.deltaMS / 1000));
 * ground.setTimeOfDay("night");                // cross-fades
 * ```
 *
 * Owns only the land. No buildings, no trees, no people, no weather, no UI.
 */
export class Ground {
  /** Mount this in front of the ocean. */
  readonly container = new Container();

  private readonly shoreline = new Shoreline();
  private readonly terrain = new TerrainLayer();
  private readonly path = new PathLayer();
  private readonly props: PropLayer;

  private readonly shorelineRatio: number;
  private readonly targetPixelHeight: number;
  private readonly fixedPixelScale: number | undefined;
  private readonly motionScale: number;
  private readonly seed: number;

  private pixelScaleValue = 1;
  private groundWidth = 0;
  private groundHeight = 0;
  private topYValue = 0;

  private timeOfDayValue: TimeOfDay;
  private fromPalette: GroundPalette;
  private toPalette: GroundPalette;
  private currentPalette: GroundPalette;

  /** Transition progress 0–1; 1 means settled. */
  private mix = 1;
  private transitionDuration = 0;

  constructor(options: GroundOptions) {
    const {
      timeOfDay = DEFAULT_TIME_OF_DAY,
      shoreline = DEFAULT_SHORELINE,
      pixelHeight = DEFAULT_PIXEL_HEIGHT,
      pixelScale,
      seed = DEFAULT_SEED,
      motionScale = 1,
    } = options;

    this.shorelineRatio = shoreline;
    this.targetPixelHeight = Math.max(32, pixelHeight);
    this.fixedPixelScale = pixelScale;
    this.motionScale = Math.max(0, motionScale);
    this.seed = seed;

    this.timeOfDayValue = timeOfDay;
    const palette = deriveGroundPalette(timeOfDay);
    this.fromPalette = palette;
    this.toPalette = palette;
    this.currentPalette = palette;

    this.container.label = "ground";
    this.props = new PropLayer(seed + 7, BUILDING_PLOTS);

    this.container.addChild(
      this.shoreline.container,
      this.terrain.container,
      this.path.container,
      this.props.container
    );

    this.resize(options.width, options.height);
    this.applyPalette(palette);
  }

  // --- Queries ---------------------------------------------------------------

  get timeOfDay(): TimeOfDay {
    return this.timeOfDayValue;
  }

  /** Whole-number screen pixels per ground pixel. Matches the sky's. */
  get pixelScale(): number {
    return this.pixelScaleValue;
  }

  /** Internal ground resolution, in ground pixels. */
  get size(): { width: number; height: number } {
    return { width: this.groundWidth, height: this.groundHeight };
  }

  /** The waterline in screen pixels — where the sea gives way to the land. */
  get topY(): number {
    return this.topYValue;
  }

  /** Where the ground is being kept clear, in screen pixels. */
  get plots(): { name: string; from: number; to: number }[] {
    return this.props
      .plotRanges(this.groundWidth)
      .map((plot) => ({
        name: plot.name,
        from: plot.from * this.pixelScaleValue,
        to: plot.to * this.pixelScaleValue,
      }));
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Move to another time of day, cross-fading over `seconds`. Drive this from
   * the same value as the sky and the sea so the world stays in step.
   */
  setTimeOfDay(timeOfDay: TimeOfDay, seconds = DEFAULT_TRANSITION_SECONDS): void {
    if (timeOfDay === this.timeOfDayValue) return;

    this.timeOfDayValue = timeOfDay;
    const target = deriveGroundPalette(timeOfDay);
    const duration = seconds * this.motionScale;

    // Carry on from the light actually on screen, not from where the last fade
    // started, so interrupting a transition doesn't snap.
    this.fromPalette = this.currentPalette;
    this.toPalette = target;

    if (duration <= 0) {
      this.mix = 1;
      this.transitionDuration = 0;
      this.fromPalette = target;
      this.applyPalette(target);
      return;
    }

    this.mix = 0;
    this.transitionDuration = duration;
  }

  /**
   * Advance the land. `delta` is in seconds — pass `ticker.deltaMS / 1000`.
   *
   * Almost nothing here moves: the surf breathes and the planting sways by a
   * pixel. That's deliberate. The land is the still thing the sky and the sea
   * move against (DESIGN.md §Animation Philosophy — motion should feel calm).
   */
  update(delta: number): void {
    if (this.mix < 1) {
      this.mix = Math.min(1, this.mix + delta / this.transitionDuration);
      const eased = smoothstep(this.mix);

      this.applyPalette(lerpGroundPalette(this.fromPalette, this.toPalette, eased));

      if (this.mix >= 1) {
        this.fromPalette = this.toPalette;
        this.applyPalette(this.toPalette);
      }
    }

    const drift = delta * this.motionScale;
    if (drift <= 0) return;

    this.shoreline.update(drift);
    this.props.update(drift);
  }

  /** Feed the ground the camera's horizontal position, in world pixels. */
  setViewOffset(x: number): void {
    // The land is what the camera actually moves over, so it tracks one to one.
    this.container.x = -Math.round(x / this.pixelScaleValue) * this.pixelScaleValue;
  }

  /** Re-fit to a new viewport, in CSS pixels. */
  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;

    this.pixelScaleValue =
      this.fixedPixelScale ?? Math.max(1, Math.floor(height / this.targetPixelHeight));

    const viewportPixels = Math.ceil(height / this.pixelScaleValue);
    const topPixels = Math.round(viewportPixels * this.shorelineRatio);

    this.groundWidth = Math.ceil(width / this.pixelScaleValue);
    this.groundHeight = Math.max(1, viewportPixels - topPixels);
    this.topYValue = topPixels * this.pixelScaleValue;

    this.container.scale.set(this.pixelScaleValue);
    this.container.y = this.topYValue;

    const w = this.groundWidth;
    const h = this.groundHeight;

    // Every boundary on the shore is an uneven line, computed once here and
    // shared, so neighbouring bands agree on exactly where they meet.
    const rand = createRandom(this.seed);
    const waterEdge = makeEdge(w, h * BANDS.waterline, h * 0.04, 2, rand);
    const sandEdge = makeEdge(w, h * BANDS.sandSplit, h * 0.05, 2, rand);
    const grassEdge = makeEdge(w, h * BANDS.grassEdge, h * 0.055, 2, rand);
    const pathTop = makeEdge(w, h * BANDS.pathTop, h * 0.02, 1, rand);
    const pathBottom = makeEdge(w, h * BANDS.pathBottom, h * 0.02, 1, rand);

    this.shoreline.resize(w, h, waterEdge, sandEdge, rand);
    this.terrain.resize(w, h, sandEdge, grassEdge, rand);
    this.path.resize(w, h, pathTop, pathBottom, rand);
    this.props.resize(w, h);

    this.applyPalette(this.currentPalette);
  }

  destroy(): void {
    this.shoreline.destroy();
    this.terrain.destroy();
    this.path.destroy();
    this.props.destroy();
    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  private applyPalette(palette: GroundPalette): void {
    this.currentPalette = palette;
    this.shoreline.setTones(palette);
    this.terrain.setTones(palette);
    this.path.setTones(palette);
    this.props.setTones(palette);
  }
}
