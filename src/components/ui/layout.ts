/**
 * Layout numbers the canvas and the interface have to agree on.
 *
 * Kept apart from any component so the canvas (which is loaded on its own,
 * client-only) can read them without importing the interface.
 */

/** The phone top bar, whose bottom edge the world strip starts at. */
export const MOBILE_TOP_BAR = "3rem";

/** Where the phone panel starts inside an island; the world gets everything above. */
export const MOBILE_WORLD_HEIGHT = "max(15rem, 42dvh)";
