import { Container } from "pixi.js";
import type { LayerName } from "../types";

/** One depth in the stack: where it draws, and how fast it slides past. */
export interface LayerSpec {
  readonly name: LayerName;
  /**
   * How much of the camera's movement this layer answers, 0–n.
   *
   * 1 is world space: the layer travels with the land, one pixel for one pixel.
   * 0 is screen space: the layer is nailed to the viewport and the camera slides
   * past it without moving it at all. Between the two is distance. Above 1 is
   * *nearer than the town* — the foreground silhouettes overtake it, which is
   * most of what makes a flat side view read as having depth.
   */
  readonly parallax: number;
}

/**
 * Back-to-front draw order. Index in this array == z-order.
 *
 * Every parallax factor in the world is in this one table. A system mounted
 * into a layer draws at its own world coordinates and never touches its own
 * `container.x` — the layer moves it. That is the whole point: depth is a
 * property of *where something is*, not something each system re-decides.
 */
export const LAYER_STACK: readonly LayerSpec[] = [
  // The sea is baked at viewport width and stays put; its waves do their own
  // parallax internally, against a container that never moves.
  { name: "backdrop", parallax: 0 },
  { name: "terrain", parallax: 1 },
  { name: "props", parallax: 1 },
  { name: "structures", parallax: 1 },
  { name: "weather", parallax: 1 },
  // Nearer than the town, so it overtakes it as the camera pans.
  { name: "foreground", parallax: 1.35 },
] as const;

export const LAYER_ORDER: readonly LayerName[] = LAYER_STACK.map((l) => l.name);

/**
 * Owns the world's render layers and the parallax between them.
 *
 * The layers mount *inside the camera container*, so the camera transform moves
 * all of them together — that is what makes a layer at parallax 1 world space
 * for free. Anything that should move by less (or more) is given a counter
 * offset here: a layer at factor `p` is pushed back by `viewLeft · (1 − p)`, so
 * what lands on screen is `p` of the camera's travel.
 *
 * # Pixel alignment
 * Every offset is snapped to the shared art-pixel grid before it is applied,
 * for the same reason the camera snaps its own transform: a layer sitting at
 * x = 137.4 while the camera sits on a whole pixel puts every sprite in it half
 * a pixel off the grid, and the whole layer shimmers as it moves.
 */
export class LayerManager {
  private readonly layers: Record<LayerName, Container>;
  private readonly specs: readonly LayerSpec[];

  private viewLeft = 0;
  private pixelSize = 1;

  /** @param parent the world container the layers are mounted into. */
  constructor(parent: Container, specs: readonly LayerSpec[] = LAYER_STACK) {
    this.specs = specs;
    this.layers = {} as Record<LayerName, Container>;

    // Added in stack order so later layers render on top.
    for (const spec of specs) {
      const layer = new Container();
      layer.label = `layer:${spec.name}`;
      this.layers[spec.name] = layer;
      parent.addChild(layer);
    }
  }

  /** The container for a given layer — the mount point for that layer's content. */
  get(name: LayerName): Container {
    return this.layers[name];
  }

  /**
   * Tell the stack where the view is.
   *
   * @param viewLeft world x at the left edge of the view.
   * @param pixelSize one art pixel, in world pixels — the shared `pixelScale`.
   */
  setView(viewLeft: number, pixelSize = this.pixelSize): void {
    this.viewLeft = viewLeft;
    this.pixelSize = Math.max(1, Math.round(pixelSize));

    for (const spec of this.specs) {
      if (spec.parallax === 1) continue; // world space: the camera already did it
      const offset = this.viewLeft * (1 - spec.parallax);
      this.layers[spec.name].x = Math.round(offset / this.pixelSize) * this.pixelSize;
    }
  }

  /** Detach and destroy all layers and their contents. */
  destroy(): void {
    for (const spec of this.specs) {
      this.layers[spec.name].destroy({ children: true });
    }
  }
}
