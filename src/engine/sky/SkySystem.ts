import { Container } from "pixi.js";
import { BirdFlock } from "./BirdFlock";
import { CelestialBody } from "./CelestialBody";
import { CloudLayer } from "./CloudLayer";
import { HorizonHaze } from "./HorizonHaze";
import { SkyGradient } from "./SkyGradient";
import { DEFAULT_TIME_OF_DAY, SKY_PRESETS, blendGradientStops, lerpPalette } from "./palette";
import type {
  CloudLayerConfig,
  GradientStop,
  SkyPalette,
  SkySystemOptions,
  TimeOfDay,
} from "./types";

/**
 * The three cloud bands, back to front.
 *
 * Read the list as depth: `background` sits low and small near the horizon and
 * barely moves, `foreground` rides high overhead, is physically larger and
 * drifts fastest. Speeds are sky pixels per *second* — a foreground cloud takes
 * something like ten minutes to cross. Calm, not static.
 *
 * Every band carries a generous pool of shapes and mirrors them at random, so a
 * viewer would have to stare for a long time to catch a repeat.
 */
const CLOUD_LAYERS: readonly CloudLayerConfig[] = [
  {
    name: "background",
    count: 8,
    cloudWidth: 34,
    cloudHeight: 13,
    yRange: [0.3, 0.52],
    speed: 0.35,
    alpha: 0.52,
    alphaJitter: 0.1,
    depth: 0.08,
    shapes: 8,
  },
  {
    name: "midground",
    count: 6,
    cloudWidth: 54,
    cloudHeight: 20,
    yRange: [0.17, 0.4],
    speed: 0.9,
    alpha: 0.79,
    alphaJitter: 0.08,
    depth: 0.18,
    shapes: 7,
  },
  {
    name: "foreground",
    count: 4,
    cloudWidth: 82,
    cloudHeight: 30,
    yRange: [0.03, 0.22],
    speed: 1.8,
    alpha: 1,
    alphaJitter: 0.06,
    depth: 0.34,
    shapes: 6,
  },
];

/**
 * Sun and moon sizes in sky pixels. Never scaled — see CLAUDE.md §Pixel Art
 * Rules. The sun's halo is stretched slightly wide, the way low sun smears
 * along the horizon haze; the moon's stays round and tight.
 */
const SUN = { radius: 11, glowRadius: 44, glowAspect: 1.3, glowLevels: 4 } as const;
const MOON = { radius: 8, glowRadius: 26, glowAspect: 1, glowLevels: 4 } as const;

/** Celestial bodies are near enough to infinity that the camera barely shifts them. */
const CELESTIAL_DEPTH = 0.03;

/**
 * Birds fly in the middle distance, but they parallax far less than the cloud
 * band they sit between. A flock is a single crossing rather than an endless
 * field, so it has nothing to wrap against — track the camera too closely and a
 * pan across a world this wide would simply carry the birds out of the sky.
 */
const BIRD_DEPTH = 0.05;

const DEFAULT_PIXEL_HEIGHT = 200;
const DEFAULT_HORIZON = 0.68;
const DEFAULT_SEED = 0x5a1f;
const DEFAULT_TRANSITION_SECONDS = 2.5;

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/**
 * The Sky system — a self-contained, reusable backdrop.
 *
 * Composition, back to front: gradient, sun and moon, background clouds,
 * midground clouds, birds, horizon haze, foreground clouds. The haze sits
 * *between* the cloud bands on purpose, so distant clouds get washed out by the
 * air in front of them while the foreground band stays crisp — that's the whole
 * trick behind a sky feeling deep.
 *
 * # Pixel-perfect rendering
 * Everything is drawn into an internal grid roughly `pixelHeight` sky pixels
 * tall, and the whole container is scaled by a whole number to fill the
 * viewport. One sky pixel is therefore always an exact block of screen pixels,
 * nothing is ever resampled, and child positions are snapped to the grid before
 * drawing. Layers pick sprite sizes in sky pixels rather than scaling sprites.
 *
 * # Usage
 * ```ts
 * const sky = new SkySystem({ width, height, timeOfDay: "sunset" });
 * app.stage.addChildAt(sky.container, 0);
 * app.ticker.add((t) => sky.update(t.deltaMS / 1000));
 * sky.setTimeOfDay("night");   // cross-fades
 * sky.resize(width, height);
 * sky.destroy();
 * ```
 *
 * The system is screen-space: it is a backdrop, not world geometry, so it mounts
 * outside the camera. Use `setViewOffset` to feed it camera movement — that's
 * what gives the cloud bands their parallax against the town.
 *
 * Owns only the sky. No ocean, no weather, no birds, no stars, no UI.
 */
export class SkySystem {
  /** Mount this into the scene, behind everything else. */
  readonly container = new Container();

