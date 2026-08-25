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
}

export const ISO_THEME: Readonly<Record<string, IsoThemeEntry>> = {
  aptech: {
    // Warm sand — the campus, golden hour.
    topPalette: [0xf3e2ab, 0xe0c581, 0xc7a55d, 0xa3823f],
    rockPalette: [0xa88f66, 0x8a7350, 0x6b5a3e, 0x4a3f2c],
    undersideLength: 46,
    building: () => new AptechRenderer(1),
  },
  freelance: {
    // A meadow desk — soft green, small.
    topPalette: [0xd8e0ab, 0xbccf85, 0x9cb464, 0x748f45],
    rockPalette: [0x8f8a66, 0x726d4f, 0x554f39, 0x3a3527],
    undersideLength: 32,
  },
  planet01: {
    // City stone — cool blue-grey, the biggest world.
    topPalette: [0xb9cfe0, 0x93b4cc, 0x6f93ac, 0x4f7186],
    rockPalette: [0x6c7c88, 0x54636e, 0x3e4a54, 0x2c353d],
    undersideLength: 60,
    building: () => new Planet01Renderer(1),
  },
  vaultsys: {
    // Fortified grey stone — cool, shut, exact.
    topPalette: [0xc7ccd4, 0xa7adb8, 0x878e9a, 0x686f7a],
    rockPalette: [0x6a707a, 0x565b64, 0x42464e, 0x2e3136],
    undersideLength: 50,
    building: () => new VaultsysRenderer(1),
  },
  naturetech: {
    // Green construction earth — the current work, warm and active.
    topPalette: [0xc3d9a0, 0x9fc178, 0x7ea856, 0x5f8a3d],
    rockPalette: [0x8a7a5a, 0x6d6045, 0x504632, 0x362f21],
    undersideLength: 58,
    building: () => new NatureTechRenderer(1),
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
  },
};

export const DEFAULT_ISO_THEME: IsoThemeEntry = {
  topPalette: [0xcccccc, 0xaaaaaa, 0x888888, 0x666666],
  rockPalette: [0x777777, 0x5f5f5f, 0x474747, 0x303030],
  undersideLength: 36,
};
