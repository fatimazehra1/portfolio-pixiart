import { Container, Rectangle, Sprite } from "pixi.js";
import { CAT_HEIGHT, CAT_WIDTH, createCatHighlight, createCatTextures } from "./CatFactory";
import type { CatTextures } from "./CatFactory";
import { catsForChapter } from "./CatRoster";
import type { CatSpec } from "./CatRoster";
import { applyAmbient } from "../lighting";
import type { LightingState } from "../lighting";

/**
 * The cats in one chapter world: placed, lit, wandering, and clickable.
 *
 * # Two containers, because occlusion is the whole trick
 * A cat that is simply drawn on top of a building is a sticker. One drawn
 * *before* the building and positioned at its edge is behind it, and the three
 * pixels of it that show are what "hidden" means here. So this hands out two
 * containers and the caller mounts one either side of the buildings. Nothing
 * is masked and nothing is cropped.
 *
 * # What it does not do
 * It does not know what a bucket is, does not count anything, and does not
 * decide what "found" means. It is told which cats are already found, it
 * reports clicks, and that is the entire contract. Everything about the
 * collection lives on the React side, because the collection is interface.
 */

/** How a cat reads at rest, and under the pointer. */
const HIGHLIGHT_TINT = 0xffe4a3;
const HIGHLIGHT_HOVER = 0.85;

/** Fur, at full daylight. Warm grey — it must not read as a rock or a bird. */
const FUR = 0xd8c3a0;
/** A found cat stays in the world, dimmed and out of the way. */
const FOUND_ALPHA = 0.55;

/** Eye colour, and how hard they burn. Emissive: they do not dim with the fur. */
const EYE_COLOR = 0xbff2c8;
const EYE_MAX_ALPHA = 0.95;

/**
 * Where the day ends, as ambient intensity.
 *
 * Above `WAKE_FROM` a cat is asleep; below `WAKE_TO` it is sitting up with its
 * eyes lit; between the two it is crossing over. Read off the same graded light
 * every window and lamp on the shore reads, so the cats change when the world
 * does rather than on a clock of their own.
 */
const WAKE_FROM = 0.58;
const WAKE_TO = 0.34;

/** Seconds a breath or a tail-flick frame is held. */
const FRAME_SECONDS = 1.35;

/** How long a wandering cat takes to cross its range and back, in seconds. */
const WANDER_SECONDS = 26;

/** The hop a cat does when it is clicked: how high, and for how long. */
const HOP_HEIGHT = 5;
const HOP_SECONDS = 0.45;

interface PlacedCat {
  spec: CatSpec;
  sprite: Sprite;
  eyes: Sprite;
  highlight: Sprite;
  /** Where it was placed, in art pixels, before any wander. */
  homeX: number;
  homeY: number;
  /** Its own phase, so nine cats never breathe in unison. */
  phase: number;
  found: boolean;
  /** Seconds left of the hop it does when clicked. 0 when it is not hopping. */
  hop: number;
}

/** Where a cat is measured from. The caller resolves these from the scene. */
export interface CatAnchorBox {
  /** Left edge of the subject's bitmap, in art pixels. */
  left: number;
  /** Right edge. */
  right: number;
  /** Top of it. */
  top: number;
  /** The baseline it stands on. */
  bottom: number;
}

export interface CatLayerOptions {
  /** Which chapter's cats to place. */
  chapter: string;
  /** Pass the sky's `pixelScale`, so the cats share the world's grid. */
  pixelScale: number;
  /** Which cats the visitor has already found. Found cats are not clickable. */
  found: readonly string[];
  /** 0 for `prefers-reduced-motion: reduce`: nothing breathes and nothing wanders. */
  motionScale?: number;
  /** Told when one is clicked, with where it is in this world's own pixels. */
  onCatch?: (id: string, name: string, x: number, y: number) => void;
}

export class CatLayer {
  /** Mount before the buildings. */
  readonly behind = new Container();
  /** Mount after them. */
  readonly front = new Container();

  private readonly textures: CatTextures;
  private readonly cats: PlacedCat[] = [];
  private readonly motionScale: number;
  private readonly specs: readonly CatSpec[];
  private readonly onCatch: CatLayerOptions["onCatch"];

