import { Container, Sprite } from "pixi.js";
import { createPathTextures, type PathTextures } from "./textures";
import type { GroundPalette } from "./GroundConfig";

/**
 * The old stone path running the length of the shore.
 *
 * Four tinted masks: the cobbles, their lit upper edges, the joints and cracks,
 * and the grass that has found its way up between them (ART_DIRECTION.md
 * §Roads — old stone, slightly uneven, small cracks, grass growing between).
 *
 * The path is the spine of the town. Everything else on the land is arranged
 * around it, and it's the one element that runs unbroken from one edge of the
 * world to the other, which is what will make the shore read as a single place
 * rather than a row of separate scenes.
 */
export class PathLayer {
  readonly container = new Container();

  private readonly sprites: Sprite[] = [];
  private textures: PathTextures | null = null;

  constructor() {
    this.container.label = "ground:path";
    for (let i = 0; i < 4; i++) {
      const sprite = new Sprite();
      this.sprites.push(sprite);
      this.container.addChild(sprite);
    }
  }

  /**
   * @param top    upper edge of the path, per column.
   * @param bottom lower edge of the path, per column.
   */
  resize(
    width: number,
    height: number,
    top: Int16Array,
    bottom: Int16Array,
    rand: () => number
  ): void {
    this.disposeTextures();

    this.textures = createPathTextures(width, height, top, bottom, rand);
    this.sprites[0].texture = this.textures.stone;
    this.sprites[1].texture = this.textures.light;
    this.sprites[2].texture = this.textures.dark;
    this.sprites[3].texture = this.textures.weeds;
  }

  setTones(palette: GroundPalette): void {
    this.sprites[0].tint = palette.stone;
    this.sprites[1].tint = palette.stoneLight;
    this.sprites[2].tint = palette.stoneDark;
    this.sprites[3].tint = palette.grassDark;
  }

  destroy(): void {
    this.disposeTextures();
    this.container.destroy({ children: true });
  }

  private disposeTextures(): void {
    this.textures?.stone.destroy(true);
    this.textures?.light.destroy(true);
    this.textures?.dark.destroy(true);
    this.textures?.weeds.destroy(true);
    this.textures = null;
  }
}
