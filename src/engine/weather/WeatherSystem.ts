import { Container, Texture } from "pixi.js";
import { WeatherLayer } from "./WeatherLayer";
import {
  FIELD_MARGIN,
  WEATHER_ORDER,
  WEATHER_PROFILES,
  WEATHER_SMOOTHING,
} from "./WeatherProfiles";
import type { WeatherProfile } from "./WeatherProfiles";
import { pixelScaleFor, toTexture, DEFAULT_PIXEL_HEIGHT } from "../shared";
import type { LightingState } from "../lighting";
import type { SceneDirector, WeatherKind } from "../scene";
import type { GradeManager } from "../grade";

export interface WeatherSystemOptions {
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
  /** Pass the sky's `pixelScale` so the drops land on the shared grid. */
  pixelScale?: number;
  /** Global motion multiplier. 0 for `prefers-reduced-motion: reduce`. */
  motionScale?: number;
  seed?: number;
  /** Per-kind profile overrides, for tuning. */
  profiles?: Partial<Record<WeatherKind, Partial<WeatherProfile>>>;
  /**
   * Multiplier on every kind's particle count. 1 is the authored weather.
   *
   * The one knob a slower device needs: rain, dust and embers are counted from
   * the field's area, so halving this halves the sprite count in the heaviest
   * layer on screen without changing what the weather *is*.
   */
  densityScale?: number;
}

export const DEFAULT_SEED = 0x77ea;

/** Height of the baked veil feather, in texture pixels. */
const VEIL_FEATHER = 256;
/** How much of a band the feather takes to reach full strength, 0-1. */
const VEIL_RAMP = 0.34;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * All the weather in the world.
 *
 * Holds one `WeatherLayer` per kind — every kind, always, whether or not any
 * scene currently asks for it. That is the point: a scene does not switch a
 * weather system on, it turns a dial that already exists, so moving between
 * chapters is a set of intensities crossfading rather than emitters being
 * built and torn down at boundaries.
 *
 * # Where the intensities come from
 * The `SceneDirector`, already blended across every scene in reach. This system
 * never looks at a scene, a status or a position — it is handed a map of kind →
 * intensity and it makes that true. Which is why adding a scene needs no change
 * here, and adding a *kind* of weather needs only a profile.
 *
 * # Screen space
 * The field is viewport-sized and sits still against the camera, like the sea.
 * Weather is in the air between you and the town rather than at a place in it,
 * and particles pinned to world coordinates would slide past the window as you
 * panned, which reads as debris rather than rain.
 */
export class WeatherSystem {
  /** Mount into the `weather` layer. */
  readonly container = new Container();

  private readonly layers = new Map<WeatherKind, WeatherLayer>();
  private readonly texture: Texture;
  private readonly veilTexture: Texture;
  private readonly fixedPixelScale: number | undefined;

  /** What the scene is asking for, by kind. */
  private target = new Map<WeatherKind, number>();
  /** What is actually on screen, chasing the target. */
  private live = new Map<WeatherKind, number>();
  /**
   * What the visitor asked for from the sky controls, if anything. Takes the
   * place of the scene's target while set; the live values chase it the same
   * way, so switching the weather fades rather than cuts.
   */
  private override: ReadonlyMap<WeatherKind, number> | null = null;

  private pixelScaleValue = 1;
  private elapsed = 0;

  private unbindScenes: (() => void) | null = null;
  private unbindLighting: (() => void) | null = null;

  constructor(options: WeatherSystemOptions) {
    this.fixedPixelScale = options.pixelScale;
    const seed = options.seed ?? DEFAULT_SEED;

    this.container.label = "weather";
    this.container.eventMode = "none";

    // One white pixel, shared by every particle and every veil in the world.
    // Colour comes from tinting, so the whole weather system costs one texture.
    this.texture = toTexture(
      1,
      1,
      (pixels) => {
        pixels[0] = 255;
        pixels[1] = 255;
        pixels[2] = 255;
        pixels[3] = 255;
      },
      "Weather"
    );

    // A vertical feather for the veils: transparent at the top of a band,
    // reaching full strength a third of the way down. Tall enough that
    // stretching it across a band does not step, for the same reason the
    // atmosphere ramp is wide — every texture here samples nearest.
    this.veilTexture = toTexture(
      1,
      VEIL_FEATHER,
      (pixels) => {
        for (let y = 0; y < VEIL_FEATHER; y += 1) {
          const t = y / (VEIL_FEATHER - 1);
          // Smoothstep in, then hold. Fog thickens downward and does not thin
          // out again at the bottom of the frame — there is more of it between
          // you and the ground than between you and the horizon.
          const ramp = t < VEIL_RAMP ? t / VEIL_RAMP : 1;
          const eased = ramp * ramp * (3 - 2 * ramp);
          const o = y * 4;
          pixels[o] = 255;
          pixels[o + 1] = 255;
          pixels[o + 2] = 255;
          pixels[o + 3] = Math.round(eased * 255);
        }
      },
      "Weather"
    );

    const densityScale = Math.max(0, options.densityScale ?? 1);

    WEATHER_ORDER.forEach((kind, index) => {
      const authored = { ...WEATHER_PROFILES[kind], ...options.profiles?.[kind] };
      const layer = new WeatherLayer({
        profile:
          densityScale === 1
            ? authored
            : { ...authored, density: authored.density * densityScale },
        texture: this.texture,
        veilTexture: this.veilTexture,
        // Offset per kind, so fog and dust don't sit on identical lattices.
        seed: seed + index * 0x9e37,
        motionScale: options.motionScale,
      });
      this.layers.set(kind, layer);
      this.live.set(kind, 0);
      this.container.addChild(layer.container);
    });

    this.resize(options.width, options.height);
  }

