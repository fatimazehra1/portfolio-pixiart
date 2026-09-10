// Public types for the Sky system. Framework-agnostic — no React, no gameplay.

/** The four authored times of day (DESIGN.md §Color Palette). */
export type TimeOfDay = "morning" | "day" | "sunset" | "night";

/** A stop in the vertical sky gradient. `t` is 0 at the top of the sky, 1 at the bottom. */
export interface GradientStop {
  t: number;
  color: number;
}

/** The three tones every cloud is painted with (top-lit, body, underside). */
export interface CloudTones {
  highlight: number;
  mid: number;
  shadow: number;
}

/** How birds read against the sky at a given time of day. */
export interface BirdTone {
  /** Silhouette colour. */
  color: number;
  /** Opacity. 0 grounds the flock entirely — see BirdFlock. */
  alpha: number;
}

/** Everything that describes the sun or the moon at a given time of day. */
export interface CelestialState {
  /** Horizontal position, 0–1 across the sky. */
  x: number;
  /** Vertical position, 0–1 down the sky. */
  y: number;
  /** Disc colour. */
  color: number;
  /** Inner detail colour — the sun's hot core, the moon's craters. */
  detailColor: number;
  /** Halo colour. */
  glowColor: number;
  /** Disc opacity. 0 hides the body entirely. */
  alpha: number;
  /** Halo opacity. */
  glowAlpha: number;
}

/**
 * The rectangle of the *frame* the sun and the moon are allowed to travel in.
 *
 * Fractions of the viewport, not of the sky, and the difference matters: a
 * zoomed chapter world drags the whole sky container upward to keep its
 * horizon on the sea's (`setHorizonShift`), which can be a hundred pixels or
 * more. A field measured in sky fractions would go up with it and put the sun
 * off the top of the screen, which is the bug this type was added to fix. The
 * system takes the shift back out.
 *
 * Fractions rather than pixels, so it survives a resize. The palette says where a body
 * is *in the sky*; this says where the sky's usable part is, and the two are
 * separate because they are owned by different people — the palette is the
 * hour, the field is the composition the hour is being drawn into.
 *
 * The hub leaves it at the identity and its sun goes wherever the hour puts
 * it. A chapter world narrows it, because a chapter world is zoomed in on a
 * building with land filling the bottom of the frame and a panel over the top
 * right, and a sun that landed in either would simply not exist as far as the
 * visitor is concerned. Narrowing rather than relocating is what keeps the two
 * views agreeing: the same hour still puts the body at the same fraction along
 * the same arc, on a shorter arc.
 */
export interface CelestialField {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** The whole sky, which is what the hub uses. */
export const FULL_CELESTIAL_FIELD: CelestialField = {
  left: 0,
  right: 1,
  top: 0,
  bottom: 1,
};

/**
 * A complete look for the sky at one time of day. Everything except `gradient`
 * and `bands` is interpolated numerically during a time transition; the gradient
 * itself cross-fades between two baked textures (see SkyGradient).
 */
export interface SkyPalette {
  /** Vertical colour ramp, top → bottom. */
  gradient: GradientStop[];
  /** How many discrete colours the ramp is quantised to before dithering. */
  bands: number;
  cloud: CloudTones;
  cloudAlpha: number;
  bird: BirdTone;
  hazeColor: number;
  hazeAlpha: number;
  sun: CelestialState;
  moon: CelestialState;
}

/** Per-layer cloud configuration. Three of these make the parallax field. */
export interface CloudLayerConfig {
  /** Debug/scene-graph label. */
  name: string;
  /** How many clouds live in this layer. */
  count: number;
  /** Cloud width in sky pixels. Distant layers use smaller sprites — never scaled. */
  cloudWidth: number;
  /** Cloud height in sky pixels. */
  cloudHeight: number;
  /** Vertical band the layer occupies, 0–1 down the sky. */
  yRange: [number, number];
  /** Drift speed in sky pixels per second. Slow: this is a calm sky. */
  speed: number;
  /** Layer opacity multiplier — distance haze. */
  alpha: number;
  /**
   * Per-cloud opacity spread within the layer, ±this much. Keeps a band from
   * reading as one flat sheet of identically-weighted clouds.
   */
  alphaJitter: number;
  /** Parallax depth, 0 = pinned to the horizon, 1 = moves fully with the camera. */
  depth: number;
  /** How many distinct cloud shapes to generate for the layer. */
  shapes: number;
}

export interface SkySystemOptions {
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
  /** Starting time of day. Defaults to "sunset" — the project's visual identity. */
  timeOfDay?: TimeOfDay;
  /**
   * Target internal height of the sky in *sky pixels*. The system picks the
   * largest integer scale that fits, so one sky pixel always maps to a whole
   * number of screen pixels (CLAUDE.md §Pixel Art Rules).
   */
  pixelHeight?: number;
  /** Where the horizon sits, 0–1 down the sky. The haze band is centred on it. */
  horizon?: number;
  /** Seed for cloud shape + placement. Same seed ⇒ same sky, every reload. */
  seed?: number;
  /**
   * Global motion multiplier. Pass 0 for `prefers-reduced-motion: reduce`:
   * drift stops and time-of-day changes become instant, the sky stays beautiful.
   */
  motionScale?: number;
}
