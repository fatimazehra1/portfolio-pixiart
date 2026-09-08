import { Container, Sprite, Texture } from "pixi.js";
import { maskToTexture as bakeMask } from "../shared";
import { applyAmbient } from "../lighting";
import type { LightingState } from "../lighting";

/**
 * The drawing plumbing every building shares.
 *
 * A building is a stack of white masks, each tinted by one material and lit by
 * the world. That is the same discipline the shore, the sea and the lighthouse
 * already use, and it is what lets a new building be written as "plot these
 * pixels into these layers" rather than as a rendering problem.
 *
 * Nothing here knows what a building *is*. It bakes, it tints, it tears down.
 */

// --- Baking ------------------------------------------------------------------

/** Bake with the buildings' name on any failure. See `@/engine/shared`. */
export function maskToTexture(width: number, height: number, mask: Uint8Array): Texture {
  return bakeMask(width, height, mask, "Buildings");
}

/**
 * A grid of pixels being plotted into.
 *
 * Thin on purpose. Buildings are architecture — rectangles, courses, rows of
 * windows — so the primitives are the ones you would reach for with a ruler,
 * and anything more expressive would just be a drawing program nobody asked for.
 */
export class Pixels {
  readonly data: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number
  ) {
    this.data = new Uint8Array(width * height);
  }

  set(x: number, y: number, alpha = 255): this {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return this;
    this.data[y * this.width + x] = alpha;
    return this;
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.data[y * this.width + x];
  }

  /** Filled rectangle, inclusive of `x`,`y` and `w`×`h` in size. */
  rect(x: number, y: number, w: number, h: number, alpha = 255): this {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) this.set(x + dx, y + dy, alpha);
    }
    return this;
  }

  /** Rectangle outline, one pixel thick. */
  frame(x: number, y: number, w: number, h: number, alpha = 255): this {
    this.hLine(y, x, x + w - 1, alpha);
    this.hLine(y + h - 1, x, x + w - 1, alpha);
    this.vLine(x, y, y + h - 1, alpha);
    this.vLine(x + w - 1, y, y + h - 1, alpha);
    return this;
  }

  hLine(y: number, x0: number, x1: number, alpha = 255): this {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, alpha);
    return this;
  }

  vLine(x: number, y0: number, y1: number, alpha = 255): this {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, alpha);
    return this;
  }

  /** Plot a `.`/`#` style bitmap with its top-left at `x`,`y`. */
  stamp(x: number, y: number, rows: readonly string[], on = "#"): this {
    for (let dy = 0; dy < rows.length; dy++) {
      for (let dx = 0; dx < rows[dy].length; dx++) {
        if (on.includes(rows[dy][dx])) this.set(x + dx, y + dy);
      }
    }
    return this;
  }

  bake(): Texture {
    return maskToTexture(this.width, this.height, this.data);
  }
}

// --- The bitmap font ---------------------------------------------------------

/**
 * A 5×7 pixel typeface, uppercase.
 *
 * Drawn rather than typeset. Pixi's text renderer would anti-alias every glyph
 * and hint it against a grid this world doesn't use, and a soft label floating
 * over hard pixels is the single most obvious way to give away that the pixel
 * art is a costume (CLAUDE.md §Pixel Art Rules). Uppercase only because a label
 * this size has no room for descenders, and because it reads as signage.
 */
