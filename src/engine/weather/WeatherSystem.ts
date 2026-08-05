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
}

export const DEFAULT_SEED = 0x77ea;

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
  private readonly fixedPixelScale: number | undefined;

  /** What the scene is asking for, by kind. */
  private target = new Map<WeatherKind, number>();
  /** What is actually on screen, chasing the target. */
  private live = new Map<WeatherKind, number>();

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

    WEATHER_ORDER.forEach((kind, index) => {
      const layer = new WeatherLayer({
        profile: { ...WEATHER_PROFILES[kind], ...options.profiles?.[kind] },
        texture: this.texture,
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

    for (const [kind, layer] of this.layers) {
      const want = this.target.get(kind) ?? 0;
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
    this.container.destroy({ children: true });
  }
}
