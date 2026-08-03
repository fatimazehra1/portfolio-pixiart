import { Container, Sprite, Texture } from "pixi.js";
import { createSandBand, createSurfTexture, type BandTextures } from "./textures";
import type { GroundPalette } from "./GroundConfig";

/**
 * Where the sea meets the land.
 *
 * Three things stacked: the darker wet sand the water keeps reaching, the dry
 * sand starting to show through it, and a broken bright surf line riding the
 * waterline itself.
 *
 * The surf breathes rather than scrolls. A drifting line would need to tile,
 * and this band is baked at full width so its edge can be genuinely uneven all
 * the way across; slowly rising and falling in brightness gives it life without
 * asking it to repeat. It is the only part of the land that moves at all
 * besides the planting.
 */
export class Shoreline {
  readonly container = new Container();

  private readonly wetSprites: Sprite[] = [];
  private wet: BandTextures | null = null;

  private readonly surfSprite = new Sprite();
  private surfTexture: Texture | null = null;

  private elapsed = 0;
  private surfBase = 0.85;

  constructor() {
    this.container.label = "ground:shoreline";
    for (let i = 0; i < 3; i++) {
      const sprite = new Sprite();
      this.wetSprites.push(sprite);
      this.container.addChild(sprite);
    }
    this.container.addChild(this.surfSprite);
  }

  /**
   * @param waterEdge the uneven waterline, per column.
   * @param sandEdge  where wet sand gives way to dry, per column.
   */
  resize(
    width: number,
    height: number,
    waterEdge: Int16Array,
    sandEdge: Int16Array,
    rand: () => number
  ): void {
    this.disposeTextures();

    this.wet = createSandBand(width, height, waterEdge, sandEdge, rand);
    this.wetSprites[0].texture = this.wet.base;
    this.wetSprites[1].texture = this.wet.light;
    this.wetSprites[2].texture = this.wet.dark;

    this.surfTexture = createSurfTexture(width, height, waterEdge, rand);
    this.surfSprite.texture = this.surfTexture;
  }

  setTones(palette: GroundPalette): void {
    this.wetSprites[0].tint = palette.sandWet;
    // Mottled with a *dry* tone rather than a bright one: patches of sand
    // starting to dry out between waves, not highlights on wet ground.
    this.wetSprites[1].tint = palette.sandDryDark;
    this.wetSprites[2].tint = palette.sandWetDark;
    this.surfSprite.tint = palette.foam;
  }

  /** `delta` is seconds. */
  update(delta: number): void {
    this.elapsed += delta;
    // Slow, shallow: the tide working, not a flashing light.
    this.surfSprite.alpha = this.surfBase + Math.sin(this.elapsed * 0.55) * 0.16;
  }

  /** Global opacity for the surf, so a future weather pass can drive it. */
  setSurfIntensity(intensity: number): void {
    this.surfBase = 0.85 * intensity;
    this.surfSprite.visible = intensity > 0.001;
  }

  destroy(): void {
    this.disposeTextures();
    this.container.destroy({ children: true });
  }

  private disposeTextures(): void {
    this.wet?.base.destroy(true);
    this.wet?.light.destroy(true);
    this.wet?.dark.destroy(true);
    this.wet = null;

    this.surfTexture?.destroy(true);
    this.surfTexture = null;
  }
}