const GLYPHS: Record<string, readonly string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "####.", "#...#", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "####.", "#....", "#....", "#....", "#####"],
  F: ["#####", "#....", "####.", "#....", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["...##", "....#", "....#", "....#", "#...#", "#...#", ".###."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#...#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["#..#.", "#..#.", "#..#.", "#####", "...#.", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#...#", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "#...#", ".###."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "'": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
};

export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;
/** Blank columns between letters. */
export const GLYPH_TRACKING = 1;

/** How wide a line of text will be, in pixels. */
export function measureText(text: string): number {
  const length = text.length;
  if (length === 0) return 0;
  return length * (GLYPH_WIDTH + GLYPH_TRACKING) - GLYPH_TRACKING;
}

/** Plot a line of text into a grid. Unknown characters become spaces. */
export function plotText(target: Pixels, x: number, y: number, text: string): void {
  const upper = text.toUpperCase();

  for (let i = 0; i < upper.length; i++) {
    const glyph = GLYPHS[upper[i]];
    if (!glyph) continue;
    target.stamp(x + i * (GLYPH_WIDTH + GLYPH_TRACKING), y, glyph);
  }
}

// --- The renderer base -------------------------------------------------------

/** What a layer is drawn in. Emissive layers make light instead of receiving it. */
export interface LayerMaterial {
  /** The colour, as it would look under flat daylight. */
  color: number;
  /**
   * Whether the world's ambient dims it.
   *
   * An emissive layer keeps its own colour at every hour and only its strength
   * changes — a lit window is not a darker lit window at midnight, it is the
   * brightest thing on the building.
   */
  emissive?: boolean;
  /** Alpha at full daylight, for emissive layers. Defaults to 0. */
  dayAlpha?: number;
  /** Alpha at full night, for emissive layers. Defaults to 1. */
  nightAlpha?: number;
}

/**
 * The base every building's artwork extends.
 *
 * Subclasses declare their materials, plot into named layers, and say what moves.
 * Everything else — baking, draw order, tinting, the day/night response and
 * teardown — happens here once for every building that will ever exist.
 */
export abstract class BuildingRenderer {
  /** The artwork. Positioned by the building that owns it. */
  readonly container = new Container();

  /** Each layer is one or more frames. Most have exactly one. */
  protected readonly layers = new Map<string, Pixels[]>();
  private readonly sprites = new Map<string, Sprite>();
  private readonly textures = new Map<string, Texture[]>();
  /** Per-layer multiplier on an emissive layer's alpha. See `setEmissiveScale`. */
  private readonly scales = new Map<string, number>();

  private baselineGapValue = 0;
  private lighting: LightingState | null = null;
  /** Pull every lit material a fraction of the way toward one colour. See `blendToward`. */
  private ground: { color: number; amount: number } | null = null;

  constructor(
    readonly width: number,
    readonly height: number
  ) {
    this.container.eventMode = "none";
  }

  /** Which layers exist, back to front. */
  protected abstract get order(): readonly string[];

  /** What each layer is made of. */
  protected abstract get materials(): Record<string, LayerMaterial>;

  /** Plot the artwork. Called once, from `build`. */
  protected abstract plot(): void;

  /** Advance the idle animation. `elapsed` is the world's clock in seconds. */
  abstract tick(elapsed: number): void;

  /**
   * How high above the baseline a prompt should hang, in pixels.
   *
   * Defaults to the full height of the bitmap, which is right for a building
   * whose tallest point is over its middle. Override it where it isn't — a
   * flagpole or a chimney off to one side will otherwise push the panel into
   * the sky over nothing.
   */
  get promptTop(): number {
    return this.height;
  }

  /**
   * Empty rows between the lowest pixel actually drawn and the bottom of the
   * bitmap. Zero for most buildings.
   *
   * A caller that stands a building on a surface positions the *sprite*, and
   * the sprite is anchored to the bitmap's bottom edge — which is not the same
   * row as the building's own feet whenever a renderer reserves a little slack
   * under its baseline (`const BASE = H - 2` is the common idiom here). On the
   * shore the difference is a pixel or two on ground that already has grass in
   * front of it and nobody sees it. On the hub, where a tower stands on a bare
   * isometric top face with sky behind it, the same pixel or two reads as the
   * building hovering. Add this to the surface y and the feet land on it.
   */
  get baselineGap(): number {
    return this.baselineGapValue;
  }

  // --- Commands --------------------------------------------------------------

  /** Plot, bake and mount. Call once, after construction. */
  build(): void {
    this.plot();

    for (const name of this.order) {
      const frames = this.layers.get(name);
      if (!frames || frames.length === 0) continue;

      const textures = frames.map((frame) => frame.bake());
      this.textures.set(name, textures);

      const sprite = new Sprite(textures[0]);
      sprite.eventMode = "none";
      // Anchored at the foot, so a building stands on its baseline however tall
      // it happens to be.
      sprite.anchor.set(0, 1);
      this.sprites.set(name, sprite);
      this.container.addChild(sprite);
    }

    this.measureBaseline();
    this.applyLighting(this.lighting);
  }

  /**
   * Find the lowest row anything was actually drawn on, over every layer and
   * every frame. Once, at build time — see `baselineGap`.
   */
  private measureBaseline(): void {
    for (let y = this.height - 1; y >= 0; y--) {
      for (const frames of this.layers.values()) {
        for (const frame of frames) {
          for (let x = 0; x < this.width; x++) {
            if (frame.get(x, y) === 0) continue;
            this.baselineGapValue = this.height - 1 - y;
            return;
          }
        }
      }
    }
  }

  /**
   * Light the whole building.
   *
   * Each material once — a building has a dozen of them, not a dozen per wall.
   */
  applyLighting(state: LightingState | null): void {
    this.lighting = state;
    for (const name of this.sprites.keys()) this.light(name);
  }

  /**
   * Pull every non-emissive material a fraction of the way toward `color`.
   *
   * For a building standing somewhere its own palette was never authored for —
   * the hub, where each one sits on an island with its own surface tones. A
   * building sharing no colour at all with the ground under it reads as pasted
   * onto it; a small pull toward the ground's own family is what makes the two
   * read as one object. Small, deliberately: a cast over the materials, not a
   * repaint of them. Emissive layers are left out — a lit window is its own
   * light, and the ground has no say in what colour it burns.
   */
  blendToward(color: number, amount: number): void {
    this.ground = amount > 0 ? { color, amount: Math.min(1, amount) } : null;
    this.applyLighting(this.lighting);
  }

  destroy(): void {
    for (const textures of this.textures.values()) {
      for (const texture of textures) texture.destroy(true);
    }
    this.textures.clear();
    this.sprites.clear();
    this.layers.clear();
    this.scales.clear();
    this.container.destroy({ children: true });
  }

  // --- For subclasses --------------------------------------------------------

  /**
   * The grid for a layer's frame, made on first ask.
   *
   * Layers with more than one frame are how anything on a building moves: a
   * flag, a turning vane, a shutter. Cycling baked frames keeps the motion on
   * the pixel grid, which sliding or rotating a sprite would not.
   */
  protected pixels(layer: string, frame = 0): Pixels {
    let frames = this.layers.get(layer);
    if (!frames) {
      frames = [];
      this.layers.set(layer, frames);
    }
    while (frames.length <= frame) frames.push(new Pixels(this.width, this.height));
    return frames[frame];
  }

  /** Show a layer's nth frame. Out-of-range indices wrap. */
  protected setFrame(layer: string, index: number): void {
    const textures = this.textures.get(layer);
    const sprite = this.sprites.get(layer);
    if (!textures || !sprite || textures.length === 0) return;

    const texture = textures[((index % textures.length) + textures.length) % textures.length];
    if (sprite.texture !== texture) sprite.texture = texture;
  }

  /**
   * Scale one emissive layer's brightness, on top of what the hour gives it.
   *
   * The seam idle animation uses for anything that glows: a window blinking off
   * is this at 0, a sign breathing is this wandering around 1. Kept separate
   * from the lighting so the two never overwrite each other.
   */
  protected setEmissiveScale(layer: string, scale: number): void {
    this.scales.set(layer, scale);
    this.light(layer);
  }

  /** A baked layer's sprite, for anything that needs to move one. */
  protected sprite(layer: string): Sprite | undefined {
    return this.sprites.get(layer);
  }

  /** How lit the world's local lights are, 0–1. Windows and signs read this. */
  protected get localLight(): number {
    return this.lighting?.localLightMultiplier ?? 0;
  }

  // --- Internal --------------------------------------------------------------

  /** Tint and fade one layer for the current hour. */
  private light(name: string): void {
    const sprite = this.sprites.get(name);
    const material = this.materials[name];
    if (!sprite || !material) return;

    if (material.emissive) {
      sprite.tint = material.color;
      const day = material.dayAlpha ?? 0;
      const night = material.nightAlpha ?? 1;
      const local = this.lighting?.localLightMultiplier ?? 0;
      sprite.alpha = (day + (night - day) * local) * (this.scales.get(name) ?? 1);
      return;
    }

    const lit = this.lighting ? applyAmbient(material.color, this.lighting) : material.color;
    sprite.tint = this.ground ? mix(lit, this.ground.color, this.ground.amount) : lit;
  }
}

/** Lerp two packed colours, channel by channel. */
function mix(from: number, to: number, t: number): number {
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t) & 0xff;
  return (
    (lerp((from >> 16) & 0xff, (to >> 16) & 0xff) << 16) |
    (lerp((from >> 8) & 0xff, (to >> 8) & 0xff) << 8) |
    lerp(from & 0xff, to & 0xff)
  );
}
