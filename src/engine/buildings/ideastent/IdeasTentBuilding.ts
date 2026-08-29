import { Building, type BuildingContext, type BuildingDefinition } from "../Building";
import { IdeasTentRenderer } from "./IdeasTentRenderer";

/** The marker beside the name: an awning on two poles. */
const TENT_ICON: readonly string[] = [
  ".......",
  "#######",
  ".#####.",
  "#.###.#",
  "#..#..#",
  "#..#..#",
  "#..#..#",
];

/**
 * Everything about the tent that isn't a pixel.
 *
 * A touch west of centre: the guy-ropes reach further to the east than the
 * west, and centring the poles would put the eastern pegs off the plot.
 */
export const IDEAS_TENT: BuildingDefinition = {
  id: "ideastent",
  name: "The Ideas Tent",
  plot: "ideastent",
  plotPosition: 0.47,
  icon: TENT_ICON,
};

/** Where things arrive unannounced: canvas, a bench, and a bulb on a wire. */
export class IdeasTentBuilding extends Building {
  constructor(context: BuildingContext) {
    super(IDEAS_TENT, new IdeasTentRenderer(context.motionScale), context);
  }

  protected interact(): void {
    console.log(`Interacted with: ${this.name}`);
  }
}
