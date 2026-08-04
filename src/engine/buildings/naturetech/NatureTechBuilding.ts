import { Building, type BuildingContext, type BuildingDefinition } from "../Building";
import { NatureTechRenderer } from "./NatureTechRenderer";

/**
 * The marker beside the name on the prompt: a building half-drawn, with the
 * crane's hook over it.
 *
 * Drawn rather than an emoji, like every other landmark's.
 */
const NATURETECH_ICON: readonly string[] = [
  "#....#.",
  "#..#.#.",
  "#....#.",
  "######.",
  "#.#.#.#",
  "#.#.#.#",
  "#######",
];

/**
 * Everything about the foundry that isn't a pixel.
 *
 * The widest plot on the shore, because this is the only landmark that is a
 * *site* rather than a building: the block, the crane beside it, and the yard
 * between them all have to fit. `plotPosition` sits it slightly west of centre
 * so the crane's jib has open sky to swing into.
 */
export const NATURETECH: BuildingDefinition = {
  id: "naturetech",
  name: "NatureTech Foundry",
  plot: "naturetech",
  plotPosition: 0.46,
  interactionRadius: 380,
  icon: NATURETECH_ICON,
};

/**
 * NatureTech Foundry — the chapter that hasn't finished yet.
 *
 * Every other landmark on this shore is a closed chapter, drawn complete. This
 * one is deliberately half-built: finished offices at the bottom with people
 * still in them, bare primed steel above with the sky showing through, glass
 * stacked on the ground waiting to go in, and a crane over all of it with the
 * hook still hanging.
 *
 * It is the only building in the world whose meaning depends on being
 * incomplete, which is why nothing about it is drawn as damage — everything is
 * squared up, lit, staffed and mid-shift.
 *
 * # Still nothing here
 * The fourth landmark, and the framework has never needed a line changed.
 */
export class NatureTechBuilding extends Building {
  constructor(context: BuildingContext) {
    super(NATURETECH, new NatureTechRenderer(context.motionScale), context);
  }

  protected interact(): void {
    console.log(`Interacted with: ${this.name}`);
  }
}