  private readonly gradient = new SkyGradient();
  private readonly haze: HorizonHaze;
  private readonly cloudLayers: CloudLayer[];
  private readonly birds: BirdFlock;
  private readonly sun: CelestialBody;
  private readonly moon: CelestialBody;

  private readonly horizon: number;
  private readonly targetPixelHeight: number;
  private readonly motionScale: number;

  private pixelScaleValue = 1;
  private skyWidth = 0;
  private skyHeight = 0;
  private viewOffset = 0;

  private timeOfDayValue: TimeOfDay;
  private fromPalette: SkyPalette;
  private toPalette: SkyPalette;
  private currentPalette: SkyPalette;

  /** The ramp the gradient's front sprite is showing. Not always a preset's. */
  private visibleStops: readonly GradientStop[];
  private visibleBands: number;

  /** Transition progress 0–1; 1 means settled. */
  private mix = 1;
  private transitionDuration = 0;

  /** Set once something outside is driving the look. See `setBlendedPalette`. */
  private externallyDriven = false;
  private drivenFrom: SkyPalette | null = null;
  private drivenTo: SkyPalette | null = null;

  constructor(options: SkySystemOptions) {
    const {
      timeOfDay = DEFAULT_TIME_OF_DAY,
      pixelHeight = DEFAULT_PIXEL_HEIGHT,
      horizon = DEFAULT_HORIZON,
      seed = DEFAULT_SEED,
      motionScale = 1,
    } = options;

    this.timeOfDayValue = timeOfDay;
    this.targetPixelHeight = Math.max(32, pixelHeight);
    this.horizon = horizon;
    this.motionScale = Math.max(0, motionScale);

    const palette = SKY_PRESETS[timeOfDay];
    this.fromPalette = palette;
    this.toPalette = palette;
    this.currentPalette = palette;
    this.visibleStops = palette.gradient;
    this.visibleBands = palette.bands;

    this.container.label = "sky";

    this.haze = new HorizonHaze();
    this.cloudLayers = CLOUD_LAYERS.map(
      // Offsetting the seed per layer keeps the three bands from generating the
      // same shapes in the same places.
      (config, i) => new CloudLayer(config, seed + i * 977)
    );
    this.sun = new CelestialBody({ kind: "sun", ...SUN, seed: seed + 1 });
    this.moon = new CelestialBody({ kind: "moon", ...MOON, seed: seed + 2 });
    this.birds = new BirdFlock(seed + 3);

    const [background, midground, foreground] = this.cloudLayers;
    this.container.addChild(
      this.gradient.container,
      this.sun.container,
      this.moon.container,
      background.container,
      midground.container,
      this.birds.container,
      this.haze.container,
      foreground.container
    );

    this.resize(options.width, options.height);
    this.gradient.set(palette.gradient, palette.bands);
    this.applyPalette(palette);
  }

  // --- Queries ---------------------------------------------------------------

  get timeOfDay(): TimeOfDay {
    return this.timeOfDayValue;
  }

  /** Whole-number screen pixels per sky pixel. */
  get pixelScale(): number {
    return this.pixelScaleValue;
  }

  /** Internal sky resolution, in sky pixels. */
  get size(): { width: number; height: number } {
    return { width: this.skyWidth, height: this.skyHeight };
  }

