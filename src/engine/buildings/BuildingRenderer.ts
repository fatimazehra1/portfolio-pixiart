import { Container, Sprite, Texture } from "pixi.js";
import { maskToTexture as bakeMask } from "../shared";
import { applyAmbient, LIGHTING_SETTINGS } from "../lighting";
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

// --- Hotspots ----------------------------------------------------------------

/**
 * A part of a building worth pointing at, in bitmap pixels.
 *
 * The bridge between the art and the plaque. A renderer knows that rows 47 to
 * 76 of its facade are the floor the rider dashboard was built on, because it
 * drew them there and the constant is still called `F4`; the plaque knows there
 * is a section headed "Domino's rider dashboard". Declaring the rectangle from
 * inside `plot`, where that constant is in scope, is what stops the two drifting
 * apart — the same argument `setDoorway` makes.
 *
 * # Why only a few
 * Every window is not a hotspot. A facade where everything is clickable is a
 * facade where nothing is worth clicking, and the visitor learns to stop
 * trying. Three to five, on the parts that have something written about them.
 *
 * # Coordinates
 * Origin at the bitmap's top-left, like everything else a renderer plots. The
 * building scales it to the pixel grid; nothing here knows about zoom.
 */
export interface Hotspot {
  /** Unique within this building. Used for nothing but keying. */
  id: string;
  /**
   * The plaque section this opens, by its exact title.
   *
   * A string rather than an id because the sections in `data/chapters.ts` have
   * no ids, and inventing a pair of them so a click could be routed would be
   * two more things to keep in agreement. A title that matches nothing opens
   * nothing, which is a visible failure rather than a silent one.
   */
  section: string;
  /** Two or three words, shown while the pointer is on it. */
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// --- The door ----------------------------------------------------------------

/**
 * Where a building's front door is, in bitmap pixels.
 *
 * Declared by calling `setDoorway` from inside `plot`, where the numbers the
 * door was drawn with are still in scope. A door plotted at `BLOCK.x + 14` and
 * then *restated* as a constant somewhere else is a door that silently stops
 * lining up the first time the facade is retuned.
 */
export interface Doorway {
  /** Left edge of the opening. */
  x: number;
  /** Top of the opening. */
  y: number;
  width: number;
  height: number;
  /**
   * How the door opens.
   *
   * `double` parts in the middle and is right for anything with two leaves or
   * a glazed entrance bay; `single` swings from one side and is right for a
   * cottage or a tower. It changes nothing but where the gap grows from.
   */
  swing?: "double" | "single";
  /** What is behind the door. Defaults to a dark hallway. */
  interior?: number;
  /** The light spilling out of it once it is open. */
  glow?: number;
}

/** How many steps there are between shut and wide open. */
const DOOR_FRAMES = 5;

/** The two layers every door is made of, in draw order. */
const DOOR_DARK = "__doorDark";
const DOOR_GLOW = "__doorGlow";

const DOOR_INTERIOR = 0x1b1712;
const DOOR_GLOW_COLOR = 0xffd9a0;

/**
 * The base every building's artwork extends.
 *
 * Subclasses declare their materials, plot into named layers, and say what moves.
 * Everything else — baking, draw order, tinting, the day/night response and
 * teardown — happens here once for every building that will ever exist.
 *
 * # The door
 * One implementation for every building, because a door opening is the same
 * event everywhere: a gap that grows and light that comes out of it. A
 * renderer says where its door is (`setDoorway`) and this bakes the frames and
 * answers `setDoor`. A building with no door says nothing and gets nothing,
 * which is the correct amount of door for a tent.
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
  /** Where the front door is, once `plot` has said. See `setDoorway`. */
  private doorway: Doorway | null = null;
  /** The parts worth pointing at, once `plot` has said. See `setHotspots`. */
  private hotspotList: readonly Hotspot[] = [];
  /** The frame currently shown, so a door that has not moved costs nothing. */
  private doorFrame = -1;
  /** How far the visitor has committed to entering. See `setApproach`. */
  private approachValue = 0;
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
   * The layers actually drawn, back to front: the building's own, then its
   * door over the top of them.
   *
   * The door has to be in front of the facade it is cut into, and a renderer
   * that had to remember to list two layers it did not write is a renderer
   * that will forget.
   */
  private get drawOrder(): readonly string[] {
    return this.doorway ? [...this.order, DOOR_DARK, DOOR_GLOW] : this.order;
  }

  /** A layer's material, including the two the door brought with it. */
  private materialFor(name: string): LayerMaterial | undefined {
    if (name === DOOR_DARK) return { color: this.doorway?.interior ?? DOOR_INTERIOR };
    if (name === DOOR_GLOW) {
      return {
        color: this.doorway?.glow ?? DOOR_GLOW_COLOR,
        emissive: true,
        // Visible by day too. A door opening at noon still shows a hallway
        // that is darker than the wall around it and a little warm light in
        // it, and a door that only worked after dark would read as broken for
        // most of the loop.
        dayAlpha: 0.45,
        nightAlpha: 1,
      };
    }
    return this.materials[name];
  }

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
    // After `plot`, because that is when a renderer has said where its door
    // is; before baking, because the frames have to be in `layers` for the
    // loop below to find them.
    this.bakeDoorFrames();

