import { Container } from "pixi.js";
import { DEFAULT_TIME_OF_DAY } from "../sky";
import type { TimeOfDay } from "../sky";
import { FoamLayer } from "./FoamLayer";
import { ReflectionLayer } from "./ReflectionLayer";
import { WaveLayer } from "./WaveLayer";
import {
  DEFAULT_COVERAGE,
  DEFAULT_MODIFIERS,
  DEFAULT_PIXEL_HEIGHT,
  DEFAULT_SEED,
  DEFAULT_TRANSITION_SECONDS,
  OCEAN_LAYERS,
  deriveOceanPalette,
  lerpOceanPalette,
  waterAt,
} from "./OceanConfig";
import type { OceanModifiers, OceanOptions, OceanPalette } from "./OceanConfig";

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/**
 * The Ocean — a self-contained, reusable stretch of calm water.
 *
 * Composition, back to front: the water body and the sun's path, five swells
 * from horizon to shore, the shimmer riding on the surface, and the foam line
 * along the top edge. The shimmer sits *in front of* the waves on purpose —
 * light lies on water, it doesn't sink into it.
 *
 * # Connected to the sky
 * The ocean has no palette of its own. Every colour is derived from the sky's
 * gradient at the same time of day (see `deriveOceanPalette`), so the two
 * systems can't drift apart: retune the sunset and the sea follows. The only
 * literals in the whole system are the two water tokens from `globals.css`.
 *
 * # Pixel-perfect rendering
 * The ocean draws into the same internal grid as the sky and is scaled up by
 * the same whole number, so one sky pixel is one ocean pixel. Pass the sky's
 * `pixelScale` through `OceanOptions` to guarantee it — a mismatch is the one
 * thing that would make the horizon seam obvious. Textures are baked at the
 * size they're drawn, nothing is ever scaled, and every scroll and bob is
 * snapped to a whole pixel.
 *
 * # Usage
 * ```ts
 * const ocean = new Ocean({ width, height, pixelScale: sky.pixelScale });
 * app.stage.addChildAt(ocean.container, 1);      // in front of the sky
 * app.ticker.add((t) => ocean.update(t.deltaMS / 1000));
 * ocean.setTimeOfDay("night");                   // cross-fades
 * ocean.setModifiers({ foam: 1.6 });             // the weather seam
 * ```
 *
 * # Extending
 * Everything future hangs off documented seams rather than edits here:
 * storm swells are a second `OCEAN_LAYERS` set; rain ripples, boats and fish
 * are new containers mounted between the wave layers and the shimmer; moon
 * reflections are `ShimmerTone` pointed at the moon instead of the sun; fog is
 * `OceanModifiers.waveAlpha` pulled towards nothing.
 *
 * Owns only the water. No ground, no beach, no boats, no weather, no UI.
 */
export class Ocean {
  /** Mount this in front of the sky and behind the town. */
  readonly container = new Container();

  private readonly reflection: ReflectionLayer;
  private readonly waves: WaveLayer[];
  private readonly foam: FoamLayer;

  private readonly coverage: number;
  private readonly targetPixelHeight: number;
  private readonly fixedPixelScale: number | undefined;
  private readonly motionScale: number;

  private pixelScaleValue = 1;
  private oceanWidth = 0;
  private oceanHeight = 0;
  private topYValue = 0;
  private viewOffset = 0;

  private modifiers: OceanModifiers = { ...DEFAULT_MODIFIERS };

  private timeOfDayValue: TimeOfDay;
  private fromPalette: OceanPalette;
  private toPalette: OceanPalette;
  private currentPalette: OceanPalette;

  /** Transition progress 0–1; 1 means settled. */
  private mix = 1;
  private transitionDuration = 0;

  /** Set once something outside is driving the look. See `setBlendedPalette`. */
  private externallyDriven = false;
  private drivenFrom: OceanPalette | null = null;
  private drivenTo: OceanPalette | null = null;

