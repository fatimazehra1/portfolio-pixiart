import { Building, type BuildingContext, type BuildingDefinition } from "../Building";
import { CottageRenderer } from "./CottageRenderer";

/**
 * The marker beside the name on the prompt: a little pitched roof over a door.
 *
 * Drawn rather than an emoji, for the same reason every other icon here is —
 * an emoji is a full-colour vector glyph from whatever font the visitor
 * happens to have (CLAUDE.md §Pixel Art Rules, §Assets).
 */
const COTTAGE_ICON: readonly string[] = [
  "...#...",
  "..###..",
  ".#####.",
  "#######",
  "#.###.#",
  "#.#.#.#",
  "###.###",
];

/**
 * Everything about the cottage that isn't a pixel.
 *
 * `plot` is the scene's own id, which is how every landmark finds the ground
 * kept clear for it. Set a little west of centre so the mailbox and the path
 * on its east side have somewhere to stand.
 */
export const COTTAGE: BuildingDefinition = {
  id: "cottage",
  name: "The Freelance Cottage",
  plot: "cottage",
  plotPosition: 0.44,
  icon: COTTAGE_ICON,
};

/** The freelance years: one room, one lamp, and a mailbox that keeps filling. */
export class CottageBuilding extends Building {
  constructor(context: BuildingContext) {
    super(COTTAGE, new CottageRenderer(context.motionScale), context);
  }

  protected interact(): void {
    console.log(`Interacted with: ${this.name}`);
  }
}
