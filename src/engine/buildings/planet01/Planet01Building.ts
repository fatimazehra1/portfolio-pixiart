import { Building, type BuildingContext, type BuildingDefinition } from "../Building";
import { Planet01Renderer } from "./Planet01Renderer";

/**
 * The marker beside the name on the prompt: a tower with a lit floor in it.
 *
 * Drawn rather than an emoji, for the same reason the campus is — an emoji is a
 * full-colour vector glyph from whatever font the visitor happens to have.
 */
const PLANET01_ICON: readonly string[] = [
  "..###..",
  ".#...#.",
  ".#.#.#.",
  ".#...#.",
  ".#.#.#.",
  ".#...#.",
  "#######",
];

/**
 * Everything about the tower that isn't a pixel.
 *
 * It stands on its own reserved plot between the cottage and the climb to the
 * lighthouse, which is where WORLD.md puts this chapter. `plotPosition` sits it
 * just past the middle so the forecourt has road in front of it rather than the
 * plot boundary.
 *
 * The interaction radius is set explicitly and wider than the default. The
 * default is derived from a building's width, and this one is tall rather than
 * wide — going by width alone you would have to walk almost into the lobby
 * before a building you can see from half the shore away would admit it was
 * there.
 */
export const PLANET01: BuildingDefinition = {
  id: "planet01",
  name: "Planet01 Tower",
  plot: "planet01",
  plotPosition: 0.52,
  interactionRadius: 360,
  icon: PLANET01_ICON,
};

/**
 * Planet01 Tower — the chapter where the career accelerated.
 *
 * Four floors and a roof, each one a project: a catering site at street level,
 * a Bitcoin frontend above it, CTAWORLD taking up more of the building than
 * anything else, the rider dashboard under the roof, and a small classroom on
 * top of all of it with two people in it.
 *
 * # How little there is here
 * Still the same as the campus: a definition, a renderer and one method. The
 * building framework already handles placement on a reserved plot, the shared
 * pixel grid, day/night lighting, the interaction zone, camera culling and
 * teardown — none of which needed changing to take a building three times the
 * size of the last one.
 */
export class Planet01Building extends Building {
  constructor(context: BuildingContext) {
    super(PLANET01, new Planet01Renderer(context.motionScale), context);
  }

  protected interact(): void {
    console.log(`Interacted with: ${this.name}`);
  }
}