  /** Horizon line in screen pixels — where the ocean will meet the sky. */
  get horizonY(): number {
    return Math.round(this.horizon * this.skyHeight) * this.pixelScaleValue;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Move to another time of day, cross-fading over `seconds`. Passing 0 (or
   * running with `motionScale: 0`) snaps instantly.
   */
  /**
   * Position the sky between two palettes.
   *
   * The way an external cycle drives this system, in place of `setTimeOfDay`.
   * Both endpoints arrive on every call, so there is no code path here that
   * *assigns* a look — only one that places the sky between two of them.
   *
   * The gradient is a baked texture, so blending it means baking both ends and
   * varying the alpha between them rather than re-baking a mixture every frame.
   * The endpoints are compared by identity: pass the same palette objects and
   * nothing is baked, so the cost falls to two bakes per phase boundary and a
   * tint assignment per frame.
   */
  setBlendedPalette(from: SkyPalette, to: SkyPalette, blend: number): void {
    this.externallyDriven = true;
    // Abandon any cross-fade of our own; the cycle is in charge now.
    this.mix = 1;

    if (from !== this.drivenFrom || to !== this.drivenTo) {
      this.drivenFrom = from;
      this.drivenTo = to;

      this.visibleStops = from.gradient;
      this.visibleBands = from.bands;
      this.gradient.set(from.gradient, from.bands);
      if (to !== from) this.gradient.prepare(to.gradient, to.bands);
    }

    const crossing = to !== from;
    this.gradient.setMix(crossing ? blend : 0);
    this.applyPalette(crossing ? lerpPalette(from, to, blend) : from);
  }

  setTimeOfDay(timeOfDay: TimeOfDay, seconds = DEFAULT_TRANSITION_SECONDS): void {
    // Something outside owns the look; a discrete jump would fight it.
    if (this.externallyDriven) return;
    if (timeOfDay === this.timeOfDayValue) return;

    this.timeOfDayValue = timeOfDay;
    const target = SKY_PRESETS[timeOfDay];
    const duration = seconds * this.motionScale;

    // Interrupting a fade: collapse the two ramps on screen into the single ramp
    // the viewer is actually looking at, so the new fade starts from there
    // instead of snapping back to where the last one began.
    if (this.mix < 1) {
      const eased = smoothstep(this.mix);
      this.visibleStops = blendGradientStops(this.visibleStops, this.toPalette.gradient, eased);
      this.visibleBands = Math.round(
        this.visibleBands + (this.toPalette.bands - this.visibleBands) * eased
      );
      this.gradient.set(this.visibleStops, this.visibleBands);
    }

    // The numeric half blends from wherever it currently sits, for the same reason.
    this.fromPalette = this.currentPalette;
    this.toPalette = target;

    if (duration <= 0) {
      this.mix = 1;
      this.transitionDuration = 0;
      this.fromPalette = target;
      this.visibleStops = target.gradient;
      this.visibleBands = target.bands;
      this.gradient.set(target.gradient, target.bands);
      this.applyPalette(target);
      return;
    }

    this.mix = 0;
    this.transitionDuration = duration;
    this.gradient.prepare(target.gradient, target.bands);
    this.gradient.setMix(0);
  }

  /**
   * Advance the sky. `delta` is in seconds — pass `ticker.deltaMS / 1000` so
   * motion stays frame-rate independent.
   */
  update(delta: number): void {
    if (this.mix < 1) {
      this.mix = Math.min(1, this.mix + delta / this.transitionDuration);
      const eased = smoothstep(this.mix);

      this.gradient.setMix(eased);
      this.applyPalette(lerpPalette(this.fromPalette, this.toPalette, eased));

      if (this.mix >= 1) {
        this.gradient.commit();
        this.visibleStops = this.toPalette.gradient;
        this.visibleBands = this.toPalette.bands;
        this.fromPalette = this.toPalette;
        this.applyPalette(this.toPalette);
      }
    }

    // At motionScale 0 (reduced motion) nothing drifts and no birds fly — the
    // sky stays a still painting rather than a frozen animation.
    const drift = delta * this.motionScale;
    if (drift > 0) {
      for (const layer of this.cloudLayers) layer.update(drift);
      this.birds.update(drift);
    }
  }

  /**
   * Feed the sky the camera's horizontal position (world pixels). Each cloud
   * band shifts by its own depth, so panning the town slides the sky apart.
   */
  setViewOffset(x: number): void {
    this.viewOffset = x / this.pixelScaleValue;
    this.applyParallax();
  }

  /** Re-fit to a new viewport, in CSS pixels. */
  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;

    // The largest whole-number scale that still gives us roughly the pixel
    // density we want. Whole numbers only — a fractional scale is what turns
    // crisp pixel art into mush.
    this.pixelScaleValue = Math.max(1, Math.floor(height / this.targetPixelHeight));
    this.skyWidth = Math.ceil(width / this.pixelScaleValue);
    this.skyHeight = Math.ceil(height / this.pixelScaleValue);

    this.container.scale.set(this.pixelScaleValue);

    this.gradient.resize(this.skyWidth, this.skyHeight);
    this.haze.resize(this.skyWidth, this.skyHeight, this.horizon);
    for (const layer of this.cloudLayers) layer.resize(this.skyWidth, this.skyHeight);
    this.birds.resize(this.skyWidth, this.skyHeight);

    this.applyPalette(this.currentPalette);
    this.applyParallax();
  }

  destroy(): void {
    this.gradient.destroy();
    this.haze.destroy();
    for (const layer of this.cloudLayers) layer.destroy();
    this.birds.destroy();
    this.sun.destroy();
    this.moon.destroy();
    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  private applyPalette(palette: SkyPalette): void {
    this.currentPalette = palette;

    for (const layer of this.cloudLayers) {
      layer.setTones(palette.cloud, palette.cloudAlpha);
    }
    this.birds.setTone(palette.bird.color, palette.bird.alpha);
    this.haze.setTone(palette.hazeColor, palette.hazeAlpha);
    this.sun.apply(palette.sun, this.skyWidth, this.skyHeight);
    this.moon.apply(palette.moon, this.skyWidth, this.skyHeight);
  }

  private applyParallax(): void {
    for (const layer of this.cloudLayers) layer.setParallax(this.viewOffset);
    this.birds.setParallax(this.viewOffset, BIRD_DEPTH);
    this.sun.setParallax(this.viewOffset, CELESTIAL_DEPTH);
    this.moon.setParallax(this.viewOffset, CELESTIAL_DEPTH);
  }
}
