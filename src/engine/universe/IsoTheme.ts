import {
  AptechRenderer,
  NatureTechRenderer,
  Planet01Renderer,
  VaultsysRenderer,
} from "../buildings";
import type { BuildingRenderer } from "../buildings";

/**
 * The hub's own per-chapter styling — palettes, island seeds, and which
 * landmark (if any) stands on each island.
 *
 * Kept apart from `UniverseRegistry` on purpose: the registry is read by both
 * the hub and a chapter's zoomed interior (era, status, camera, scenes), and
 * none of *that* is an isometric-hub concern. This file is the hub's alone —
 * exactly the seam "only the hub screen changes" asks for.
 */

export interface IsoThemeEntry {
  /** Top-face palette, light to dark. */
  topPalette: readonly number[];
  /** Wall + underside palette, light to dark. */
  rockPalette: readonly number[];
  /** How far the rock tapers below the walls, in island pixels. */
  undersideLength: number;
  /** Makes this chapter's landmark, if it has a dedicated renderer. */
  building?: () => BuildingRenderer;
  /**
   * Target building height, as a multiple of the island's own top-face width.
   * Every building is scaled to hit this rather than its raw pixel size, so a
   * squat campus and a five-storey tower read as similar *presences* on the
   * map. 1.0–1.3 for most; Planet01 goes higher on purpose — it is meant to
   * be the tallest thing on the board, just not an outlier.
   */
  heightFactor?: number;
  /**
   * Extra ambient boost applied only to this chapter's building/landmark, on
   * top of the hub's own flat lighting. For the two that read as near-black
   * under plain daylight — Vaultsys's stone is deliberately cool and dark,
   * and Lighthouse leans hard on its `#` shadow tone.
   */
  lightBoost?: number;
}

export const ISO_THEME: Readonly<Record<string, IsoThemeEntry>> = {
  aptech: {
    // Warm sand — the campus, golden hour.
    topPalette: [0xf3e2ab, 0xe0c581, 0xc7a55d, 0xa3823f],
    rockPalette: [0xa88f66, 0x8a7350, 0x6b5a3e, 0x4a3f2c],
    undersideLength: 46,
    building: () => new AptechRenderer(1),
    // Low and wide by design (ART_DIRECTION.md — a campus you're let into, not
    // a tower you look up at); a width cap keeps it from overrunning its
    // island, so its own height comes out under the shared target.
    heightFactor: 1.0,
  },
  freelance: {
    // A meadow desk — soft green, small.
    topPalette: [0xd8e0ab, 0xbccf85, 0x9cb464, 0x748f45],
    rockPalette: [0x8f8a66, 0x726d4f, 0x554f39, 0x3a3527],
    undersideLength: 32,
  },
  planet01: {
    // Warm city stone — the biggest world. Was a cool blue that read as
    // water from a distance, top *and* underside; moved both onto the same
    // rock/earth family as every other island.
    topPalette: [0xd8cdb8, 0xbcae94, 0x9c8d72, 0x7c6e56],
    rockPalette: [0x8c8478, 0x6e675c, 0x534d44, 0x38332c],
    undersideLength: 60,
    building: () => new Planet01Renderer(1),
    // Tallest on the board, deliberately — a rooftop-classroom tower earns
    // more presence than the others, capped well under 1.5x their height.
    heightFactor: 1.35,
  },
  // Matches `ChapterConfig.id` in the registry, which is spelled with one
  // "t" — a mismatch here silently falls back to `DEFAULT_ISO_THEME` (no
  // `building`), and the real renderer never gets used at all.
  vaulsys: {
    // Fortified grey stone — cool, shut, exact.
    topPalette: [0xc7ccd4, 0xa7adb8, 0x878e9a, 0x686f7a],
    rockPalette: [0x6a707a, 0x565b64, 0x42464e, 0x2e3136],
    undersideLength: 50,
    building: () => new VaultsysRenderer(1),
    heightFactor: 1.2,
    lightBoost: 1.3,
  },
  naturetech: {
    // Green construction earth — the current work, warm and active.
    topPalette: [0xc3d9a0, 0x9fc178, 0x7ea856, 0x5f8a3d],
    rockPalette: [0x8a7a5a, 0x6d6045, 0x504632, 0x362f21],
    undersideLength: 58,
    building: () => new NatureTechRenderer(1),
    heightFactor: 1.15,
  },
  bbit: {
    // Purple stone — study, upright, quiet.
    topPalette: [0xd6c6e6, 0xb9a0cf, 0x9a7fb2, 0x7c6194],
    rockPalette: [0x6f6178, 0x584d61, 0x413849, 0x2c2632],
    undersideLength: 40,
  },
  workshop: {
    // Dark earth and rust — a bench, half-finished.
    topPalette: [0xc9ad84, 0xa88a61, 0x866c47, 0x63502f],
    rockPalette: [0x746452, 0x5a4d3f, 0x40372c, 0x2b251d],
    undersideLength: 36,
  },
  ideas: {
    // Dark earth, warmer — a tent, arrivals unannounced.
    topPalette: [0xd9b98a, 0xc19a63, 0xa17c48, 0x7d5f34],
    rockPalette: [0x6b5642, 0x534333, 0x3c3126, 0x28211a],
    undersideLength: 34,
  },
  lighthouse: {
    // Pale stone — the beacon, always lit.
    topPalette: [0xe8e2d4, 0xcfc7b3, 0xb0a793, 0x8f8776],
    rockPalette: [0x716b5e, 0x5a554a, 0x433f37, 0x2d2a25],
    undersideLength: 44,
    lightBoost: 1.35,
  },
};

export const DEFAULT_ISO_THEME: IsoThemeEntry = {
  topPalette: [0xcccccc, 0xaaaaaa, 0x888888, 0x666666],
  rockPalette: [0x777777, 0x5f5f5f, 0x474747, 0x303030],
  undersideLength: 36,
};
