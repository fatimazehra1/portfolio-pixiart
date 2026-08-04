import { Container, Sprite, Texture } from "pixi.js";
import {
  GLYPH_HEIGHT,
  GLYPH_TRACKING,
  GLYPH_WIDTH,
  Pixels,
  measureText,
  plotText,
} from "./BuildingRenderer";

/**
 * The interact key, by `KeyboardEvent.code`, and how it is written on the
 * prompt. One place, so rebinding is one edit rather than a search.
 */
export const INTERACT_KEY = "KeyE";
export const INTERACT_LABEL = "E";

/** How the prompt looks and behaves. */
export const PROMPT = {
  /** Padding inside the panel, in pixels. */
  padding: 3,
  /** Gap between the icon and the name. */
  iconGap: 2,
  /** Gap above and below the divider rule. */
  rule: 2,
  /** How far the panel floats above the top of the building. */
  lift: 8,
  /** Travel of the float, in whole pixels, and how fast it breathes. */
  floatAmount: 2,
  floatRate: 1.6,
  /** How hard the fade chases its target. Exponential, so it is frame-rate free. */
  fadeRate: 9,
  /** The tail pointing down at whatever is being offered. */
  tailHeight: 3,
} as const;

/**
 * Prompt colours.
 *
 * Deliberately *not* lit by the world. Everything else on this shore answers to
 * the ambient, but an affordance that goes navy at midnight is an affordance
 * nobody can read — this has to be equally legible at noon and under the moon.
 * Parchment and brass with a hard pixel border, no rounded corners
 * (ART_DIRECTION.md §Dialogue UI).
 */
export const PROMPT_COLORS = {
  panel: 0xf2e4c4,
  border: 0x3b2f26,
  ink: 0x3b2f26,
  accent: 0xb07a2e,
} as const;

export interface InteractionZoneOptions {
  /** Where the offer is, in world CSS pixels. */
  x: number;
  y: number;
  /** How close you have to be, in world CSS pixels. */
  radius: number;
  /** What the prompt calls it. */
  label: string;
  /** A 7×7 `.`/`#` bitmap shown beside the name. */
  icon?: readonly string[];
  /** What pressing the key does. */
  onInteract: () => void;
}

/**
 * A circle of ground that offers something.
 *
 * Pure geometry and a callback — no display objects, no input listener, no
 * knowledge of what is drawing it. A building owns one of these; the manager
 * decides which one is nearest and draws the single shared prompt at it. That
 * separation is why a hundred buildings cost one prompt rather than a hundred.
 */
export class InteractionZone {
  readonly label: string;
  readonly icon: readonly string[] | undefined;

  private readonly onInteract: () => void;

  private xValue: number;
  private yValue: number;
  private radiusValue: number;

  constructor(options: InteractionZoneOptions) {
    this.xValue = options.x;
    this.yValue = options.y;
    this.radiusValue = options.radius;
    this.label = options.label;
    this.icon = options.icon;
    this.onInteract = options.onInteract;
  }

  // --- Queries ---------------------------------------------------------------

  get x(): number {
    return this.xValue;
  }

  get y(): number {
    return this.yValue;
  }

  get radius(): number {
    return this.radiusValue;
  }

  /**
   * Whether a point is close enough, and by how much.
   *
   * Squared throughout: nothing here needs the actual distance, and comparing
   * squares saves a square root per building per frame for a number that would
   * be thrown away.
   */
  distanceSquared(x: number, y: number): number {
    const dx = x - this.xValue;
    const dy = y - this.yValue;
    return dx * dx + dy * dy;
  }

  contains(x: number, y: number): boolean {
    return this.distanceSquared(x, y) <= this.radiusValue * this.radiusValue;
  }

  // --- Commands --------------------------------------------------------------

  moveTo(x: number, y: number): void {
    this.xValue = x;
    this.yValue = y;
  }

  setRadius(radius: number): void {
    this.radiusValue = radius;
  }

  /** Take the offer. */
  trigger(): void {
    this.onInteract();
  }
}

// --- The prompt --------------------------------------------------------------

/** The three tinted masks one label bakes into, plus its size. */
interface PromptArt {
  panel: Texture;
  border: Texture;
  ink: Texture;
  accent: Texture;
  width: number;
  height: number;
}

