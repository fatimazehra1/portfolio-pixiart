import { Container, Sprite, Texture } from "pixi.js";
import { createHazeTexture } from "./textures";

/**
 * The band of thickened air sitting on the horizon.
 *
 * Distance washes colour out of everything near the horizon line — it's what
 * makes a sky feel deep rather than flat, and at sunset it's where the light
 * pools. The band fades in from nothing above the horizon and holds solid below
 * it, so whatever eventually sits down there (the ocean, later) reads as far
 * away rather than pasted on.
 *
 * The texture is a white alpha ramp baked once per size and tinted at runtime,
 * so following the time of day costs a tint assignment, not a re-bake.
 */
export class HorizonHaze {
  readonly container = new Container();

  private readonly sprite = new Sprite();
  private texture: Texture | null = null;

  /** How far above the horizon the haze starts, as a fraction of sky height. */
  private readonly fadeRatio: number;

  constructor(fadeRatio = 0.16) {
    this.fadeRatio = fadeRatio;
    this.container.label = "sky:haze";
    this.container.addChild(this.sprite);
  }

  /**
   * @param horizon horizon position, 0–1 down the sky.
   */
  resize(skyWidth: number, skyHeight: number, horizon: number): void {
    const fade = Math.max(2, Math.round(skyHeight * this.fadeRatio));
    const top = Math.max(0, Math.round(horizon * skyHeight) - fade);
    const height = Math.max(1, skyHeight - top);

    this.replaceTexture(createHazeTexture(skyWidth, height, fade));
    this.sprite.y = top;
  }

  setTone(color: number, alpha: number): void {
    this.sprite.tint = color;
    this.container.alpha = alpha;
    this.container.visible = alpha > 0.001;
  }

  destroy(): void {
    this.replaceTexture(null);
    this.container.destroy({ children: true });
  }

  private replaceTexture(texture: Texture | null): void {
    this.texture?.destroy(true);
    this.texture = texture;
    this.sprite.texture = texture ?? Texture.EMPTY;
  }
}