  private pixelScaleValue: number;
  private elapsed = 0;
  /** 0 fully asleep, 1 fully awake. Driven by the graded light. */
  private awake = 0;
  private lighting: LightingState | null = null;

  constructor(options: CatLayerOptions) {
    this.motionScale = Math.max(0, options.motionScale ?? 1);
    this.pixelScaleValue = options.pixelScale;
    this.onCatch = options.onCatch;
    this.specs = catsForChapter(options.chapter);
    this.textures = createCatTextures();

    for (const container of [this.behind, this.front]) {
      container.label = "cats";
      container.eventMode = "passive";
      container.scale.set(options.pixelScale);
    }

    const highlightTexture = createCatHighlight();
    for (const spec of this.specs) {
      this.cats.push(this.place(spec, options.found.includes(spec.id), highlightTexture));
    }
  }

  /**
   * Put every cat where the scene says it goes.
   *
   * Called once the subject it is measured from actually exists and has been
   * laid out, and again on every resize, because the pixel grid can change and
   * a cat pinned to the old one would slide off its roof.
   */
  layout(box: CatAnchorBox, pixelScale: number): void {
    this.pixelScaleValue = pixelScale;
    for (const container of [this.behind, this.front]) container.scale.set(pixelScale);

    for (const cat of this.cats) {
      const at = anchorPoint(cat.spec, box);
      cat.homeX = at.x;
      cat.homeY = at.y;
      this.position(cat, 0);
    }
  }

  /** Follow the world's lighting: the fur is lit, the eyes burn on what is left. */
  applyLighting(state: LightingState): void {
    this.lighting = state;

    const lit = applyAmbient(FUR, state);
    // A hard crossfade would have every cat on the shore stand up in the same
    // frame. The band between the two thresholds is about twenty minutes of
    // world time, which is long enough to read as dusk falling.
    const span = WAKE_FROM - WAKE_TO;
    const t = span > 0 ? (WAKE_FROM - state.ambientIntensity) / span : 0;
    this.awake = t < 0 ? 0 : t > 1 ? 1 : t;

    for (const cat of this.cats) {
      cat.sprite.tint = lit;
      cat.eyes.tint = EYE_COLOR;
      cat.eyes.alpha = this.awake * EYE_MAX_ALPHA;
    }
  }

  /** One frame. `delta` is in seconds. */
  update(delta: number): void {
    this.elapsed += delta * this.motionScale;

    for (const cat of this.cats) {
      // The pose follows the light, not the clock: a cat is asleep because it
      // is daytime, which is the only reason any of them do anything.
      const asleep = this.awake < 0.5;
      const frames = asleep ? this.textures.asleep : this.textures.awake;
      const index =
        this.motionScale <= 0
          ? 0
          : Math.floor((this.elapsed + cat.phase) / FRAME_SECONDS) % frames.length;
      const texture = frames[index];
      if (cat.sprite.texture !== texture) cat.sprite.texture = texture;
      cat.eyes.visible = !asleep && this.awake > 0.02;

      if (cat.hop > 0) cat.hop = Math.max(0, cat.hop - delta);
      this.position(cat, this.wanderOffset(cat));
    }
  }

  /** Mark one found: it stays in the world, dimmed, and stops answering. */
  markFound(id: string): void {
    const cat = this.cats.find((c) => c.spec.id === id);
    if (!cat || cat.found) return;
    cat.found = true;
    cat.sprite.eventMode = "none";
    cat.sprite.cursor = "default";
    cat.sprite.alpha = FOUND_ALPHA;
    cat.highlight.alpha = 0;
  }

