import { Container, Sprite } from "pixi.js";
import { createBushTextures, createPropTextures, type PropTextures } from "./textures";
import { createRandom, range, rangeInt } from "./random";
import { PROP_BASELINES } from "./GroundConfig";
import type { GroundBand, GroundPalette } from "./GroundConfig";
import { FENCE_RUNS, PROP_PLACEMENTS } from "./GroundLayout";
import type { PlotArea, PropKind } from "./GroundLayout";

/** Everything standing on the land, resolved into something drawable. */
interface Instance {
  view: Container;
  base: Sprite;
  light: Sprite;
  dark: Sprite;
  kind: PropKind | "fence";
  variant: number;
  /** Baseline in ground pixels — also the draw order. */
  y: number;
  x: number;
  width: number;
  flip: boolean;
  /** Sway phase; only planting sways. */
  phase: number;
  swayRate: number;
  swayAmount: number;
}

/** Bush sizes in ground pixels, one per variant. Small, upright coastal scrub. */
const BUSH_SIZES = [
  { width: 13, height: 9 },
  { width: 10, height: 7 },
  { width: 16, height: 10 },
] as const;

/**
 * Everything hand-placed on the shore: rocks, flowers, driftwood, bushes and
 * the wooden fencing.
 *
 * Placement comes entirely from GroundLayout — nothing here decides where
 * anything goes. What this class does is resolve those authored positions into
 * sprites, stand them on their baselines, and sort them back to front so a bush
 * at your feet correctly covers a rock further up the beach.
 *
 * Only the planting moves. Bushes and flowers sway by a single pixel on their
 * own slow cycles, which is the whole of the coastal breeze — rocks, driftwood
 * and fences are stone and dead wood and stay put.
 *
 * TODO(assets): props are drawn in code. Pass `textures` to swap in authored
 * art — see TODO(assets) in textures.ts.
 */
export class PropLayer {
  readonly container = new Container();

  private readonly sets: Record<PropKind | "fence", PropTextures[]>;
  private readonly instances: Instance[] = [];
  private readonly rand: () => number;
  private readonly plots: readonly PlotArea[];

  private elapsed = 0;
  private groundHeight = 0;
  private swayScale = 1;

  constructor(seed: number, plots: readonly PlotArea[]) {
    this.container.label = "ground:props";
    this.rand = createRandom(seed);
    this.plots = plots;

    this.sets = {
      rock: createPropTextures("rock"),
      flower: createPropTextures("flower"),
      driftwood: createPropTextures("driftwood"),
      fence: createPropTextures("fence"),
      bush: BUSH_SIZES.map((size) =>
        createBushTextures(size.width, size.height, this.rand)
      ),
    };
  }

  /** Re-resolve every authored position against the new world size. */
  resize(worldWidth: number, groundHeight: number): void {
    this.groundHeight = groundHeight;
    this.clearInstances();

    const pending: Instance[] = [];

    for (const placement of PROP_PLACEMENTS) {
      pending.push(
        this.makeInstance(
          placement.kind,
          placement.variant,
          Math.round(placement.x * worldWidth),
          this.baselineY(placement.band) + (placement.dy ?? 0),
          placement.flip ?? false
        )
      );
    }

    for (const run of FENCE_RUNS) {
      const sectionWidth = this.sets.fence[0].width;
      const from = Math.round(run.from * worldWidth);
      const to = Math.round(run.to * worldWidth);
      const baseline = this.baselineY(run.band);

      for (let x = from; x < to; x += sectionWidth) {
        // Mostly sound fencing, with the odd weathered section — and every few
        // posts settling a pixel, because nothing on this shore is level.
        const variant = this.rand() < 0.22 ? 1 : 0;
        const settle = this.rand() < 0.3 ? 1 : 0;
        pending.push(this.makeInstance("fence", variant, x, baseline + settle, false));
      }
    }

    // Back to front, so nearer things cover further ones. Ties break on x so the
    // order is stable between resizes.
    pending.sort((a, b) => a.y - b.y || a.x - b.x);

    for (const instance of pending) {
      this.container.addChild(instance.view);
      this.instances.push(instance);
    }

    this.draw();
  }

