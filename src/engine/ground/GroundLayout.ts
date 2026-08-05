import { SCENES, worldWidthFor } from "../scene/SceneRegistry";
import type { GroundBand } from "./GroundConfig";

/**
 * The hand-placed composition of the shore.
 *
 * Nothing in this file is generated. Every rock, flower, log and bush sits
 * where it does because it was put there, and the gaps between them are as
 * deliberate as the clusters — that's the difference between a coastline and a
 * scatter of assets (ART_DIRECTION.md §Art Style Rules: nothing should look
 * procedurally generated; §Vegetation: everything should feel naturally placed).
 *
 * Positions are fractions of the world's width, so the composition holds its
 * shape at any viewport size while props keep their pixel dimensions.
 */

/**
 * Ground left deliberately empty for a building.
 *
 * A plot reserves the *back* of the land — the wet sand, the dry sand and the
 * back verge — because a building stands on the back verge and rises up over
 * everything behind it. Anything placed there would simply be swallowed.
 *
 * The bands in front of the path are not reserved: foreground vegetation
 * standing between the viewer and a building is exactly what gives a side view
 * its depth (WORLD.md §Background Layers), so props there are welcome.
 *
 * # All ten, laid out at once
 * Every location in WORLD.md has ground here, in the order the journey visits
 * them, and the run was set out as a whole rather than a plot at a time. The
 * first four were placed one by one as their buildings were built, and by the
 * fifth there was nothing left but slivers — each new landmark was shaving its
 * neighbour's ground, which is exactly how a coastline turns into a terrace.
 *
 * Every plot is sized to the building that will stand on it plus room to walk
 * round it, and the gaps between them are all about the same: roughly 540
 * pixels of open shore, which at any viewport is long enough that you leave one
 * chapter before you arrive at the next. Those gaps are the reason the world
 * reads as a coast rather than a street, so they are as deliberate as the plots.
 */
export interface PlotArea {
  /** Matches the location names in WORLD.md, so buildings can find their ground. */
  name: string;
  from: number;
  to: number;
  note: string;
}

/**
 * Where the ground is kept clear, derived from the scene registry.
 *
 * This list used to be authored here, in fractions of the world's width, and it
 * was the second place the world's composition was written down — the scenes
 * said where the chapters are and this said where their ground is, and keeping
 * two lists of the same ten places in step is a job nobody was doing. Now the
 * scenes are the only statement of it, and the plots fall out.
 *
 * Still fractions, because everything reading a plot expects fractions and the
 * conversion has exactly one correct place to happen. The *scenes* are in
 * absolute pixels; the division below is the whole of the difference.
 */
export const BUILDING_PLOTS: readonly PlotArea[] = (() => {
  const width = worldWidthFor(SCENES);
  return SCENES.map((scene) => ({
    name: scene.id,
    from: (scene.worldX - scene.width / 2) / width,
    to: (scene.worldX + scene.width / 2) / width,
    note: scene.note ?? "",
  }));
})();

/** Bands a plot keeps clear. Anything nearer the viewer stays free to plant. */
export const PLOT_RESERVED_BANDS: readonly GroundBand[] = ["wetSand", "sand", "backVerge"];

export type PropKind = "rock" | "flower" | "driftwood" | "bush";

export interface PropPlacement {
  /** Position across the world, 0–1. */
  x: number;
  band: GroundBand;
  kind: PropKind;
  /** Which drawing of that prop to use. */
  variant: number;
  /** Nudge up or down in ground pixels, so a cluster never lines up. */
  dy?: number;
  /** Mirror it. Exact at nearest-neighbour, and doubles the apparent variety. */
  flip?: boolean;
}

/**
 * Every prop on the shore, read left to right.
 *
 * Grouped by stretch rather than by kind, because that's how it was composed —
 * each cluster is a small scene, and the plots between them are meant to feel
 * like clearings someone left room in, not like holes.
 */