  constructor(options: OceanOptions) {
    const {
      timeOfDay = DEFAULT_TIME_OF_DAY,
      coverage = DEFAULT_COVERAGE,
      pixelHeight = DEFAULT_PIXEL_HEIGHT,
      pixelScale,
      seed = DEFAULT_SEED,
      motionScale = 1,
    } = options;

    this.coverage = coverage;
    this.targetPixelHeight = Math.max(32, pixelHeight);
    this.fixedPixelScale = pixelScale;
    this.motionScale = Math.max(0, motionScale);

    this.timeOfDayValue = timeOfDay;
    const palette = deriveOceanPalette(timeOfDay);
    this.fromPalette = palette;
    this.toPalette = palette;
    this.currentPalette = palette;

    this.container.label = "ocean";

    // The band height each swell needs depends on the ocean's height, which
    // isn't known until the first resize — so size it from the first guess and
    // let `resize` place everything.
    const provisionalHeight = Math.max(
      16,
      Math.round((options.height * coverage) / (pixelScale ?? 1))
    );

    this.reflection = new ReflectionLayer(seed + 1);
    this.waves = OCEAN_LAYERS.map(
      // Offsetting the seed per layer keeps the five swells from sharing jitter.
      (config, i) => new WaveLayer(config, provisionalHeight, seed + i * 613)
    );
    this.foam = new FoamLayer(seed + 2);

    this.container.addChild(this.reflection.backdrop);
    for (const wave of this.waves) this.container.addChild(wave.container);
    this.container.addChild(this.reflection.shimmer, this.foam.container);

    this.resize(options.width, options.height);
    this.reflection.setWater(palette.water);
    this.applyPalette(palette);
  }

  // --- Queries ---------------------------------------------------------------

  get timeOfDay(): TimeOfDay {
    return this.timeOfDayValue;
  }

  /** Whole-number screen pixels per ocean pixel. Matches the sky's. */
  get pixelScale(): number {
    return this.pixelScaleValue;
  }

  /** Internal ocean resolution, in ocean pixels. */
  get size(): { width: number; height: number } {
    return { width: this.oceanWidth, height: this.oceanHeight };
  }

