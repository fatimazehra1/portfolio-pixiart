import type { Texture } from "pixi.js";
import { maskToTexture } from "../shared";

/**
 * The structures that stand on the worlds, at overview scale.
 *
 * # Why these are silhouettes and not buildings
 * A world on the map is thirty to sixty art pixels wide. There is no room in
 * that for architecture and no benefit to it — at that size a building is read
 * entirely by its outline. What separates Planet01 from Vaulsys at a glance is
 * that one is *tall and stepped* and the other is *wide and shut*; adding
 * windows to either would spend a hundred pixels saying nothing the shape has
 * not already said.
 *
 * The detailed buildings already exist and are far better than anything at this
 * scale could be — `AptechRenderer`, `Planet01Renderer`, `VaultsysRenderer`,
 * `NatureTechRenderer`, two and a half thousand lines of hand-plotted art. Those
 * are what a chapter's *interior* is made of. These are the marks on the map
 * that tell you which interior you are about to fly into, and conflating the two
 * jobs is how you end up with a map you cannot read and buildings you cannot
 * see.
 *
 * # The plotting convention
 * Identical to `PropFactory.BITMAPS`, deliberately, so anyone who has read one
 * can read the other:
 *
 * ```
 *   .  empty      X  body      o  lit      #  shadowed
 * ```
 *
 * Light comes from the upper left, which is the convention every drawing in
 * this world already follows — the cloud tops, the lighthouse, the shore props.
 */

/**
 * Every landmark, by name.
 *
 * Grouped by the world that uses it, in the order the map reads. A chapter
 * names these in its `identity.landmarks`; nothing here knows which chapter it
 * belongs to, so a shape can be shared where sharing is honest.
 */
export const LANDMARKS: Record<string, readonly string[]> = {
  // --- Aptech: an open campus. Low, wide, a flag over the entrance ----------
  campus: [
    "....oooo....",
    "..ooXXXXoo..",
    ".oXXXXXXXX#.",
    "oXXXXXXXXXX#",
    "oXXXXXXXXXX#",
    "oXXX####XXX#",
    "oXXX#..#XXX#",
    "############",
  ],
  flagpole: [
    "oXXX#",
    "oXXX#",
    "oX...",
    "oX...",
    "oX...",
    "oX...",
    "#X...",
  ],

  // --- Freelance: one small cottage, one chimney ---------------------------
  cottage: [
    "...oo...",
    "..oXXX#.",
    ".oXXXXX#",
    "oXXXXXXX",
    "oXXXXXXX",
    "oX##XXX#",
    "########",
  ],
  chimney: ["oX#", "oX#", "oX#"],

  // --- Planet01: a city. One tower that owns the skyline, blocks around it --
  tower: [
    "..oooo..",
    ".oXXXX#.",
    "oXXXXXX#",
    "oX#oX#X#",
    "oXXXXXX#",
    "oX#oX#X#",
    "oXXXXXX#",
    "oX#oX#X#",
    "oXXXXXX#",
    "oX#oX#X#",
    "oXXXXXX#",
    "########",
  ],
  block: [
    "oooo#",
    "oXXX#",
    "oX#X#",
    "oXXX#",
    "oX#X#",
    "#####",
  ],
  lowblock: ["ooo#", "oXX#", "oX##", "####"],

  // --- Vaulsys: shut, fortified, deliberately the least interesting outline -
  vault: [
    "oooooooooo",
    "oXXXXXXXX#",
    "oX##XX##X#",
    "oXXXXXXXX#",
    "oX##XX##X#",
    "oXXXXXXXX#",
    "##########",
  ],
  aerial: ["o.", "X.", "X.", "X#"],

  // --- NatureTech: unfinished. A crane and a frame with no walls yet -------
  crane: [
    "ooooooo#",
    "...oX#..",
    "...oX#..",
    "...oX#..",
    "...oX#..",
    "...oX#..",
    "..oXXX#.",
  ],
  frame: [
    "o#o#o#o#",
    "oX.X.X.#",
    "o#o#o#o#",
    "oX.X.X.#",
    "o#o#o#o#",
    "########",
  ],

  // --- BBIT: a stone spire. Quiet, upright, nothing beside it --------------
  spire: [
    "..oo..",
    ".oXX#.",
    ".oXX#.",
    "oXXXX#",
    "oX##X#",
    "oXXXX#",
    "oX##X#",
    "oXXXX#",
    "######",
  ],

  // --- Workshop: a shed that has been added to more than once --------------
  shed: [
    "..ooooo..",
    ".oXXXXX#.",
    "oXXXXXXX#",
    "oX#XXX#X#",
    "oXXXXXXX#",
    "#########",
  ],
  leanto: ["oo##", "oXX#", "oXX#", "####"],

  // --- Ideas: a tent. Pointed, temporary, guyed down ------------------------
  tent: [
    "...o...",
    "..oX#..",
    ".oXXX#.",
    "oXXXXX#",
    "oX#.#X#",
    "#######",
  ],

  // --- Lighthouse: the fixed point. Tall, tapered, lamp at the top ---------
  lighthouse: [
    ".oXX#.",
    ".o##X.",
    ".oXX#.",
    "oXXXX#",
    ".oXX#.",
    ".oXX#.",
    ".oXX#.",
    "oXXXX#",
    "oX##X#",
    "oXXXX#",
    "######",
  ],
};

/** A landmark, baked into its three tones. */
export interface LandmarkTextures {
  base: Texture;
  light: Texture;
  dark: Texture;
  width: number;
  height: number;
}

/**
 * Bakes and shares the landmark drawings.
 *
 * One instance per overview. A drawing is baked the first time any world asks
 * for it and shared by every world thereafter — two chapters that both want a
 * `block` get one set of textures, which is the same bargain `PropFactory`
 * makes and for the same reason.
 */
export class LandmarkFactory {
  private readonly cache = new Map<string, LandmarkTextures>();

  /** The drawing for one landmark, baked on first ask. */
  textures(name: string): LandmarkTextures | null {
    const cached = this.cache.get(name);
    if (cached) return cached;

    const rows = LANDMARKS[name];
    // A chapter naming a drawing that does not exist gets no landmark rather
    // than a crash. A typo in a registry should cost a missing tower, not a
    // blank screen.
    if (!rows || rows.length === 0) return null;

    const built = bake(rows);
    this.cache.set(name, built);
    return built;
  }

  destroy(): void {
    for (const set of this.cache.values()) {
      set.base.destroy(true);
      set.light.destroy(true);
      set.dark.destroy(true);
    }
    this.cache.clear();
  }
}

/** Turn `.`/`X`/`o`/`#` rows into three white masks. */
function bake(rows: readonly string[]): LandmarkTextures {
  const height = rows.length;
  const width = Math.max(...rows.map((row) => row.length));
  const size = width * height;

  const base = new Uint8Array(size);
  const light = new Uint8Array(size);
  const dark = new Uint8Array(size);

  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const cell = row[x] ?? ".";
      if (cell === ".") continue;

      const i = y * width + x;
      // Every filled pixel is in the body; the lit and shadowed masks are drawn
      // *over* it. One drawing, three tints, tinted per chapter at runtime.
      base[i] = 255;
      if (cell === "o") light[i] = 255;
      else if (cell === "#") dark[i] = 255;
    }
  }

  return {
    base: maskToTexture(width, height, base, "Landmark"),
    light: maskToTexture(width, height, light, "Landmark"),
    dark: maskToTexture(width, height, dark, "Landmark"),
    width,
    height,
  };
}
