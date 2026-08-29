import { Building, type BuildingContext, type BuildingDefinition } from "../Building";
import { WorkshopRenderer } from "./WorkshopRenderer";

/** The marker beside the name: a low shed with one bright bay in it. */
const WORKSHOP_ICON: readonly string[] = [
  ".#####.",
  "#######",
  "#.....#",
  "#.#.#.#",
  "#.#.#.#",
  "#....##",
  "#######",
];

/**
 * Everything about the workshop that isn't a pixel.
 *
 * Set east of centre so the lit corner — the right-hand end of the building —
 * lands under the scene's own `workshop-ai` zone, which is the patch of active
 * climate the rest of the dormant scene is measured against.
 */
export const WORKSHOP: BuildingDefinition = {
  id: "workshop",
  name: "The Workshop",
  plot: "workshop",
  plotPosition: 0.45,
  icon: WORKSHOP_ICON,
};

/** Side projects: three bays finished with, and one still running. */
export class WorkshopBuilding extends Building {
  constructor(context: BuildingContext) {
    super(WORKSHOP, new WorkshopRenderer(context.motionScale), context);
  }

  protected interact(): void {
    console.log(`Interacted with: ${this.name}`);
  }
}