export const PROP_PLACEMENTS: readonly PropPlacement[] = [
  // --- West edge, before the dock: driftwood washed up, a little worn ---------
  { x: 0.005, band: "sand", kind: "driftwood", variant: 0 },
  { x: 0.012, band: "wetSand", kind: "rock", variant: 2, dy: 1 },
  { x: 0.022, band: "sand", kind: "rock", variant: 0 },
  { x: 0.018, band: "frontVerge", kind: "bush", variant: 1 },
  { x: 0.036, band: "frontVerge", kind: "flower", variant: 0 },
  { x: 0.042, band: "frontVerge", kind: "flower", variant: 2, dy: -1 },
  { x: 0.058, band: "foreground", kind: "bush", variant: 0, flip: true },
  { x: 0.095, band: "frontVerge", kind: "rock", variant: 1 },
  { x: 0.104, band: "frontVerge", kind: "flower", variant: 1 },
  { x: 0.138, band: "foreground", kind: "bush", variant: 2 },
  { x: 0.152, band: "frontVerge", kind: "flower", variant: 0, flip: true },

  // --- Between the dock and the campus: the busiest stretch of shore ---------
  { x: 0.178, band: "wetSand", kind: "driftwood", variant: 1, dy: 1 },
  { x: 0.186, band: "sand", kind: "rock", variant: 1 },
  { x: 0.193, band: "sand", kind: "rock", variant: 2, dy: 1, flip: true },
  { x: 0.205, band: "sand", kind: "driftwood", variant: 0, flip: true },
  { x: 0.199, band: "backVerge", kind: "bush", variant: 0 },
  { x: 0.214, band: "backVerge", kind: "flower", variant: 2 },
  { x: 0.221, band: "backVerge", kind: "flower", variant: 0, dy: -1 },
  { x: 0.236, band: "backVerge", kind: "bush", variant: 2, flip: true },
  { x: 0.248, band: "backVerge", kind: "rock", variant: 0 },
  { x: 0.209, band: "frontVerge", kind: "bush", variant: 1 },
  { x: 0.228, band: "frontVerge", kind: "flower", variant: 1 },
  { x: 0.244, band: "foreground", kind: "bush", variant: 0 },

  // --- In front of the campus: foreground planting only ---------------------
  { x: 0.284, band: "frontVerge", kind: "flower", variant: 0 },
  { x: 0.291, band: "frontVerge", kind: "flower", variant: 1, dy: -1 },
  { x: 0.318, band: "foreground", kind: "bush", variant: 2, flip: true },
  { x: 0.352, band: "frontVerge", kind: "rock", variant: 2 },
  { x: 0.389, band: "foreground", kind: "bush", variant: 1 },
  { x: 0.404, band: "frontVerge", kind: "flower", variant: 2, flip: true },

  // --- The long open beach between campus and cottage ------------------------
  { x: 0.432, band: "wetSand", kind: "rock", variant: 0, dy: 1 },
  { x: 0.441, band: "wetSand", kind: "rock", variant: 2 },
  { x: 0.448, band: "sand", kind: "driftwood", variant: 1 },
  { x: 0.463, band: "sand", kind: "rock", variant: 1, flip: true },
  { x: 0.457, band: "backVerge", kind: "bush", variant: 1 },
  { x: 0.472, band: "backVerge", kind: "flower", variant: 0 },
  { x: 0.478, band: "backVerge", kind: "flower", variant: 1, dy: -1 },
  { x: 0.494, band: "backVerge", kind: "bush", variant: 0, flip: true },
  { x: 0.508, band: "backVerge", kind: "rock", variant: 1 },
  { x: 0.516, band: "backVerge", kind: "flower", variant: 2 },
  { x: 0.469, band: "frontVerge", kind: "bush", variant: 2 },
  { x: 0.487, band: "frontVerge", kind: "flower", variant: 1, flip: true },
  { x: 0.502, band: "foreground", kind: "bush", variant: 1 },
  { x: 0.523, band: "frontVerge", kind: "rock", variant: 0 },

  // --- In front of the cottage ----------------------------------------------
  { x: 0.561, band: "frontVerge", kind: "flower", variant: 2 },
  { x: 0.573, band: "foreground", kind: "bush", variant: 0, flip: true },
  { x: 0.612, band: "frontVerge", kind: "flower", variant: 0 },
  { x: 0.619, band: "frontVerge", kind: "flower", variant: 1 },
  { x: 0.648, band: "foreground", kind: "bush", variant: 2 },

  // --- The stretch before the lighthouse: rockier, wind-scoured -------------
  { x: 0.681, band: "wetSand", kind: "rock", variant: 1 },
  { x: 0.689, band: "wetSand", kind: "rock", variant: 0, dy: 1, flip: true },
  { x: 0.697, band: "sand", kind: "rock", variant: 2 },
  { x: 0.706, band: "sand", kind: "driftwood", variant: 0 },
  { x: 0.719, band: "sand", kind: "rock", variant: 0, flip: true },
  { x: 0.712, band: "backVerge", kind: "bush", variant: 2 },
  { x: 0.729, band: "backVerge", kind: "rock", variant: 1, dy: -1 },
  { x: 0.741, band: "backVerge", kind: "flower", variant: 2, flip: true },
  { x: 0.756, band: "backVerge", kind: "bush", variant: 1 },
  { x: 0.723, band: "frontVerge", kind: "flower", variant: 0 },
  { x: 0.748, band: "frontVerge", kind: "bush", variant: 0 },
  { x: 0.766, band: "foreground", kind: "bush", variant: 2, flip: true },

  // --- In front of the lighthouse, and the eastern edge of the world ---------
  { x: 0.802, band: "frontVerge", kind: "rock", variant: 2 },
  { x: 0.841, band: "foreground", kind: "bush", variant: 1 },
  { x: 0.878, band: "frontVerge", kind: "flower", variant: 1, flip: true },
  { x: 0.912, band: "frontVerge", kind: "rock", variant: 0 },
  { x: 0.951, band: "wetSand", kind: "driftwood", variant: 1 },
  { x: 0.958, band: "sand", kind: "rock", variant: 1 },
  { x: 0.963, band: "backVerge", kind: "bush", variant: 0 },
  { x: 0.976, band: "backVerge", kind: "flower", variant: 0, dy: -1 },
  { x: 0.984, band: "frontVerge", kind: "bush", variant: 2 },
  { x: 0.994, band: "foreground", kind: "bush", variant: 0, flip: true },
];

/**
 * Wooden fencing, as runs rather than individual posts.
 *
 * Fences do a job here beyond decoration: they mark where the ground has been
 * *claimed*. Each run borders a plot, so the empty stretches read as land
 * someone is keeping rather than land nobody got to yet.
 */
export interface FenceRun {
  from: number;
  to: number;
  band: GroundBand;
  note: string;
}

export const FENCE_RUNS: readonly FenceRun[] = [
  { from: 0.172, to: 0.253, band: "backVerge", note: "East side of the dock." },
  { from: 0.424, to: 0.52, band: "backVerge", note: "West side of the campus." },
  { from: 0.674, to: 0.772, band: "backVerge", note: "The climb to the lighthouse." },
  { from: 0.955, to: 1.0, band: "backVerge", note: "Runs off the eastern edge." },
];
