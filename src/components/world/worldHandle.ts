import type { World } from "@/engine";

/**
 * The one live `World`, for the React interface to reach.
 *
 * # Why a module singleton and not context or store
 * There is exactly one world, it is created imperatively inside an effect, and
 * the interface needs to *call methods on it* rather than render from it.
 * Context would mean a provider re-rendering the whole overlay every time the
 * instance changed identity; the Zustand store would mean putting a Pixi object
 * graph into React state, which is the thing the store's own doc comment warns
 * against.
 *
 * What the interface actually needs is a stable pointer and a "it exists now"
 * signal, which is all this is.
 *
 * # The rule
 * Nothing here re-renders anything. Components that need per-frame values —
 * where a world is on screen — read them in a `requestAnimationFrame` loop and
 * write to DOM refs directly. A card that re-rendered on every camera move
 * would put sixty React renders a second behind a canvas that is already doing
 * the hard work.
 */

let current: World | null = null;
const listeners = new Set<(world: World | null) => void>();

/** The live world, or null before it is built and after it is torn down. */
export function getWorld(): World | null {
  return current;
}

/** Publish the live world. Called by `PixiCanvas` only. */
export function setWorld(world: World | null): void {
  if (current === world) return;
  current = world;
  for (const listener of listeners) listener(world);
}

/**
 * Be told when the world appears or disappears.
 *
 * Fires immediately with the current value, so a component mounting after the
 * world was built does not sit waiting for a change that already happened.
 */
export function subscribeWorld(listener: (world: World | null) => void): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}