  destroy(): void {
    for (const texture of [...this.textures.asleep, ...this.textures.awake]) {
      texture.destroy(true);
    }
    this.textures.eyes.destroy(true);
    this.cats.length = 0;
    this.behind.destroy({ children: true });
    this.front.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  private place(spec: CatSpec, found: boolean, highlightTexture: typeof Sprite.prototype.texture) {
    const sprite = new Sprite(this.textures.asleep[0]);
    sprite.tint = FUR;
    sprite.eventMode = found ? "none" : "static";
    sprite.cursor = found ? "default" : "pointer";
    sprite.alpha = found ? FOUND_ALPHA : 1;
    // The whole box answers, not just the lit pixels: a nine-pixel target that
    // you have to hit the fur of is a target nobody hits.
    sprite.hitArea = new Rectangle(0, 0, CAT_WIDTH, CAT_HEIGHT);

    const highlight = new Sprite(highlightTexture);
    highlight.tint = HIGHLIGHT_TINT;
    highlight.alpha = 0;
    highlight.eventMode = "none";

    const eyes = new Sprite(this.textures.eyes);
    eyes.tint = EYE_COLOR;
    eyes.alpha = 0;
    eyes.visible = false;
    eyes.eventMode = "none";

    const cat: PlacedCat = {
      spec,
      sprite,
      eyes,
      highlight,
      homeX: 0,
      homeY: 0,
      // Derived from the id rather than random, so a cat breathes the same way
      // on every visit and two cats in one scene still differ.
      phase: (hash(spec.id) % 1000) / 1000 * FRAME_SECONDS * 2,
      found,
      hop: 0,
    };

    sprite.on("pointerover", (event) => {
      event.stopPropagation();
      if (!cat.found) highlight.alpha = HIGHLIGHT_HOVER;
    });
    sprite.on("pointerout", (event) => {
      event.stopPropagation();
      highlight.alpha = 0;
    });
    sprite.on("pointertap", (event) => {
      // Never let a cat's click reach the building behind it. Opening a
      // chapter's detail panel because somebody went looking for a cat is
      // exactly the confusion this feature is not allowed to cause.
      event.stopPropagation();
      if (cat.found) return;
      cat.hop = HOP_SECONDS;
      this.onCatch?.(
        cat.spec.id,
        cat.spec.name,
        (cat.sprite.x + CAT_WIDTH / 2) * this.pixelScaleValue,
        cat.sprite.y * this.pixelScaleValue
      );
    });

    const container = spec.depth === "behind" ? this.behind : this.front;
    container.addChild(highlight, sprite, eyes);
    return cat;
  }

  /** Where a wandering cat is, relative to home, in art pixels. */
  private wanderOffset(cat: PlacedCat): number {
    const range = cat.spec.wander ?? 0;
    if (range <= 0 || this.motionScale <= 0) return 0;
    const phase = ((this.elapsed + cat.phase * 4) / WANDER_SECONDS) * Math.PI * 2;
    return Math.round(Math.sin(phase) * range);
  }

  private position(cat: PlacedCat, offsetX: number): void {
    // The hop is a half-sine, so it leaves and lands on the roof it was sitting
    // on rather than snapping back to it.
    const t = cat.hop > 0 ? cat.hop / HOP_SECONDS : 0;
    const lift = Math.round(Math.sin(t * Math.PI) * HOP_HEIGHT);

    const x = cat.homeX + offsetX;
    const y = cat.homeY - lift;
    cat.sprite.position.set(x, y);
    cat.eyes.position.set(x, y);
    cat.highlight.position.set(x - 1, y - 1);
  }
}

/** Resolve a spec's anchor into art-pixel coordinates inside `box`. */
function anchorPoint(spec: CatSpec, box: CatAnchorBox): { x: number; y: number } {
  switch (spec.anchor) {
    case "topLeft":
      return { x: box.left + spec.dx, y: box.top + spec.dy };
    case "topRight":
      return { x: box.right - CAT_WIDTH + spec.dx, y: box.top + spec.dy };
    case "roof":
      return { x: (box.left + box.right) / 2 - CAT_WIDTH / 2 + spec.dx, y: box.top + spec.dy };
    case "footLeft":
      return { x: box.left + spec.dx, y: box.bottom - CAT_HEIGHT + spec.dy };
    case "footRight":
      return { x: box.right - CAT_WIDTH + spec.dx, y: box.bottom - CAT_HEIGHT + spec.dy };
  }
}

/** A small stable hash, for per-cat phase. Nothing cryptographic is wanted. */
function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}