  // --- Queries ---------------------------------------------------------------

  /** What is on screen right now, by kind. For debugging and tests. */
  get active(): ReadonlyMap<WeatherKind, number> {
    return this.live;
  }

  // --- Commands --------------------------------------------------------------

  /** Follow a scene director. Returns an unsubscribe function. */
  bindScenes(scenes: SceneDirector): () => void {
    this.unbindScenes?.();
    this.unbindScenes = scenes.subscribe((state) => {
      this.target = new Map(state.weather);
    });
    return () => {
      this.unbindScenes?.();
      this.unbindScenes = null;
    };
  }

  /**
   * Follow the graded light — not the global one.
   *
   * Weather is part of the scene it sits over, so fog in a drained, abandoned
   * chapter should be as drained as everything else around it. Reading the
   * ungraded light here would make the fog the one thing in the picture that
   * had not heard where it was.
   */
  bindLighting(grade: GradeManager): () => void {
    this.unbindLighting?.();
    this.unbindLighting = grade.subscribe((state) => this.applyLighting(state));
    return () => {
      this.unbindLighting?.();
      this.unbindLighting = null;
    };
  }

  /** Replace the scene's weather with a fixed mix, or pass null to hand it back. */
  setOverride(mix: ReadonlyMap<WeatherKind, number> | null): void {
    this.override = mix;
  }

  applyLighting(state: LightingState): void {
    for (const layer of this.layers.values()) layer.applyLighting(state);
  }

  /** Re-fit to a new viewport, in CSS pixels. */
  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;

    this.pixelScaleValue = this.fixedPixelScale ?? pixelScaleFor(height, DEFAULT_PIXEL_HEIGHT);
    this.container.scale.set(this.pixelScaleValue);

    // Oversized and offset back by half the overhang, so particles exist past
    // every edge of the view rather than appearing at them.
    const fieldW = Math.ceil((width * (1 + FIELD_MARGIN * 2)) / this.pixelScaleValue);
    const fieldH = Math.ceil((height * (1 + FIELD_MARGIN * 2)) / this.pixelScaleValue);
    // Snapped to the shared grid, like everything else that has a position:
    // half an art pixel of offset here would put every drop in the world half
    // a pixel off the grid the town is drawn on.
    const offsetX = -Math.round((width * FIELD_MARGIN) / this.pixelScaleValue);
    const offsetY = -Math.round((height * FIELD_MARGIN) / this.pixelScaleValue);
    this.container.position.set(
      offsetX * this.pixelScaleValue,
      offsetY * this.pixelScaleValue
    );

    for (const layer of this.layers.values()) layer.resize(fieldW, fieldH);
  }

  /** Advance every running effect. `delta` is in seconds. */
  update(delta: number): void {
    this.elapsed += delta;

    const chase = 1 - Math.exp(-WEATHER_SMOOTHING * delta);

    const source = this.override ?? this.target;
    for (const [kind, layer] of this.layers) {
      const want = source.get(kind) ?? 0;
      const have = this.live.get(kind) ?? 0;

      // Snap the last sliver, so a layer that is fading out actually reaches
      // zero and stops being updated instead of costing a frame forever.
      let next = lerp(have, want, chase);
      if (Math.abs(want - next) < 0.002) next = want;

      if (next !== have) {
        this.live.set(kind, next);
        layer.setIntensity(next);
      }

      layer.update(delta, this.elapsed);
    }
  }

  destroy(): void {
    this.unbindScenes?.();
    this.unbindScenes = null;
    this.unbindLighting?.();
    this.unbindLighting = null;

    for (const layer of this.layers.values()) layer.destroy();
    this.layers.clear();
    this.texture.destroy(true);
    this.veilTexture.destroy(true);
    this.container.destroy({ children: true });
  }
}
