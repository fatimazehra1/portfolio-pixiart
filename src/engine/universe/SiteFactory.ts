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

  // --- Materials that belong to one era and not the others ------------------
  //
  // The list above is what any island might have lying about. These are what
  // separates a 2021 campus from a 2023 city block: painted softwood and
  // pinned paper against brushed steel and safety glass. An island's era is
  // carried by what its dressing is *made of* at least as much as by what
  // shape the dressing is.

  /** Notice boards and their pinned paper. */
  board: { base: 0xb5936a, light: 0xd0b189, dark: 0x8a6a4a, trim: 0xf0e9d6 },
  /** Tarpaulin, and anything else stretched over something else. */
  canvas: { base: 0x6f8f96, light: 0x92b0b6, dark: 0x50686e, trim: 0xb5936a },
  /** Hemp. Old, and the only thing holding half of Ideas together. */
  rope: { base: 0xc9ab77, light: 0xe2c79c, dark: 0x9a7e52, trim: 0x8a6a4a },
  /** Weathered softwood with paint on it, applied by hand and some time ago. */
  handmade: { base: 0xb09a76, light: 0xcbb897, dark: 0x87755a, trim: 0xd8734f },
  /** Sacking. */
  sack: { base: 0xc4ab7e, light: 0xdcc79e, dark: 0x94805a, trim: 0x8a8272 },
  /** Lamp brass, with a flame for a trim. */
  brass: { base: 0xc9a44e, light: 0xe6c47a, dark: 0x94742f, trim: 0xffd9a0 },
  /** Painted softwood: fences, posts, anything domestic. */
  paintedWood: { base: 0xe4dccc, light: 0xfaf4e6, dark: 0xb0a897, trim: 0xc9ab77 },
  /** Steel and safety glass. The modern lamp, and nothing before 2020. */
  steel: { base: 0x98a2ac, light: 0xc2cad2, dark: 0x6c747d, trim: 0xffe9a8 },
  /** Signage: enamelled panel, white legend. */
  signage: { base: 0x3f6fa0, light: 0x6c99c6, dark: 0x2c4e73, trim: 0xf7f1e4 },
  /** Hazard paint on a barrier arm. */
  barrier: { base: 0xe8e2d4, light: 0xfdf8ee, dark: 0xb0aa9c, trim: 0xd8734f },
  /** A work light, and the only genuinely white light on the board. */
  floodlight: { base: 0x8b8680, light: 0xa8a39b, dark: 0x66625b, trim: 0xfff2c0 },
  /** Automotive paint and window glass. */
  car: { base: 0xc25b52, light: 0xdd8079, dark: 0x8e3d36, trim: 0x9fd0e0 },
  /** Marine paint, the loudest thing on the coast. */
  marine: { base: 0xd8734f, light: 0xea9670, dark: 0xa45234, trim: 0xf0e9d6 },
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

  // --- A campus, 2021 ------------------------------------------------------
  noticeBoard: {
    material: "board",
    rows: ["ooooooo#", "o*****X#", "o**.**X#", "o*****X#", "oXXXXXX#", "########", ".oX#oX#.", ".##.##.."],
  },

  // --- A workshop ----------------------------------------------------------
  cableSpool: {
    material: "timber",
    rows: [".oooo#.", "o*XX*#.", "oX**X##", "o*XX*#.", ".####.."],
  },
  tarp: {
    material: "canvas",
    rows: ["...ooo..", "..oXXX#.", ".oXXXX##", "oXXXXX##", "########"],
  },

  // --- Ideas: old, handmade, and nothing later than a paraffin lamp --------
  stake: {
    material: "driftwood",
    rows: [".o#", ".X#", "*X*", ".X#", ".X#", ".X#", ".##"],
  },
  ropeCoil: {
    material: "rope",
    rows: [".oooo#.", "o*XX*#.", "o#XX##.", ".o**#..", ".####.."],
  },
  handSign: {
    material: "handmade",
    rows: ["oooooo#", "o****X#", "o*XX*X#", "oXXXXX#", "###X###", "...X...", "..oX#..", "..###.."],
  },
  sack: {
    material: "sack",
    rows: ["..oo#..", ".oXXX#.", "oXXXX##", "oXXXX##", "o####X#", "#######"],
  },
  oilLantern: {
    material: "brass",
    rows: [".o#.", "o**#", "o**#", "oXX#", "####"],
  },

  // --- A house somebody works from, 2022 -----------------------------------
  picketFence: {
    material: "paintedWood",
    rows: [".o.o.o.o.", "oXoXoXoX#", "*********", "oXoXoXoX#", "#.#.#.#.#"],
  },
  washingLine: {
    material: "paintedWood",
    rows: ["o*******#", "oX.oX.oX.", "oX.oX.oX.", "##.##.##.", "o#.....o#", "o#.....o#", "###...###"],
  },

  // --- A city block, 2023 --------------------------------------------------
  lampPost: {
    material: "steel",
    rows: ["..oo*#", "..o**#", "...X#.", "...X#.", "...X#.", "...X#.", "...X#.", "..oX#.", "..###."],
  },
  roadSign: {
    material: "signage",
    rows: [".oooo#.", ".o**X#.", ".oXXX#.", ".#####.", "...X...", "...X...", "..oX#..", "..###.."],
  },
  parkedCar: {
    material: "car",
    rows: ["...oooo....", "..o****#...", ".oXXXXXX#..", "oXXXXXXXX#.", "###########", ".o#....o#..", ".##....##.."],
  },

  // --- A vault, and the ground it will not let you drive over --------------
  barrierGate: {
    material: "barrier",
    rows: ["oo#.........", "o*#*X*X*X*X#", "oX##########", "oX#.........", "oX#.........", "###........."],
  },

  // --- A campus with older stone, and lamps to match -----------------------
  campusLamp: {
    material: "iron",
    rows: [".o*#.", "o***#", "o*X*#", ".oX#.", ".oX#.", ".oX#.", "oXX#.", "####."],
  },

  // --- A live site -------------------------------------------------------
  scaffold: {
    material: "steel",
    rows: ["o#o#o#o#", "########", "oX.X.X.X", "oX.X.X.X", "o#o#o#o#", "########", "oX.X.X.X", "########"],
  },
  siteFence: {
    material: "iron",
    rows: ["oooooooo#", "oX#X#X#X#", "o#X#X#X##", "oX#X#X#X#", "#########", ".o#....o#", ".##....##"],
  },
  floodlight: {
    material: "floodlight",
    rows: [".o***#..", ".o***#..", ".o###...", "...X....", "...X....", "..oX#...", "..###..."],
  },
  cementMixer: {
    material: "machine",
    rows: ["...oo#...", "..o**X#..", ".oX***X#.", ".oXXXXX#.", "..o###...", "..oX#....", "o#####o#.", "##...###."],
  },

  // --- A shore -------------------------------------------------------------
  buoy: {
    material: "marine",
    rows: ["..o#..", ".o**#.", "o****#", "oXXXX#", ".o##..", "..##.."],
  },
  jetty: {
    material: "driftwood",
    rows: ["ooooooooo", "#########", "oXXXXXXX#", "#########", ".o#...o#.", ".##...##."],
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
