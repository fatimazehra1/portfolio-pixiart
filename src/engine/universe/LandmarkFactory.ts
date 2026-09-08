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
 *   .  empty      X  body      o  lit      #  shadowed      *  glowing
 * ```
 *
 * `*` is the one addition the hub asked for: a cell tinted with the chapter's
 * own `identity.accent` instead of its rock, so a window, a bulb or a lamp
 * room reads as lit rather than as one more body pixel. Everything baked here
 * also carries a one-pixel outline, derived from the shape rather than
 * plotted — at hub scale a brown shed on brown earth has no silhouette at all
 * without one.
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
  // A pitch steep enough to read as a roof at a fifth of this size, eaves that
  // overhang the walls so the two stay separate shapes, one lit window and a
  // door. Nothing else fits at hub scale, and nothing else is needed.
  cottage: [
    ".....oo.....",
    "....oXX#....",
    "...oXXXX#...",
    "..oXXXXXX#..",
    ".oXXXXXXXX#.",
    "oXXXXXXXXXX#",
    ".##########.",
    ".oX**XXXXX#.",
    ".oX**XX##X#.",
    ".oXXXXX##X#.",
    ".##########.",
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
  // Twice as tall as it is wide, and stepped in three times on the way up —
  // three wide, five, seven, nine. A straight-sided shaft at this scale reads
  // as a block whatever you put on it; the steps are the only thing that says
  // "tower". One window, three pixels across, lit in the chapter's accent,
  // because a single lit window is worth more than a facade of dark ones.
  spire: [
    "....X....",
    "...oX#...",
    "...oX#...",
    "..oXXX#..",
    "..oXXX#..",
    "..oXXX#..",
    ".oXXXXX#.",
    ".oX***X#.",
    ".oX***X#.",
    ".oXXXXX#.",
    "oXXXXXXX#",
    "oX#XXX#X#",
    "oXXXXXXX#",
    "oX#XXX#X#",
    "oXXXXXXX#",
    "oXX###XX#",
    "#########",
  ],

  // --- Workshop: a shed that has been added to more than once --------------
  // The bay stands open — a dark void a third of the front wide, which is the
  // whole point of a workshop you can see into — under a gable with a real
  // overhanging eave, a lit window beside it, and a stove vent clear of the
  // ridge. An earlier pass made the bay eight pixels of twelve and the whole
  // shed went back to reading as one dark lump.
  shed: [
    "..........oX#.",
    "..........oX#.",
    "......oo..oX#.",
    ".....oXXo.oX#.",
    "....oXXXXooX#.",
    "...oXXXXXXXX#.",
    "..oXXXXXXXXXX#",
    ".#############",
    ".oXX####XXXX#.",
    ".oXX####X**X#.",
    ".oXX####X**X#.",
    ".oXX####XXXX#.",
    ".#############",
  ],
  leanto: ["oo##", "oXX#", "oXX#", "####"],

  // --- Ideas: a tent. Pointed, temporary, guyed down ------------------------
  // Two poles crossed above the ridge, a door held open, and a bulb strung
  // under it. The poles are what stop this reading as a pyramid, and the bulb
  // is the one thing on the island that says somebody is still in there.
  tent: [
    "....o...#....",
    ".....o.#.....",
    "......X......",
    ".....oX#.....",
    "....oXXX#....",
    "...oXXXXX#...",
    "..oXX*X*XX#..",
    ".oXXX###XXX#.",
    ".oXX#####XX#.",
    "oXXX#####XXX#",
    "#############",
  ],

  // --- Lighthouse: the fixed point. Tall, tapered, lamp at the top ---------
  // The one shape on the map that has to be legible from anywhere on it. Top
  // to bottom: a capped lantern roof, the glazed lamp room, the railing and
  // the gallery deck it stands on, then a tower stepping out three times on
  // its way down. The beam leaves the lamp room horizontally, at lamp height
  // — drawn any lower it stopped being a beam and became a yellow box stuck to
  // the tower's side. `LANDMARK_ANCHORS` keeps the *tower* over the island
  // rather than the drawing's bounding box, which the beam skews.
  lighthouse: [
    "...oX#.......",
    "..oXXX#......",
    ".oXXXXX#.....",
    "..X***X...**.",
    "..X***X.*****",
    "..X***X...**.",
    "o#o#o#o#o....",
    "oXXXXXXX#....",
    "..oXXX#......",
    "..oXXX#......",
    "..oXXX#......",
    ".oXXXXX#.....",
    ".oXXXXX#.....",
    ".oX###X#.....",
    ".oXXXXX#.....",
    "oXXXXXXX#....",
    "oXXXXXXX#....",
    "oX#####X#....",
    "oXXXXXXX#....",
    "oXX###XX#....",
    "#########....",
  ],
};

/**
 * The column a drawing should be stood on, where that is not its own middle.
 *
 * Only the lighthouse needs one: its beam is half the bitmap's width and none
 * of its mass, so centring the bounding box hangs the tower off the island's
 * edge while the beam sits neatly over the middle. Everything else is
 * symmetric enough that the bitmap's centre is the right answer.
 */
const LANDMARK_ANCHORS: Record<string, number> = {
  lighthouse: 4, // the tower's own centre column
};

/** A landmark, baked into its outline and its four tones. */
export interface LandmarkTextures {
  base: Texture;
  light: Texture;
  dark: Texture;
  /** The `*` cells — tinted with the chapter's accent, not with its rock. */
  lit: Texture;
  /** One pixel of empty space around the whole silhouette, for a hard edge. */
  outline: Texture;
  /** The column this drawing stands on, in baked pixels — usually its middle. */
  anchorX: number;
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

    const built = bakePixelArt(rows, LANDMARK_ANCHORS[name]);
    this.cache.set(name, built);
    return built;
  }

  destroy(): void {
    for (const set of this.cache.values()) {
      set.base.destroy(true);
      set.light.destroy(true);
      set.dark.destroy(true);
      set.lit.destroy(true);
      set.outline.destroy(true);
    }
    this.cache.clear();
  }
}

/**
 * Turn `.`/`X`/`o`/`#`/`*` rows into five white masks, padded by one pixel.
 *
 * Exported because the hub's ground dressing (`SiteFactory`) is plotted in the
 * same convention and wants the same outline. One baker, one outline weight —
 * a crate drawn to a different rule than the tent beside it is the kind of
 * mismatch that reads as "assets from two places".
 */
