import { Container } from "pixi.js";
import type { LayerName } from "../types";

/** Back-to-front draw order. Index in this array == z-order. */
export const LAYER_ORDER: readonly LayerName[] = [
  "background",
  "midground",
  "foreground",
] as const;

/**
 * Owns the three world render layers. Systems (sky, ocean, buildings, particles…)
 * add their display objects into the appropriate layer via `get(name)`. Keeping
 * layers here means z-ordering is defined in exactly one place.
 */
export class LayerManager {
  private readonly layers: Record<LayerName, Container>;

  /** @param parent the world container the layers are mounted into. */
  constructor(parent: Container) {
    this.layers = {
      background: new Container(),
      midground: new Container(),
      foreground: new Container(),
    };

    // Added in LAYER_ORDER so later layers render on top.
    for (const name of LAYER_ORDER) {
      const layer = this.layers[name];
      layer.label = `layer:${name}`;
      parent.addChild(layer);
    }
  }

  /** The container for a given layer — the mount point for that layer's content. */
  get(name: LayerName): Container {
    return this.layers[name];
  }

  /** Detach and destroy all layers and their contents. */
  destroy(): void {
    for (const name of LAYER_ORDER) {
      this.layers[name].destroy({ children: true });
    }
  }
}
