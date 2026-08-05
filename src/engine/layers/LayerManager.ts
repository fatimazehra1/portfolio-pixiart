import { Container } from "pixi.js";
import type { CameraView } from "../camera/Camera";
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
  // The sea. Baked at viewport width, so it cannot travel — it holds still
  // against the camera and does its parallax internally instead, per wave.
  // Parallax 0 is what pins it there.
  { name: "backdrop", parallax: 0 },
  { name: "terrain", parallax: 1 },
  { name: "props", parallax: 1 },
  // Above the land and its planting, below the town. Colour that belongs to a
  // stretch of coast rather than to any object on it — so it must reach the
  // ground and the grass, and must not wash over the buildings, which carry
  // their own light.
  { name: "atmosphere", parallax: 1 },
  { name: "structures", parallax: 1 },
  // Weather is in the *air*, not at a place. Rain pinned to world coordinates
  // slides past the window as you pan, which reads as falling debris rather
  // than as weather — so the field holds still against the camera and the
  // scene director varies its intensity instead of its position.
  { name: "weather", parallax: 0 },
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
   * Place every layer against the camera's *applied* transform.
   *
   * Each layer works out the screen offset it wants — `parallax · travel`,
   * snapped once to the art grid — and then asks for whatever local x turns the
   * camera's actual translation into that. So the rounding happens exactly once
   * per layer, and the camera's own rounding is cancelled rather than
   * approximated.
   *
   * Rounding twice is the trap here, and it does not announce itself: a layer
   * that snapped `viewLeft` on its own would agree with the camera almost
   * everywhere and disagree by one whole art pixel wherever the two roundings
   * fell either side of a boundary — a backdrop that is supposed to be nailed to
   * the viewport, flicking back and forth by a pixel as you pan.
   *
   * Layers at parallax 1 fall out of this as exactly 0, which is the arithmetic
   * saying what it should: world space is what the camera already does.
   */
  setView(view: CameraView): void {
    for (const spec of this.specs) {
      // Where this layer wants to sit on screen, snapped to whole art pixels.
      const wanted = Math.round((-spec.parallax * view.viewLeft * view.zoom) / view.step) * view.step;
      // The local x that gets it there, given where the camera actually put us.
      this.layers[spec.name].x = (wanted - view.screenX) / view.zoom;
    }
  }

  /** Detach and destroy all layers and their contents. */
  destroy(): void {
    for (const spec of this.specs) {
      this.layers[spec.name].destroy({ children: true });
    }
  }
}
