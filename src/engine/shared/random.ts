/**
 * Deterministic pseudo-randomness, for the whole engine.
 *
 * Every generated thing in this world — cloud shapes, wave jitter, terrain
 * mottling, bush silhouettes, prop placement, the wear on a lighthouse's stone —
 * is generated from a seed rather than authored, and all of it has to be stable:
 * the same seed produces the same world on every reload and on every machine.
 *
 * # Why this is one file
 * It used to be nine. Three `random.ts` modules and six inline copies, all of
 * them the same twelve lines, each one a place where a "harmless" tweak would
 * have silently re-rolled an entire subsystem's art. They were verified
 * byte-identical before being collapsed to this.
 */

/**
 * mulberry32 — small, fast, and good enough for art.
 *
 * Returns values in [0, 1). Not cryptographic and not trying to be: what this
 * needs is to be *the same every time*, which a good PRNG and a fixed seed give
 * for free and `Math.random` never can.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random float in [min, max). */
export function range(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

/** Random integer in [min, max], inclusive at both ends. */
export function rangeInt(rand: () => number, min: number, max: number): number {
  return Math.floor(range(rand, min, max + 1));
}