  setTones(palette: GroundPalette): void {
    const flowerPetals = [palette.flowerCream, palette.flowerRose, palette.flowerBrass];

    for (const instance of this.instances) {
      switch (instance.kind) {
        case "rock":
          instance.base.tint = palette.rock;
          instance.light.tint = palette.rockLight;
          instance.dark.tint = palette.rockDark;
          break;
        case "driftwood":
          instance.base.tint = palette.driftwood;
          instance.light.tint = palette.driftwoodLight;
          instance.dark.tint = palette.driftwoodDark;
          break;
        case "fence":
          instance.base.tint = palette.wood;
          instance.light.tint = palette.woodLight;
          instance.dark.tint = palette.woodDark;
          break;
        case "bush":
          instance.base.tint = palette.grass;
          instance.light.tint = palette.grassLight;
          instance.dark.tint = palette.grassDark;
          break;
        case "flower":
          instance.base.tint = palette.flowerBrass;
          instance.light.tint = flowerPetals[instance.variant % flowerPetals.length];
          instance.dark.tint = palette.grassDark;
          break;
      }
    }
  }

  /** `delta` is seconds. */
  update(delta: number): void {
    this.elapsed += delta;
    this.draw();
  }

  /** Breeze strength, for a future weather pass. 0 stills the planting. */
  setSway(scale: number): void {
    this.swayScale = scale;
    this.draw();
  }

  /**
   * The stretches of ground left clear for buildings, in world pixels. Exposed
   * so whatever places buildings later can ask the ground where it may build
   * rather than repeating the layout.
   */
  plotRanges(worldWidth: number): { name: string; from: number; to: number }[] {
    return this.plots.map((plot) => ({
      name: plot.name,
      from: Math.round(plot.from * worldWidth),
      to: Math.round(plot.to * worldWidth),
    }));
  }

  destroy(): void {
    for (const set of Object.values(this.sets)) {
      for (const textures of set) {
        textures.base.destroy(true);
        textures.light.destroy(true);
        textures.dark.destroy(true);
      }
    }
    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  private baselineY(band: GroundBand): number {
    return Math.round(PROP_BASELINES[band] * this.groundHeight);
  }

  private makeInstance(
    kind: PropKind | "fence",
    variant: number,
    x: number,
    y: number,
    flip: boolean
  ): Instance {
    const set = this.sets[kind];
    const textures = set[variant % set.length];

    const view = new Container();
    const base = new Sprite(textures.base);
    const light = new Sprite(textures.light);
    const dark = new Sprite(textures.dark);

    // Stand it on its baseline rather than hanging it from its top edge.
    for (const sprite of [base, light, dark]) {
      sprite.anchor.set(0, 1);
    }
    view.addChild(base, dark, light);

    // Only living things move.
    const sways = kind === "bush" || kind === "flower";

    return {
      view,
      base,
      light,
      dark,
      kind,
      variant,
      x,
      y,
      width: textures.width,
      flip,
      phase: range(this.rand, 0, Math.PI * 2),
      swayRate: range(this.rand, 0.3, 0.65),
      swayAmount: sways ? (kind === "bush" ? 1 : rangeInt(this.rand, 0, 1)) : 0,
    };
  }

  private draw(): void {
    for (const instance of this.instances) {
      const sway =
        instance.swayAmount > 0
          ? Math.round(
              Math.sin(this.elapsed * instance.swayRate + instance.phase) *
                instance.swayAmount *
                this.swayScale
            )
          : 0;

      // A mirrored container draws to the left of its origin, so shift it back
      // by its own width to keep `x` meaning the same edge either way.
      instance.view.scale.x = instance.flip ? -1 : 1;
      instance.view.x = instance.x + sway + (instance.flip ? instance.width : 0);
      instance.view.y = instance.y;
    }
  }

  private clearInstances(): void {
    for (const instance of this.instances) {
      instance.view.destroy({ children: true });
    }
    this.instances.length = 0;
  }
}
