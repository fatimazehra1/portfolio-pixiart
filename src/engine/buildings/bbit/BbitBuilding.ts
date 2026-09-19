import { Building, type BuildingContext, type BuildingDefinition } from "../Building";
import { BbitRenderer } from "./BbitRenderer";

/** The marker beside the name: a narrow tower with one window lit. */
const BBIT_ICON: readonly string[] = [
  "...#...",
  "..###..",
  ".#####.",
  ".#...#.",
  ".#.#.#.",
  ".#...#.",
  "#######",
];

/**
 * Everything about the spire that isn't a pixel.
 *
 * Centred on its plot: a tower this narrow off to one side of its own ground
 * reads as having been squeezed there, and the whole point of the silhouette
 * is that it stands up straight among low roofs.
 */
export const BBIT: BuildingDefinition = {
  id: "bbit",
  name: "VU Spire",
  plot: "bbit",
  plotPosition: 0.5,
  icon: BBIT_ICON,
};

/** The degree running alongside the work — and the window that stays lit. */
export class BbitBuilding extends Building {
  constructor(context: BuildingContext) {
    super(BBIT, new BbitRenderer(context.motionScale), context);
  }

  protected interact(): void {
    console.log(`Interacted with: ${this.name}`);
  }
}
