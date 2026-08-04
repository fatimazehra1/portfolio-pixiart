import {
  BASELINES,
  KINDS,
  PROP_KINDS,
  RESERVED_BANDS,
  type BandWeight,
  type KindConfig,
  type PropKind,
} from "./EnvironmentConfig";
import type { Prop } from "./Prop";
import type { GroundBand, PlotArea } from "../ground";
import { createRandom, range } from "../shared/random";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const TAU = Math.PI * 2;

export interface GenerateOptions {
  /** The width of the world, in world pixels. */
  worldWidth: number;
  /** The world's seed. */
  seed: number;
  /** Ground kept clear for buildings. */
  plots: readonly PlotArea[];
  /** The planting scheme. Defaults to the shore's own. */
  kinds?: Record<PropKind, KindConfig>;
}

/**
 * A low-frequency field describing how thickly a kind grows along the shore.
 *
 * Three sine waves at unrelated frequencies, seeded per kind. What comes out is
 * a gently varying number between 0 and 1 that never repeats within the length
 * of the world, and that is the entire mechanism behind copses, thickets and
 * clearings — a kind is *more likely* where its field is high, rather than
 * placed on a grid and jittered.
 *
 * This is the difference between a coastline and a scatter of assets
 * (ART_DIRECTION.md §Art Style Rules: nothing should look procedurally
 * generated). Even spacing is what gives generated worlds away, and even
 * spacing with jitter gives them away only slightly more slowly.
 */
function densityField(rand: () => number, worldWidth: number): (x: number) => number {
  const waves = [
    { cycles: range(rand, 2.5, 5.5), phase: rand() * TAU, weight: 0.5 },
    { cycles: range(rand, 9, 17), phase: rand() * TAU, weight: 0.32 },
    { cycles: range(rand, 23, 41), phase: rand() * TAU, weight: 0.18 },
  ];

  return (x: number) => {
    const t = x / Math.max(1, worldWidth);
    let sum = 0;
    for (const wave of waves) sum += Math.sin(t * TAU * wave.cycles + wave.phase) * wave.weight;
    return clamp01((sum + 1) / 2);
  };
}

/** Pick a band by weight. */
function pickBand(rand: () => number, bands: readonly BandWeight[]): GroundBand {
  let total = 0;
  for (const entry of bands) total += entry.weight;

  let roll = rand() * total;
  for (const entry of bands) {
    roll -= entry.weight;
    if (roll <= 0) return entry.band;
  }
  return bands[bands.length - 1].band;
}

/** True if this spot is inside ground a building has reserved. */
function inReservedPlot(
  x: number,
  band: GroundBand,
  worldWidth: number,
  plots: readonly PlotArea[]
): boolean {
  // Only the bands a building actually stands on are off limits. Planting
  // *between* the viewer and a building is what gives a side view its depth,
  // so the near bands stay open (GroundLayout §PlotArea).
  if (!RESERVED_BANDS.includes(band)) return false;

  const t = x / Math.max(1, worldWidth);
  for (const plot of plots) {
    if (t >= plot.from && t <= plot.to) return true;
  }
  return false;
}

/**
 * Grow the shore.
 *
 * Deterministic from end to end: the same seed, world width and scheme always
 * produce the same props in the same order, down to which way each one is
 * facing. Nothing here reads a clock, a viewport or `Math.random`.
 *
 * # How a kind is placed
 * Walk the world from west to east in steps of roughly its spacing, and at each
 * step ask three questions: does the density field want one here, is there room
 * since the last one, and is this ground spoken for? Only then does a prop
 * exist. Because the walk is a walk and not a loop over a count, a kind
 * naturally thins out where the field is low without anyone deciding how many
 * there should be.
 *
 * Returned sorted west to east, which is the order the world is read in and the
 * order the view window slides through.
 */
export function generate(options: GenerateOptions): Prop[] {
  const { worldWidth, seed, plots } = options;
  const scheme = options.kinds ?? KINDS;
  const props: Prop[] = [];

  if (worldWidth <= 0) return props;

  for (let k = 0; k < PROP_KINDS.length; k++) {
    const kind = PROP_KINDS[k];
    const config = scheme[kind];
    if (!config || config.spacing <= 0) continue;

    // Each kind gets its own stream, so retuning one kind's density cannot
    // shuffle every other kind in the world.
    const rand = createRandom(seed + k * 7919 + 13);
    const field = densityField(rand, worldWidth);

    let x = config.tile ? 0 : range(rand, 0, config.spacing);
    let lastX = Number.NEGATIVE_INFINITY;
    let lastVariant = -1;

    while (x < worldWidth) {
      const step = config.tile ? config.spacing : range(rand, 0.55, 1.6) * config.spacing;
      const here = x;
      x += step;

      // The field decides. `clustering` is how much of the decision it gets:
      // at 0 everything is accepted and the kind is spread evenly, at 1 it only
      // appears where the field is already strong.
      const density = field(here) ** 1.6;
      const chance = 1 - config.clustering + config.clustering * density;
      if (rand() >= chance) continue;

      if (here - lastX < config.minGap) continue;

      const band = pickBand(rand, config.bands);
      if (inReservedPlot(here, band, worldWidth, plots)) continue;

      // Avoid the obvious repeat: one re-roll is enough to break up runs of the
      // same drawing without flattening the weighting into a rotation.
      let variant = Math.floor(rand() * config.variants);
      if (variant === lastVariant && config.variants > 1) {
        variant = Math.floor(rand() * config.variants);
      }
      lastVariant = variant;
      lastX = here;

      const sway = config.sway;

      props.push({
        kind,
        variant,
        x: Math.round(here),
        band,
        dy: config.jitter > 0 ? Math.round(range(rand, -config.jitter, config.jitter)) : 0,
        flip: config.flip && rand() < 0.5,
        scale: config.scales[Math.floor(rand() * config.scales.length)] ?? 1,
        motion: config.motion,
        phase: rand() * TAU,
        swayRate: sway ? range(rand, sway.rate[0], sway.rate[1]) : 0,
        swayAmount: sway ? Math.round(range(rand, sway.amount[0], sway.amount[1])) : 0,
        y: 0,
      });
    }
  }

  // West to east. The window that decides what is on screen slides through this
  // array, so the order is load-bearing rather than cosmetic.
  props.sort((a, b) => a.x - b.x);
  return props;
}

/**
 * Stand every prop on its band, for a land of this height.
 *
 * Split out from `generate` on purpose: which band a prop belongs to is an
 * authored decision and never changes, but where that band *falls* depends on
 * how tall the window is. Keeping the two apart is what lets the world be
 * identical at every viewport size instead of being re-grown on every resize.
 */
export function standProps(props: readonly Prop[], groundTop: number, groundHeight: number): void {
  for (const prop of props) {
    prop.y = groundTop + Math.round(BASELINES[prop.band] * groundHeight);
  }
}

/** How many of each kind were grown. For tuning densities and for tests. */
export function countByKind(props: readonly Prop[]): Record<PropKind, number> {
  const counts = Object.fromEntries(PROP_KINDS.map((kind) => [kind, 0])) as Record<
    PropKind,
    number
  >;
  for (const prop of props) counts[prop.kind]++;
  return counts;
}