  /** The water's top edge in screen pixels — where sky meets sea. */
  get topY(): number {
    return this.topYValue;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Move to another time of day, cross-fading over `seconds`. Passing 0 (or
   * running with `motionScale: 0`) snaps instantly. Drive this from the same
   * value as the sky so the two stay in step.
   */
  /**
   * Position the water between two palettes.
   *
   * The way an external cycle drives this system, in place of `setTimeOfDay`.
   * The water's body is a baked texture like the sky's gradient, so the two
   * ends are baked once at a phase boundary and cross-faded by alpha; the wave
   * tones, foam and shimmer are tints and interpolate per frame.
   */
  setBlendedPalette(from: OceanPalette, to: OceanPalette, blend: number): void {
    this.externallyDriven = true;
    this.mix = 1;

    if (from !== this.drivenFrom || to !== this.drivenTo) {
      this.drivenFrom = from;
      this.drivenTo = to;

      this.reflection.setWater(from.water);
      if (to !== from) this.reflection.prepareWater(to.water);
    }

    const crossing = to !== from;
    this.reflection.setMix(crossing ? blend : 0);
    this.applyPalette(crossing ? lerpOceanPalette(from, to, blend) : from);
  }

  setTimeOfDay(timeOfDay: TimeOfDay, seconds = DEFAULT_TRANSITION_SECONDS): void {
    // Something outside owns the look; a discrete jump would fight it.
    if (this.externallyDriven) return;
    if (timeOfDay === this.timeOfDayValue) return;

    this.timeOfDayValue = timeOfDay;
    const target = deriveOceanPalette(timeOfDay);
    const duration = seconds * this.motionScale;

    // Interrupting a fade: carry on from the water actually on screen rather
    // than snapping back to where the last fade started.
    if (this.mix < 1) {
      this.reflection.setWater(this.currentPalette.water);
    }

    this.fromPalette = this.currentPalette;
    this.toPalette = target;

    if (duration <= 0) {
      this.mix = 1;
      this.transitionDuration = 0;
      this.fromPalette = target;
      this.reflection.setWater(target.water);
      this.applyPalette(target);
      return;
    }

    this.mix = 0;
    this.transitionDuration = duration;
    this.reflection.prepareWater(target.water);
    this.reflection.setMix(0);
  }

  /**
   * Adjust the runtime multipliers. Partial updates are merged, so a weather
   * system can nudge one value without knowing about the others.
   */
  setModifiers(modifiers: Partial<OceanModifiers>): void {
    this.modifiers = { ...this.modifiers, ...modifiers };
    this.applyPalette(this.currentPalette);
  }

  /**
   * Advance the water. `delta` is in seconds — pass `ticker.deltaMS / 1000` so
   * motion stays frame-rate independent.
   */
  update(delta: number): void {
    if (this.mix < 1) {
      this.mix = Math.min(1, this.mix + delta / this.transitionDuration);
      const eased = smoothstep(this.mix);

      this.reflection.setMix(eased);
      this.applyPalette(lerpOceanPalette(this.fromPalette, this.toPalette, eased));

      if (this.mix >= 1) {
        this.reflection.commit();
        this.fromPalette = this.toPalette;
        this.applyPalette(this.toPalette);
      }
    }

    // At motionScale 0 (reduced motion) the sea holds still — a painting of
    // calm water rather than a frozen animation.
    const drift = delta * this.motionScale;
    if (drift <= 0) return;

    for (const wave of this.waves) wave.update(drift, this.modifiers.waveSpeed);
    this.foam.update(drift, this.modifiers.waveSpeed);
    this.reflection.update(drift);
  }

  /** Feed the ocean the camera's horizontal position, in world pixels. */
  setViewOffset(x: number): void {
    this.viewOffset = x / this.pixelScaleValue;
    for (const wave of this.waves) wave.setParallax(this.viewOffset);
  }

  /** Re-fit to a new viewport, in CSS pixels. */
  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;

    // Match the sky's grid: either the scale it was given, or the same rule the
    // sky uses to pick one.
    this.pixelScaleValue =
      this.fixedPixelScale ?? Math.max(1, Math.floor(height / this.targetPixelHeight));

    const viewportPixels = Math.ceil(height / this.pixelScaleValue);
    const topPixels = Math.round(viewportPixels * (1 - this.coverage));

    this.oceanWidth = Math.ceil(width / this.pixelScaleValue);
    this.oceanHeight = Math.max(1, viewportPixels - topPixels);
    this.topYValue = topPixels * this.pixelScaleValue;

    this.container.scale.set(this.pixelScaleValue);
    this.container.y = this.topYValue;

    this.reflection.resize(this.oceanWidth, this.oceanHeight);
    for (const wave of this.waves) wave.resize(this.oceanWidth, this.oceanHeight);
    this.foam.resize(this.oceanWidth);

    this.applyPalette(this.currentPalette);
    for (const wave of this.waves) wave.setParallax(this.viewOffset);
  }

  destroy(): void {
    this.reflection.destroy();
    for (const wave of this.waves) wave.destroy();
    this.foam.destroy();
    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  private applyPalette(palette: OceanPalette): void {
    this.currentPalette = palette;

    // Each swell takes its tones from the water ramp at its own depth: the body
    // a little deeper than the water it sits on, the lit lip a little shallower.
    // That's what makes a swell read as a fold in the surface rather than a
    // stripe laid over it — and it comes out right at every time of day for
    // free, because the ramp is the sky.
    // Asymmetric on purpose. The body sits only just deeper than the water it
    // covers — push that and the sea reads as five stacked ribbons. The lit lip
    // reaches much further up the ramp, which it can get away with because it's
    // broken into dashes: scattered bright flecks read as light on a surface,
    // where the same contrast drawn as a continuous line reads as a wire.
    this.waves.forEach((wave, i) => {
      const depth = OCEAN_LAYERS[i].depth;
      wave.setTones(
        waterAt(palette, depth + 0.09),
        waterAt(palette, Math.max(0, depth - 0.26)),
        this.modifiers.waveAlpha
      );
    });

    this.foam.setTone(palette.foam, palette.foamAlpha * this.modifiers.foam);
    this.reflection.setShimmer(palette, this.modifiers.shimmer);
  }
}
