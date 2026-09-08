import { Container, Sprite } from "pixi.js";
import { bakePixelArt } from "./LandmarkFactory";
import type { LandmarkTextures } from "./LandmarkFactory";

/**
 * The hub's ground dressing — everything standing on an island that is not
 * its building.
 *
 * # Why these are not props
 * `@/engine/environment` already grows trees, bushes, rocks, grass, flowers,
 * benches, sign posts, street lamps, fences and driftwood, and the hub uses
 * every one of them. What it does not grow is a crate, a pallet, a traffic
 * cone or a bollard — the coast has never needed one, and adding a `PropKind`
 * costs an entry in `KINDS`, one in `KIND_TONES` and a decision in every
 * scene's planting scheme, for the sake of nine islands on one screen.
 *
 * So: the shore's props for anything that grows, and the built clutter here.
 * Same plotting convention as `LANDMARKS`, the same baker and therefore the
 * same one-pixel outline — see `bakePixelArt`.
 *
 * ```
 *   .  empty      X  body      o  lit      #  shadowed      *  trim
 * ```
 *
 * # Why these carry their own palettes
 * A landmark is tinted from its island, because a building made of the ground
 * it stands on is the point. Dressing is the opposite: a traffic cone is
 * orange everywhere and a pallet is bare timber everywhere, and tinting them
 * to the island would turn a construction site into a heap of ground-coloured
 * lumps. Each material is stated once below and shared by everything made of
 * it.
 *
 * # No keyline
 * The baker still derives an outline mask and these deliberately do not draw
 * it. Every building in this world defines its edges with its own shading —
 * a lit face, a body, a shadowed face — and nothing on the shore is drawn
 * round in a darker colour. A ring of near-black around a five-pixel crate is
 * the single loudest thing on an island, and outlined props standing beside
 * un-outlined buildings is exactly the mismatch that reads as two art passes.
 * The `o` and `#` cells do the separating instead, which is why every piece
 * below is lit down one side and shaded down the other.
 *
 * The palettes are also pitched light. These stand on pale sand and pale
 * grass; at the values a prop would take on the shore's darker ground they
 * came out as a scatter of dark specks, which reads as dirt on the screen
 * rather than as things.
 */

/** What a dressing piece is made of. Three tones and a trim. */
interface SiteMaterial {
  base: number;
  light: number;
  dark: number;
  /** The `*` cells. `"accent"` takes the chapter's own accent colour. */
  trim: number | "accent";
}

const MATERIALS = {
  timber: { base: 0xb5936a, light: 0xd0b189, dark: 0x8a6a4a, trim: 0xa8b0b4 },
  rust: { base: 0xb5825c, light: 0xd0a077, dark: 0x8a5a3c, trim: 0xa8b0b4 },
  iron: { base: 0x8b8680, light: 0xa8a39b, dark: 0x66625b, trim: 0xffd9a0 },
  stone: { base: 0xb6b1a5, light: 0xd0cbbe, dark: 0x8b877d, trim: 0x8fb56d },
  paper: { base: 0xf0e9d6, light: 0xfdf8e8, dark: 0xc6bda4, trim: 0x8a8272 },
  hedge: { base: 0x8fb56d, light: 0xaed08c, dark: 0x6b8f52, trim: 0x6b8f52 },
  terracotta: { base: 0xcf9068, light: 0xe6b089, dark: 0xa06a48, trim: 0x8fb56d },
  driftwood: { base: 0xb5ab9c, light: 0xcfc7b8, dark: 0x8b8478, trim: 0x8b8478 },
  cone: { base: 0xe89a5e, light: 0xf7bd8a, dark: 0xbb6f3a, trim: 0xf7f1e4 },
  machine: { base: 0xe8bd63, light: 0xf7d894, dark: 0xb58c38, trim: 0x6c7c88 },
  mast: { base: 0x8b8680, light: 0xa8a39b, dark: 0x66625b, trim: "accent" },
} satisfies Record<string, SiteMaterial>;

type MaterialName = keyof typeof MATERIALS;

interface SitePiece {
  material: MaterialName;
  rows: readonly string[];
}

/**
 * Every dressing piece, by name.
 *
 * Three to eleven pixels across. They were half again this size and read as
 * furniture a person could not lift — a crate as wide as the workshop's door,
 * a hedge the length of the frontage. The rule that settled it: nothing here
 * except the machine may be taller than the building's ground floor.
 *
 * Light falls from the upper left, as everywhere else in this world, and every
 * piece is lit down one side and shaded down the other because that shading is
 * all the edge definition these get.
 */