export function bakePixelArt(rows: readonly string[], anchor?: number): LandmarkTextures {
  // A pixel of margin all round, so the derived outline has somewhere to go on
  // shapes whose walls run to the edge of their own plot — which is most of
  // them, because a silhouette that stops short of its bounds wastes width it
  // never gets back at this scale.
  const inner = Math.max(...rows.map((row) => row.length));
  const width = inner + 2;
  const height = rows.length + 2;
  const size = width * height;

  const base = new Uint8Array(size);
  const light = new Uint8Array(size);
  const dark = new Uint8Array(size);
  const lit = new Uint8Array(size);
  const outline = new Uint8Array(size);

  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < inner; x++) {
      const cell = row[x] ?? ".";
      if (cell === ".") continue;

      const i = (y + 1) * width + (x + 1);
      // Every filled pixel is in the body; the lit, shadowed and glowing masks
      // are drawn *over* it. One drawing, four tints, tinted per chapter at
      // runtime.
      base[i] = 255;
      if (cell === "o") light[i] = 255;
      else if (cell === "#") dark[i] = 255;
      else if (cell === "*") lit[i] = 255;
    }
  }

  // Derived, not plotted: every empty pixel orthogonally touching the body.
  // Drawn behind everything in the island's darkest rock tone, it is what
  // separates a brown shed from the brown earth it stands on.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (base[i]) continue;
      const touching =
        (x > 0 && base[i - 1]) ||
        (x < width - 1 && base[i + 1]) ||
        (y > 0 && base[i - width]) ||
        (y < height - 1 && base[i + width]);
      if (touching) outline[i] = 255;
    }
  }

  return {
    base: maskToTexture(width, height, base, "Landmark"),
    light: maskToTexture(width, height, light, "Landmark"),
    dark: maskToTexture(width, height, dark, "Landmark"),
    lit: maskToTexture(width, height, lit, "Landmark"),
    outline: maskToTexture(width, height, outline, "Landmark"),
    // Plus the pad, so callers can use it straight against the baked width.
    anchorX: (anchor ?? inner / 2) + 1,
    width,
    height,
  };
}
