/**
 * Deterministic pseudo-randomness for the ocean.
 *
 * Wave jitter and foam breaks are generated, not authored, so they must be
 * stable: the same seed produces the same sea on every reload and on every
 * machine. Kept local so the ocean has no dependency on any other system.
 */

/** mulberry32 — small, fast, good enough for art. Returns values in [0, 1). */
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