export const SITE: Record<string, SitePiece> = {
  // --- Yards and sites -----------------------------------------------------
  crate: {
    material: "timber",
    rows: ["ooooo#", "oX##X#", "oXX#X#", "######"],
  },
  pallet: {
    material: "timber",
    rows: ["ooooooo", "#######", "oX.X.X#"],
  },
  scrapPile: {
    material: "rust",
    rows: ["..oo....", ".oXX#o#.", "oXX##XX#", "########"],
  },
  materialStack: {
    material: "timber",
    rows: ["..***...", "oXXXXX#.", "o######.", "oXXXXX#.", "########"],
  },
  cone: {
    material: "cone",
    rows: [".X..", ".X#.", ".**.", "oXX#", "####"],
  },
  machine: {
    material: "machine",
    rows: [
      ".....ooo...",
      "....oX*X#..",
      "...oXXXX#..",
      "..*.oXXXX#.",
      ".*ooXXXXX#.",
      "oXXXXXXXX#.",
      "o#########.",
      ".oX#..oX#..",
    ],
  },

  // --- Workshops and benches ----------------------------------------------
  workbench: {
    material: "timber",
    rows: ["..oo..*...", "oooooooo#.", "##########", ".oX#..oX#.", ".##...##.."],
  },
  toolRack: {
    material: "timber",
    rows: ["ooooo#.", "#####..", ".*.*...", ".X.X...", "oX..X#.", "##..##."],
  },
  stool: {
    material: "timber",
    rows: ["oooo", "####", ".oX#", "oX.#", "#..#"],
  },
  papers: {
    material: "paper",
    rows: [".oo.o.", "o**X*#", ".##.#."],
  },

  // --- Civic and formal ----------------------------------------------------
  bollard: {
    material: "iron",
    rows: [".o.", "o*#", "oX#", "oX#", "oX#", "###"],
  },
  planter: {
    material: "stone",
    rows: ["..***..", ".*****.", "oXXXXX#", "oX#X#X#", "#######"],
  },
  lowWall: {
    material: "stone",
    rows: ["oooooooo#.", "oX##XX#X#.", "oXX##X#X#.", "#########."],
  },
  hedge: {
    material: "hedge",
    rows: ["..oo.o..", ".oXXXX#.", "oXXXXXX#", "oXX#XXX#", "########"],
  },
  flagpole: {
    material: "mast",
    rows: [".o#.", ".oX*", ".oX*", ".oX*", ".oX.", ".oX.", ".oX.", ".oX.", "oXX#", "####"],
  },

  // --- Gardens and shores --------------------------------------------------
  gardenPatch: {
    material: "terracotta",
    rows: [".*..*..*", "o*.o*.o*", "oXXXXXX#", "########"],
  },
  pottedPlant: {
    material: "terracotta",
    rows: [".**.", "****", "..X.", "oXX#", "####"],
  },
  jettyPost: {
    material: "driftwood",
    rows: ["oo#", "###", "oX#", "oX#", "oX#", "oX#", "###"],
  },
} as const;

export type SiteKind = keyof typeof SITE;

/**
 * Bakes and shares the dressing drawings.
 *
 * One instance per overview, and one bake per *piece* — nine islands wanting
 * a crate between them get one set of textures, the same bargain `PropFactory`
 * and `LandmarkFactory` both make.
 */
export class SiteFactory {
  private readonly cache = new Map<string, LandmarkTextures>();

  /** A piece's baked masks, on first ask. Unknown names get nothing. */
  textures(kind: string): LandmarkTextures | null {
    const cached = this.cache.get(kind);
    if (cached) return cached;

    const piece = SITE[kind];
    if (!piece) return null;

    const built = bakePixelArt(piece.rows);
    this.cache.set(kind, built);
    return built;
  }

  /**
   * One dressing piece, ready to position: the three tones, then the trim.
   *
   * No outline layer — see the note on keylines above. `accent` is used only
   * by materials that asked for it.
   */
  make(kind: string, accent: number): SiteView | null {
    const art = this.textures(kind);
    const piece = SITE[kind];
    if (!art || !piece) return null;

    const material = MATERIALS[piece.material] as SiteMaterial;
    const trim = material.trim === "accent" ? accent : material.trim;

    const container = new Container();
    container.eventMode = "none";

    const add = (texture: (typeof art)["base"], tint: number) => {
      const sprite = new Sprite(texture);
      sprite.eventMode = "none";
      sprite.tint = tint;
      container.addChild(sprite);
    };

    add(art.base, material.base);
    add(art.light, material.light);
    add(art.dark, material.dark);
    add(art.lit, trim);

    return { container, width: art.width, height: art.height };
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

/** One placed dressing piece. The caller positions and scales the container. */
export interface SiteView {
  container: Container;
  width: number;
  height: number;
}
