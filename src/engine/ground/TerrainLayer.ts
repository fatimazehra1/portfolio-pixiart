import { Container, Sprite } from "pixi.js";
import { createGrassBand, createSandBand, type BandTextures } from "./textures";
import type { GroundPalette } from "./GroundConfig";

/**
 * The body of the land: dry sand above, grass below.
 *
 * Each band is three tinted masks — the fill, plus lighter and darker patches
 * mottled across it. The mottling is the whole reason a beach this size doesn't
 * read as a coloured rectangle, and the patches are deliberately large and soft
 * rather than per-pixel, because noise reads as dirt on the screen while
 * patches read as ground.
 *
 * Both bands sit between uneven edges handed down from Ground, so no boundary
 * on the shore is a straight horizontal line.
 */
export class TerrainLayer {
  readonly container = new Container();

  private readonly sandSprites: Sprite[] = [];
  private readonly grassSprites: Sprite[] = [];

  private sand: BandTextures | null = null;
  private grass: BandTextures | null = null;

  constructor() {
    this.container.label = "ground:terrain";

    for (let i = 0; i < 3; i++) {
      const sprite = new Sprite();
      this.sandSprites.push(sprite);
      this.container.addChild(sprite);
    }
    for (let i = 0; i < 3; i++) {
      const sprite = new Sprite();
      this.grassSprites.push(sprite);
      this.container.addChild(sprite);
    }
  }

  /**
   * @param sandEdge  top of the dry sand, per column.
   * @param grassEdge top of the grass, per column.
   */
  resize(
    width: number,
    height: number,
    sandEdge: Int16Array,
    grassEdge: Int16Array,
    rand: () => number
  ): void {
    this.disposeTextures();

    this.sand = createSandBand(width, height, sandEdge, grassEdge, rand);
    this.sandSprites[0].texture = this.sand.base;
    this.sandSprites[1].texture = this.sand.light;
    this.sandSprites[2].texture = this.sand.dark;

    this.grass = createGrassBand(width, height, grassEdge, rand);
    this.grassSprites[0].texture = this.grass.base;
    this.grassSprites[1].texture = this.grass.light;
    this.grassSprites[2].texture = this.grass.dark;
  }

  setTones(palette: GroundPalette): void {
    this.sandSprites[0].tint = palette.sandDry;
    this.sandSprites[1].tint = palette.sandDryLight;
    this.sandSprites[2].tint = palette.sandDryDark;

    this.grassSprites[0].tint = palette.grass;
    this.grassSprites[1].tint = palette.grassLight;
    this.grassSprites[2].tint = palette.grassDark;
  }

  destroy(): void {
    this.disposeTextures();
    this.container.destroy({ children: true });
  }

  private disposeTextures(): void {
    for (const band of [this.sand, this.grass]) {
      band?.base.destroy(true);
      band?.light.destroy(true);
      band?.dark.destroy(true);
    }
    this.sand = null;
    this.grass = null;
  }
}
