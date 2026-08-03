/**
 * Deterministic pseudo-randomness for the sky.
 *
 * Cloud shapes and placement are generated, not authored, so they must be stable:
 * the same seed produces the same sky on every reload and on every machine. That
 * keeps the world feeling like a real place rather than a slot machine.
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

/** Random integer in [min, max]. */
export function rangeInt(rand: () => number, min: number, max: number): number {
  return Math.floor(range(rand, min, max + 1));
}
