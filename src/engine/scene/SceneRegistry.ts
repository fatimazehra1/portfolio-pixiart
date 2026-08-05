import { DEFAULT_SCENE_CAMERA, NEUTRAL_PALETTE, STATUS_CLIMATE } from "./StatusClimate";
import type {
  PaletteDelta,
  ResolvedScene,
  ResolvedZone,
  SceneConfig,
  SceneZone,
} from "./SceneTypes";

/**
 * The waterfront, as a list of places.
 *
 * This is the single source of truth for the world's composition. Ten entries,
 * west to east, in the order the journey visits them. The ground's plots, the
 * buildings' positions, the weather, the grade, the planting and the camera
 * framing are all derived from this file — nothing restates it.
 *
 * # Absolute coordinates
 * `worldX` is in world pixels, not fractions. See `SceneConfig.worldX` for why:
 * fractions rescale silently, and a layout that silently rescales is a layout
 * you cannot compose against.
 *
 * # Status, not taste
 * Nothing here says what the weather over a scene is. It says what the scene
 * *is*, and `STATUS_CLIMATE` turns that into weather. The two scenes that
 * depart from their status carry a `reason`, and reading the file you can see
 * at a glance that they are the only two.
 */
export const SCENES: readonly SceneConfig[] = [
  {
    id: "dock",
    name: "The Dock",
    worldX: 540,
    width: 540,
    status: "active",
    note: "Where you arrive. Clear air, because the first thing you see should be legible.",
  },
  {
    id: "aptech",
    name: "Aptech Campus",
    worldX: 1647,
    width: 702,
    status: "past",
    rendererId: "aptech",
    note: "Where the training happened. Finished, and finished well.",
  },
  {
    id: "cottage",
    name: "The Freelance Cottage",
    worldX: 2754,
    width: 432,
    status: "past",
    note: "Where the freelance years happened. Finished, and behind you.",
  },
  {
    id: "planet01",
    name: "Planet01 Tower",
    worldX: 3780,
    width: 540,
    status: "past",
    rendererId: "planet01",
    overrides: {
      // The tower is the visual centrepiece of the whole waterfront and it is
      // built to be seen from a long way off. `past` would put a veil over the
      // one silhouette the skyline is composed around, so the haze comes off
      // and the palette carries the whole "this is behind you" reading instead.
      weather: [{ kind: "haze", intensity: 0.12 }],
      reason: "Skyline landmark: haze at the status default would soften the silhouette the composition depends on.",
    },
    note: "Four floors of projects and a rooftop classroom.",
  },
  {
    id: "vaultsys",
    name: "Vaultsys Financial Center",
    worldX: 4914,
    width: 648,
    status: "past",
    rendererId: "vaultsys",
    camera: { zoom: 1 },
    note: "Disciplined, quiet, and deliberately the least animated place on the shore.",
  },
  {
    id: "naturetech",
    name: "NatureTech Foundry",
    worldX: 6183,
    width: 810,
    status: "active",
    rendererId: "naturetech",
    overrides: {
      // The one building that is deliberately unfinished. Dust belongs to the
      // work rather than to neglect, so it sits *on top of* the active climate
      // rather than replacing it — clear air, lights on, and a working site.
      weather: [
        { kind: "clear", intensity: 1 },
        { kind: "dust", intensity: 0.45 },
        { kind: "embers", intensity: 0.3 },
      ],
      reason: "Active construction: dust and welding sparks are the work, not weather. Layered over the active climate rather than replacing it.",
    },
    planting: { scale: 0.55 },
    note: "Current company. Half office, half construction site.",
  },
  {
    id: "bbit",
    name: "BBIT Spire",
    worldX: 7398,
    width: 540,
    status: "active",
    note: "Still studying, still building. Upright; a spire among the low roofs.",
  },
  {
    id: "workshop",
    name: "The Workshop",
    worldX: 8424,
    width: 432,
    status: "dormant",
    zones: [
      {
        id: "workshop-ai",
        // Off-centre, and small. A corner of a room, not a wing of it — if it
        // sat in the middle at half the building's width it would simply be a
        // scene with a different status, and the dust around it would read as a
        // border rather than as the room it is a corner of.
        worldX: 8530,
        width: 96,
        status: "active",
        reason:
          "The AI corner: the one bench in a dormant workshop that is still occupied. Warm and lit, bleeding into the dust around it.",
        palette: { localLight: 1.5, exposure: 1.12 },
        weather: [{ kind: "clear", intensity: 1 }],
      },
    ],
    note: "Side projects. Mostly quiet, with one bench still in use.",
  },
  {
    id: "ideastent",
    name: "The Ideas Tent",
    worldX: 9369,
    width: 378,
    status: "active",
    overrides: {
      // Ideas striking, not neglect. The lightning is the whole reading: this
      // place is *not* abandoned, it is where things arrive unannounced, and a
      // flash is the only weather that means arrival. Layered over the active
      // climate rather than replacing it, so between strikes the air is clear
      // and lit like everywhere else that is still being worked in.
      weather: [
        { kind: "clear", intensity: 1 },
        { kind: "lightning", intensity: 0.65 },
      ],
      reason: "Ideas striking, not neglect: intermittent flashes over the active climate.",
    },
    planting: { scale: 1.35 },
    note: "Where things arrive unannounced. Overgrown because it is left open, not because it is left.",
  },
  {
    id: "lighthouse",
    name: "The Lighthouse",
    worldX: 10260,
    width: 432,
    status: "active",
    rendererId: "lighthouse",
    overrides: {
      // Always lit, whatever the hour and whatever the status. A lighthouse
      // that goes out is not a lighthouse — it is the fixed point the whole
      // coast is navigated by (WORLD.md §Overview), and the one thing that
      // should look the same from every other chapter. The floor is enforced in
      // `Lighthouse.applyLighting`; this is the palette half of the same fact.
      palette: { localLight: 1.6, exposure: 1.08 },
      reason: "Always lit: the fixed point the coast is read against, at every hour and under every status.",
    },
    note: "The end of the journey, and the one thing visible from all of it.",
  },
];

