/**
 * Deterministic pseudo-randomness for the ground.
 *
 * Re-exported from `@/engine/shared` — the implementation is shared by every
 * system in the engine and lives in one place. This file remains so that
 * everything inside ground/ keeps importing its randomness from next door.
 */
export { createRandom, range, rangeInt } from "../shared/random";