    for (const name of this.drawOrder) {
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
   * How far the visitor has committed to coming in, 0 to 1.
   *
   * Distinct from `setDoor` on purpose. A door answers the *pointer*, which is
   * a question; this answers the *click*, which is an answer. Most buildings
   * do nothing with it. The lighthouse starts its beam turning, which is the
   * one thing on this map that should happen before you arrive rather than
   * after (`LighthouseRenderer`).
   */
  setApproach(value: number): void {
    this.approachValue = value < 0 ? 0 : value > 1 ? 1 : value;
  }

  /**
   * Open the front door, 0 shut and 1 wide.
   *
   * The map calls this with a fraction while the pointer is on a building, and
   * with 1 while the camera is flying into it. Buildings with no doorway
   * ignore it, so a caller never has to ask whether this one has a door.
   *
   * Quantised to the baked frames: a door is a handful of drawn states, not a
   * continuous transform, because sliding a sprite to open it would take the
   * gap off the pixel grid the wall around it is on.
   */
  setDoor(open: number): void {
    if (!this.doorway) return;

    const clamped = open < 0 ? 0 : open > 1 ? 1 : open;
    const frame = Math.round(clamped * (DOOR_FRAMES - 1));
    if (frame === this.doorFrame) return;
    this.doorFrame = frame;

    this.setFrame(DOOR_DARK, frame);
    this.setFrame(DOOR_GLOW, frame);
    // The light comes up with the gap rather than switching on with it. A
    // hallway two pixels wide does not throw as much light as an open door.
    this.setEmissiveScale(DOOR_GLOW, frame === 0 ? 0 : clamped);
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

  /**
   * Declare where the front door is. Call from `plot`, at the point the door
   * is drawn, so the two cannot disagree.
   */
  protected setDoorway(doorway: Doorway): void {
    this.doorway = doorway;
  }

  /**
   * Declare the parts of this building worth pointing at. See `Hotspot`.
   *
   * Call from `plot`, for the same reason `setDoorway` is called from there:
   * the rectangles are the ones the artwork was drawn with, and a hotspot
   * restated as its own constant is a hotspot that silently stops lining up.
   */
  protected setHotspots(spots: readonly Hotspot[]): void {
    this.hotspotList = spots;
  }

  /** What this building offers to be clicked on. Empty for most. */
  get hotspots(): readonly Hotspot[] {
    return this.hotspotList;
  }

  /**
   * Bake the door's frames: a gap that grows, and light coming out of it.
   *
   * Frame 0 is empty, which is what shut looks like — the facade already has a
   * door painted on it, and opening one means covering that paint with a
   * hallway rather than removing anything. The last frame is the full opening.
   *
   * The glow is not a lamp. It is the two or three rows where the floor inside
   * catches the light, plus a thin wash up the opening, which is all a doorway
   * at this scale can honestly show.
   */
  private bakeDoorFrames(): void {
    const door = this.doorway;
    if (!door) return;

    const { x, y, width, height } = door;
    const single = door.swing === "single";

    for (let frame = 0; frame < DOOR_FRAMES; frame++) {
      const dark = this.pixels(DOOR_DARK, frame);
      const glow = this.pixels(DOOR_GLOW, frame);
      if (frame === 0) continue;

      const open = frame / (DOOR_FRAMES - 1);
      // A leaf never swings the whole width away: even wide open, some of the
      // frame is still standing there.
      const span = Math.max(1, Math.round(width * 0.86 * open));
      const left = single ? x : x + ((width - span) >> 1);

      dark.rect(left, y, span, height);

      // Light on the floor of the opening, brightest at the threshold.
      const pool = Math.max(1, Math.round(height * 0.18));
      glow.rect(left, y + height - pool, span, pool);
      // And a thin edge up the side the light is coming past.
      glow.vLine(single ? left + span - 1 : left, y + Math.round(height * 0.3), y + height - 1);
    }
  }

  /** How lit the world's local lights are, 0–1. Windows and signs read this. */
  protected get localLight(): number {
    return this.lighting?.localLightMultiplier ?? 0;
  }

  /** How far the visitor has committed to entering, 0 to 1. See `setApproach`. */
  protected get approach(): number {
    return this.approachValue;
  }

  // --- Internal --------------------------------------------------------------

  /** Tint and fade one layer for the current hour. */
  private light(name: string): void {
    const sprite = this.sprites.get(name);
    const material = this.materialFor(name);
    if (!sprite || !material) return;

    if (material.emissive) {
      const day = material.dayAlpha ?? 0;
      const night = material.nightAlpha ?? 1;
      const local = this.lighting?.localLightMultiplier ?? 0;
      // Alpha fades the window in as the hour turns; the gain is what makes it
      // *burn* once it is fully in. Without it a lit window at midnight is
      // exactly as bright as one at dusk, and the town never switches on.
      sprite.tint = brighten(material.color, LIGHTING_SETTINGS.emissiveNightGain * local);
      sprite.alpha = (day + (night - day) * local) * (this.scales.get(name) ?? 1);
      return;
    }

    const lit = this.lighting ? applyAmbient(material.color, this.lighting) : material.color;
    sprite.tint = this.ground ? mix(lit, this.ground.color, this.ground.amount) : lit;
  }
}

/** Push a colour towards white by `amount`, 0–1. */
function brighten(color: number, amount: number): number {
  if (amount <= 0) return color;
  const ch = (shift: number) => {
    const v = (color >> shift) & 0xff;
    return Math.round(v + (255 - v) * amount);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
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
