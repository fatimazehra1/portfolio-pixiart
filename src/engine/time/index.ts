/**
 * The Time system — the world clock.
 *
 * `TimeSystem` is the clock and knows nothing about anything; `TimeManager`
 * connects it to the browser and the development shortcuts. Any system that
 * needs to know what time it is should subscribe rather than keep its own.
 * Import from "@/engine/time".
 */
export { TimeSystem } from "./TimeSystem";
export { TimeManager } from "./TimeManager";
export {
  PHASE_SPANS,
  PHASE_ORDER,
  TIME_SETTINGS,
  TIME_KEYS,
  SCRUB_STEP,
  SCRUB_FAST,
  PHASE_TO_TIME_OF_DAY,
} from "./TimeConfig";
export type { TimeSettings, TimeKeyBindings } from "./TimeConfig";
export type { TimeManagerOptions } from "./TimeManager";
export type { PhaseSpan, TimeListener, TimePhase, TimeSnapshot } from "./TimeTypes";