/** The default marker: a small plaque, for a zone that brings no icon. */
const DEFAULT_ICON: readonly string[] = [
  "..###..",
  ".#####.",
  "#######",
  "#.#.#.#",
  "#######",
  "#.....#",
  "#######",
];

/**
 * The floating "press E" panel.
 *
 * # One of them, forever
 * There is a single instance for the whole world, re-pointed at whichever zone
 * is nearest. Its artwork is baked once per *label* and cached, so walking up to
 * the same building for the hundredth time swaps a texture and allocates
 * nothing. Nothing in `update` creates an object — the float is an integer
 * assignment and the fade is one multiply.
 *
 * # Where it lives
 * In world space, above the building it belongs to, inside the same container
 * the camera offsets. So it follows the camera for free and is exactly as
 * pixel-perfect as everything else, rather than being a DOM element chasing a
 * world position a frame late.
 *
 * This is a world-space marker, not UI. CLAUDE.md keeps Pixi out of the
 * interface and React out of the world — a label pinned to a building's roof is
 * on the world side of that line. The panels and dialogue it will eventually
 * open are not, and are not built here.
 */
export class InteractionPrompt {
  readonly container = new Container();

  private readonly panel = new Sprite();
  private readonly border = new Sprite();
  private readonly ink = new Sprite();
  private readonly accent = new Sprite();

  /** Baked artwork, by label. Shared across every showing of that label. */
  private readonly cache = new Map<string, PromptArt>();

  private zone: InteractionZone | null = null;
  private art: PromptArt | null = null;

  /** Where the panel wants to sit, in world pixels. */
  private anchorX = 0;
  private anchorY = 0;

  private opacity = 0;
  private target = 0;
  private elapsed = 0;
  private onScreen = true;

  constructor(private readonly motionScale = 1) {
    this.container.label = "interaction-prompt";
    this.container.eventMode = "none";
    this.container.visible = false;

    for (const sprite of [this.panel, this.border, this.ink, this.accent]) {
      sprite.eventMode = "none";
      // Anchored bottom-centre: the panel hangs above a point rather than
      // starting at one, so it stays centred however long the name is.
      sprite.anchor.set(0.5, 1);
      this.container.addChild(sprite);
    }

    this.panel.tint = PROMPT_COLORS.panel;
    this.border.tint = PROMPT_COLORS.border;
    this.ink.tint = PROMPT_COLORS.ink;
    this.accent.tint = PROMPT_COLORS.accent;
  }

  // --- Queries ---------------------------------------------------------------

  /** The zone currently being offered, if any. */
  get current(): InteractionZone | null {
    return this.zone;
  }