/**
 * Open shore kept past the last scene, in world pixels.
 *
 * The world has to end *after* the lighthouse rather than at it. A building
 * hard against the eastern edge reads as the world running out; a stretch of
 * empty beach past it reads as arriving somewhere.
 */
export const WORLD_MARGIN = 324;

/**
 * How wide the world is, derived from the scenes rather than declared.
 *
 * The last chapter plus its own ground plus a margin. Adding an eleventh scene
 * lengthens the coast; it does not squeeze the ten already on it.
 */
export function worldWidthFor(scenes: readonly SceneConfig[] = SCENES): number {
  let east = 0;
  for (const scene of scenes) east = Math.max(east, scene.worldX + scene.width / 2);
  return Math.round(east + WORLD_MARGIN);
}

/** Ground each scene keeps clear, in world pixels. What `Ground` reserves. */
export function scenePlots(
  scenes: readonly SceneConfig[] = SCENES
): { name: string; from: number; to: number; note: string }[] {
  return scenes.map((scene) => ({
    name: scene.id,
    from: scene.worldX - scene.width / 2,
    to: scene.worldX + scene.width / 2,
    note: scene.note ?? "",
  }));
}

function mergePalette(base: PaletteDelta, over: Partial<PaletteDelta> | undefined): PaletteDelta {
  if (!over) return base;
  return { ...base, ...over };
}

/**
 * Fill in everything a scene left unsaid.
 *
 * The status supplies the climate; the scene's own `overrides` are laid over
 * the top, field by field for the palette and wholesale for the weather stack.
 * Everything downstream reads the resolved form, so no system has to know that
 * defaults exist.
 */
export function resolveScene(scene: SceneConfig): ResolvedScene {
  const climate = STATUS_CLIMATE[scene.status] ?? {
    weather: [],
    palette: NEUTRAL_PALETTE,
  };

  return {
    id: scene.id,
    name: scene.name,
    worldX: scene.worldX,
    width: scene.width,
    status: scene.status,
    rendererId: scene.rendererId,
    weather: scene.overrides?.weather ?? climate.weather,
    palette: mergePalette(climate.palette, scene.overrides?.palette),
    camera: { ...DEFAULT_SCENE_CAMERA, ...scene.camera },
    planting: scene.planting ?? {},
    overridden: Boolean(scene.overrides),
    zones: (scene.zones ?? []).map(resolveZone),
  };
}

/** A zone's status, resolved into a climate, exactly as a scene's is. */
function resolveZone(zone: SceneZone): ResolvedZone {
  const climate = STATUS_CLIMATE[zone.status] ?? {
    weather: [],
    palette: NEUTRAL_PALETTE,
  };

  return {
    id: zone.id,
    worldX: zone.worldX,
    width: zone.width,
    status: zone.status,
    reason: zone.reason,
    weather: zone.weather ?? climate.weather,
    palette: mergePalette(climate.palette, zone.palette),
  };
}

/** Every scene, resolved, west to east. Computed once. */
export const RESOLVED_SCENES: readonly ResolvedScene[] = SCENES.map(resolveScene);

/** Find a scene by id. */
export function sceneById(id: string): ResolvedScene | undefined {
  return RESOLVED_SCENES.find((s) => s.id === id);
}
