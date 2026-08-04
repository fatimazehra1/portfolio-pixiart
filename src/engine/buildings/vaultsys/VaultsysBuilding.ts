import { Building, type BuildingContext, type BuildingDefinition } from "../Building";
import { VaultsysRenderer } from "./VaultsysRenderer";

/**
 * The marker beside the name on the prompt: a round vault door.
 *
 * The building's own ornament, at seven pixels. Drawn rather than an emoji, for
 * the same reason as the others.
 */
const VAULTSYS_ICON: readonly string[] = [
  ".#####.",
  "##...##",
  "#..#..#",
  "#.###.#",
  "#..#..#",
  "##...##",
  ".#####.",
];

/**
 * Everything about the centre that isn't a pixel.
 *
 * It stands on its own plot east of Planet01, which is where WORLD.md puts this
 * chapter. The radius is set explicitly and a little wider than the default —
 * the default comes from a building's width, and this one is broad enough that
 * the width-derived radius would have the prompt appear while the far wing was
 * still off screen.
 */
export const VAULTSYS: BuildingDefinition = {
  id: "vaultsys",
  name: "Vaultsys Financial Center",
  plot: "vaultsys",
  plotPosition: 0.5,
  interactionRadius: 330,
  icon: VAULTSYS_ICON,
};

/**
 * Vaultsys Financial Center — where the work started reaching real people's
 * money.
 *
 * Broad, symmetrical and quiet: a bank headquarters, not a startup floor. The
 * whole design brief was to be the opposite of its neighbour, and the contrast
 * is the point — you should be able to tell which chapter you are standing in
 * from the silhouette alone, before reading a word.
 *
 * # Still nothing here
 * The third landmark, and the framework still hasn't needed a line changed. A
 * definition, a renderer, and one method saying what the key does.
 */
export class VaultsysBuilding extends Building {
  constructor(context: BuildingContext) {
    super(VAULTSYS, new VaultsysRenderer(context.motionScale), context);
  }

  protected interact(): void {
    console.log(`Interacted with: ${this.name}`);
  }
}
