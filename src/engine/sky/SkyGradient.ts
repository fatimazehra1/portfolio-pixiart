import { Container, Sprite, Texture } from "pixi.js";
import { createGradientTexture } from "./textures";
import type { GradientStop } from "./types";

/** A baked ramp: the stops it came from, so it can be re-baked on resize. */
interface Ramp {
  stops: readonly GradientStop[];
  bands: number;
  texture: Texture | null;
}

/**
 * The sky backdrop: a dithered vertical colour ramp filling the whole viewport.
 *
 * Two sprites are kept — the ramp currently on screen and the one being moved
 * to. Changing the time of day bakes a new texture into the back sprite and
 * fades it in over the front one. Each sprite remembers its own stops, so a
 * resize mid-fade re-bakes both correctly instead of snapping one of them.
 *
 * Baking is O(width × height) and only happens on a time change or a resize,
 * never per frame.
 */
export class SkyGradient {
  readonly container = new Container();

  private readonly currentSprite = new Sprite();
  private readonly nextSprite = new Sprite();

  private current: Ramp = { stops: [], bands: 16, texture: null };
  private next: Ramp | null = null;

  private width = 0;
  private height = 0;

  constructor() {
    this.container.label = "sky:gradient";
    this.nextSprite.alpha = 0;
    this.container.addChild(this.currentSprite, this.nextSprite);
  }

  /** Show `stops` immediately and drop any transition in flight. */
  set(stops: readonly GradientStop[], bands: number): void {
    this.setCurrent({ stops, bands, texture: this.bake(stops, bands) });
    this.setNext(null);
  }

  /** Bake `stops` into the incoming sprite, ready to be faded in via `setMix`. */
  prepare(stops: readonly GradientStop[], bands: number): void {
    this.setNext({ stops, bands, texture: this.bake(stops, bands) });
  }

  /** Cross-fade progress, 0 = current ramp, 1 = incoming ramp. */
  setMix(mix: number): void {
    this.nextSprite.alpha = mix;
  }

  /** Promote the incoming ramp to be the visible one once a fade completes. */
  commit(): void {
    if (!this.next) return;

    const incoming = this.next;
    this.next = null;
    this.nextSprite.texture = Texture.EMPTY;
    this.nextSprite.alpha = 0;

    // Hand the texture over rather than re-baking it.
    this.current.texture?.destroy(true);
    this.current = incoming;
    this.currentSprite.texture = incoming.texture ?? Texture.EMPTY;
  }

  /** Re-bake at the new sky size. Both sprites always cover the full sky. */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    if (this.current.stops.length > 0) {
      this.setCurrent({ ...this.current, texture: this.bake(this.current.stops, this.current.bands) });
    }
    if (this.next) {
      const mix = this.nextSprite.alpha;
      this.setNext({ ...this.next, texture: this.bake(this.next.stops, this.next.bands) });
      this.nextSprite.alpha = mix;
    }
  }

  destroy(): void {
    this.current.texture?.destroy(true);
    this.next?.texture?.destroy(true);
    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  private bake(stops: readonly GradientStop[], bands: number): Texture | null {
    if (this.width <= 0 || this.height <= 0 || stops.length === 0) return null;
    return createGradientTexture(this.width, this.height, stops, bands);
  }

  /** Swap a ramp in, freeing the texture it replaces (CPU + GPU). */
  private setCurrent(ramp: Ramp): void {
    if (this.current.texture !== ramp.texture) this.current.texture?.destroy(true);
    this.current = ramp;
    this.currentSprite.texture = ramp.texture ?? Texture.EMPTY;
  }

  private setNext(ramp: Ramp | null): void {
    if (this.next && this.next.texture !== ramp?.texture) this.next.texture?.destroy(true);
    this.next = ramp;
    this.nextSprite.texture = ramp?.texture ?? Texture.EMPTY;
    this.nextSprite.alpha = 0;
  }
}
