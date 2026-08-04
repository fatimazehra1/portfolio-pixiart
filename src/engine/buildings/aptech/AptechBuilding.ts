import { Building, type BuildingContext, type BuildingDefinition } from "../Building";
import { AptechRenderer } from "./AptechRenderer";

/**
 * The marker beside the name on the prompt: a little gated campus.
 *
 * Drawn rather than an emoji. An emoji is a full-colour vector glyph from
 * whatever font the visitor happens to have, which is three separate ways of
 * breaking a pixel-art world (CLAUDE.md §Pixel Art Rules, §Assets).
 */
const APTECH_ICON: readonly string[] = [
  "..###..",
  ".#####.",
  "#######",
  "#.###.#",
  "#.###.#",
  "#..#..#",
  "###.###",
];

/**
 * Everything about the campus that isn't a pixel.
 *
 * `plot` names ground the shore already keeps clear (GroundLayout
 * §BUILDING_PLOTS: "Open campus; wants width"), and `plotPosition` puts it a
 * little west of centre so the road still runs open past its gate.
 */
export const APTECH: BuildingDefinition = {
  id: "aptech",
  name: "Aptech Campus",
  plot: "aptech",
  plotPosition: 0.46,
  icon: APTECH_ICON,
};

/**
 * The Aptech Campus — the first chapter, and the first thing in this world you
 * can actually walk up to (WORLD.md, DESIGN.md §Design Philosophy: every
 * building represents a chapter).
 *
 * # How little there is here
 * That is the point. Placement, the pixel grid, day/night lighting, the
 * interaction zone, camera culling and teardown all come from `Building`; the
 * artwork comes from `AptechRenderer`. What is left is a definition and one
 * method saying what happens when you press the key.
 *
 * Every landmark still to come — Planet01, Vaultsys, NatureTech, BBIT, the
 * Workshop, the Ideas Tent, the Freelance Cottage — is this file with a
 * different definition and a different renderer. None of them will need to
 * change anything in `src/engine/buildings/`.
 */
export class AptechBuilding extends Building {
  constructor(context: BuildingContext) {
    super(APTECH, new AptechRenderer(context.motionScale), context);
  }

  /**
   * What pressing the key does.
   *
   * A log, deliberately. The dialogue, the timeline and the resume card this
   * will eventually open are later phases, and wiring any of them in now would
   * mean deciding their shape before there is anything to shape them around.
   */
  protected interact(): void {
    console.log(`Interacted with: ${this.name}`);
  }
}