  get visible(): boolean {
    return this.container.visible;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Offer a zone. Passing the one already showing is free.
   *
   * `anchorX` and `anchorY` are where the panel's tail should point, in the
   * pixel grid of whatever container this is mounted in.
   */
  show(zone: InteractionZone, anchorX: number, anchorY: number): void {
    this.anchorX = anchorX;
    this.anchorY = anchorY;
    this.target = 1;

    if (this.zone === zone) return;
    this.zone = zone;

    const art = this.artFor(zone);
    this.art = art;

    this.panel.texture = art.panel;
    this.border.texture = art.border;
    this.ink.texture = art.ink;
    this.accent.texture = art.accent;

    this.container.visible = true;
  }

  /** Withdraw the offer. The panel fades rather than vanishing. */
  hide(): void {
    this.target = 0;
  }

  /**
   * Whether the panel is anywhere near the view.
   *
   * Cheaper than letting Pixi discover a fully transparent sprite is off screen,
   * and it means a prompt left behind at the far end of the world costs nothing
   * at all.
   */
  setOnScreen(onScreen: boolean): void {
    this.onScreen = onScreen;
  }

  /** Advance the fade and the float. `delta` is in seconds. */
  update(delta: number): void {
    if (this.target === 0 && this.opacity === 0) {
      if (this.container.visible) {
        this.container.visible = false;
        this.zone = null;
      }
      return;
    }

    // Exponential, in seconds — identical at 30 FPS and 144.
    const step = 1 - Math.exp(-PROMPT.fadeRate * delta);
    this.opacity += (this.target - this.opacity) * step;
    if (Math.abs(this.target - this.opacity) < 0.002) this.opacity = this.target;

    this.elapsed += delta * this.motionScale;

    this.container.alpha = this.opacity;
    this.container.visible = this.onScreen && this.opacity > 0;
    this.container.x = this.anchorX;
    // Whole pixels only. A panel drifting on fractions is a blurred panel.
    this.container.y =
      this.anchorY -
      Math.round(Math.sin(this.elapsed * PROMPT.floatRate) * PROMPT.floatAmount);
  }

  destroy(): void {
    for (const art of this.cache.values()) {
      art.panel.destroy(true);
      art.border.destroy(true);
      art.ink.destroy(true);
      art.accent.destroy(true);
    }
    this.cache.clear();
    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  private artFor(zone: InteractionZone): PromptArt {
    const cached = this.cache.get(zone.label);
    if (cached) return cached;

    const art = bakePrompt(zone.label, zone.icon ?? DEFAULT_ICON);
    this.cache.set(zone.label, art);
    return art;
  }
}

/**
 * Bake one label into its four masks.
 *
 * Laid out the way a sign is: a marker and a name across the top, a rule, and
 * the instruction under it. The key itself is in brass so the eye lands on the
 * one part that is asking for something.
 */
function bakePrompt(label: string, icon: readonly string[]): PromptArt {
  const iconWidth = icon.length > 0 ? icon[0].length : 0;
  const iconHeight = icon.length;

  const call = `PRESS ${INTERACT_LABEL}`;
  const titleWidth = iconWidth + PROMPT.iconGap + measureText(label);
  const callWidth = measureText(call);

  const inner = Math.max(titleWidth, callWidth);
  const width = inner + PROMPT.padding * 2;
  const body = PROMPT.padding * 2 + GLYPH_HEIGHT + PROMPT.rule * 2 + 1 + GLYPH_HEIGHT;
  const height = body + PROMPT.tailHeight;

  const panel = new Pixels(width, height);
  const border = new Pixels(width, height);
  const ink = new Pixels(width, height);
  const accent = new Pixels(width, height);

  // The panel, with a hard border and no rounded corners.
  panel.rect(1, 1, width - 2, body - 2);
  border.frame(0, 0, width, body);

  // The tail, pointing down at whatever this is about.
  for (let i = 0; i < PROMPT.tailHeight; i++) {
    const y = body + i;
    const half = PROMPT.tailHeight - i;
    const cx = width >> 1;
    panel.hLine(y, cx - half, cx + half - 1);
    border.set(cx - half - 1, y);
    border.set(cx + half, y);
  }
  border.hLine(body + PROMPT.tailHeight - 1, (width >> 1) - 1, width >> 1);
  // The panel's own floor, broken where the tail leaves it.
  for (let x = 1; x < width - 1; x++) {
    const cx = width >> 1;
    if (x >= cx - PROMPT.tailHeight && x < cx + PROMPT.tailHeight) continue;
    border.set(x, body - 1);
  }

  // Title row: marker, then the name.
  const titleY = PROMPT.padding;
  const titleX = PROMPT.padding + ((inner - titleWidth) >> 1);
  accent.stamp(titleX, titleY + ((GLYPH_HEIGHT - iconHeight) >> 1), icon);
  plotText(ink, titleX + iconWidth + PROMPT.iconGap, titleY, label);

  // The rule between name and instruction.
  const ruleY = titleY + GLYPH_HEIGHT + PROMPT.rule;
  border.hLine(ruleY, PROMPT.padding, width - PROMPT.padding - 1, 120);

  // Instruction row, with the key itself in brass.
  const callY = ruleY + 1 + PROMPT.rule;
  const callX = PROMPT.padding + ((inner - callWidth) >> 1);
  plotText(ink, callX, callY, "PRESS ");
  // The *advance* to the seventh glyph cell, not the ink width of the six
  // before it — `measureText` trims the trailing gap, which is right for
  // centring and one pixel short for continuing a line.
  plotText(accent, callX + "PRESS ".length * (GLYPH_WIDTH + GLYPH_TRACKING), callY, INTERACT_LABEL);

  return {
    panel: panel.bake(),
    border: border.bake(),
    ink: ink.bake(),
    accent: accent.bake(),
    width,
    height,
  };
}
