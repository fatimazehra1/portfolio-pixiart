import { Container, Sprite, Texture } from "pixi.js";
import { EMISSIVE, FLICKER, type PropKind, type PropMotion } from "./EnvironmentConfig";
import type { GroundBand } from "../ground";

/**
 * One placed prop, as data.
 *
 * Deliberately not a display object. There are thousands of these and only a few
 * hundred are ever on screen, so what the world holds is this — a flat record,
 * cheap to make and cheaper to keep — and sprites are handed out to the ones
 * currently in view (see `Environment`). A prop that scrolls off the edge loses
 * its sprites and keeps its identity, so it comes back exactly as it left.
 */
export interface Prop {
  kind: PropKind;
  variant: number;
  /** Position across the world, in world pixels. */
  x: number;
  /** Which band of the land it stands on. */
  band: GroundBand;
  /** Nudge off the band's baseline, so a cluster never lines up. */
  dy: number;
  /** Mirrored. Exact at nearest-neighbour, and doubles the apparent variety. */
  flip: boolean;
  /** Whole-number draw scale. See `KindConfig.scales`. */
  scale: number;
  motion: PropMotion;
  /** Where in its own cycle this prop is, so no two move together. */
  phase: number;
  swayRate: number;
  swayAmount: number;
  /**
   * Baseline in pixels down the viewport, and the draw order.
   *
   * Recomputed on resize rather than stored by the generator: the band is the
   * authored decision, and where that band happens to fall depends on how tall
   * the window is. Placement stays identical across viewport sizes.
   */
  y: number;
}

/** The three tones a shape is drawn in. White masks, tinted at runtime. */
export interface ToneTextures {
  base: Texture;
  light: Texture;
  dark: Texture;
}

/** Everything needed to draw one variant of one kind. Shared by every instance. */
export interface PropTextures {
  body: ToneTextures;
  /**
   * Drawn over the body and animated separately — a tree's canopy, so the
   * leaves move in the wind and the trunk does not.
   *
   * Baked at the same size as the body and anchored identically, so it needs no
   * offset of its own: the two masks are two halves of one drawing.
   */
  crown?: ToneTextures;
  /** A lamp's flame, in its own light rather than the world's. */
  flame?: Texture;
  /** Height above the baseline of whatever is making light, for the glow. */
  lightY?: number;
  width: number;
  height: number;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * The sprites for one prop, on loan.
 *
 * Pooled and recycled: as the camera moves, views are released by props leaving
 * the window and handed straight to props entering it, so a walk from one end of
 * the shore to the other allocates nothing after the first screenful. That is
 * the whole reason this is a class and not a closure — it has to survive being
 * unbound and rebound thousands of times without leaking a sprite.
 */
export class PropView {
  readonly container = new Container();

  private readonly base = new Sprite();
  private readonly light = new Sprite();
  private readonly dark = new Sprite();

  /** Made on first use. Most props never need them. */
  private crownBase: Sprite | null = null;
  private crownLight: Sprite | null = null;
  private crownDark: Sprite | null = null;
  private flame: Sprite | null = null;
  private glow: Sprite | null = null;

  private prop: Prop | null = null;
  private textures: PropTextures | null = null;
  /** How lit the world's local lights are, 0–1. Only lamps care. */
  private activation = 0;

  constructor() {
    this.container.eventMode = "none";
    for (const sprite of [this.base, this.dark, this.light]) {
      // Stand it on its baseline rather than hanging it from its top edge.
      sprite.anchor.set(0, 1);
      sprite.eventMode = "none";
      this.container.addChild(sprite);
    }
  }

  // --- Queries ---------------------------------------------------------------

  get bound(): Prop | null {
    return this.prop;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Take on a prop. Everything about the previous occupant is overwritten.
   *
   * Textures are swapped rather than sprites recreated, which is what makes
   * recycling cheaper than allocating.
   */
  bind(prop: Prop, textures: PropTextures, glowTexture: Texture | null): void {
    this.prop = prop;
    this.textures = textures;

    this.base.texture = textures.body.base;
    this.light.texture = textures.body.light;
    this.dark.texture = textures.body.dark;

    // Clear any sway the previous occupant left behind. A recycled view that
    // once held a tuft of grass would otherwise stand its rock a pixel off.
    this.base.x = 0;
    this.light.x = 0;
    this.dark.x = 0;

    this.bindCrown(textures);
    this.bindFlame(textures, glowTexture);

    // Mirroring flips about the sprite's own left edge, so the prop has to be
    // pushed back over by its width or it would jump sideways when flipped.
    const flip = prop.flip ? -1 : 1;
    this.container.scale.set(prop.scale * flip, prop.scale);
    this.container.position.set(
      prop.x + (prop.flip ? textures.width * prop.scale : 0),
      prop.y + prop.dy
    );
    // Depth: nearer things cover further ones, and the sort is stable on x.
    this.container.zIndex = prop.y + prop.dy;
    this.container.visible = true;
  }

  /** Hand the sprites back. The view stays alive, ready for the next prop. */
  release(): void {
    this.prop = null;
    this.textures = null;
    this.container.visible = false;
  }

  /** Light the three tones. Called whenever the world's light changes. */
  setTones(base: number, light: number, dark: number): void {
    this.base.tint = base;
    this.light.tint = light;
    this.dark.tint = dark;

    if (this.crownBase) this.crownBase.tint = base;
    if (this.crownLight) this.crownLight.tint = light;
    if (this.crownDark) this.crownDark.tint = dark;
  }

  /** How strongly local lights are burning, 0–1. Only lamps answer. */
  setActivation(activation: number): void {
    this.activation = clamp01(activation);
  }

  /**
   * Advance the idle animation. `elapsed` is the world's clock in seconds.
   *
   * Driven by shared elapsed time and the prop's own phase rather than by
   * accumulating per-prop state, so a prop that has been off screen for a minute
   * is in exactly the position it would have been in had it stayed — no snap
   * when it scrolls back into view.
   */
  animate(elapsed: number): void {
    const prop = this.prop;
    if (!prop) return;

    if (prop.motion === "sway") {
      // Whole pixels only. A sub-pixel sway is a blur, and this is pixel art.
      const offset = Math.round(
        Math.sin(elapsed * prop.swayRate + prop.phase) * prop.swayAmount
      );
      // A tree sways in its canopy and stands still in its trunk; everything
      // smaller than a tree is all canopy.
      if (this.crownBase) {
        this.crownBase.x = offset;
        this.crownLight!.x = offset;
        this.crownDark!.x = offset;
      } else {
        this.base.x = offset;
        this.light.x = offset;
        this.dark.x = offset;
      }
      return;
    }

    if (prop.motion === "flicker" && this.flame) {
      // Two rates that don't divide into each other, so the flame never finds a
      // loop the eye can learn (ART_DIRECTION.md §Animation Rules: lantern
      // flicker, subtle).
      const wobble =
        Math.sin(elapsed * FLICKER.rateA + prop.phase) *
        Math.sin(elapsed * FLICKER.rateB + prop.phase * 1.7);
      const strength = this.activation * (1 - FLICKER.depth * (0.5 + 0.5 * wobble));

      this.flame.alpha = strength;
      if (this.glow) this.glow.alpha = strength * FLICKER.glowAlpha;
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  private bindCrown(textures: PropTextures): void {
    const crown = textures.crown;

    if (!crown) {
      if (this.crownBase) {
        this.crownBase.visible = false;
        this.crownLight!.visible = false;
        this.crownDark!.visible = false;
      }
      return;
    }

    if (!this.crownBase) {
      this.crownBase = new Sprite();
      this.crownDark = new Sprite();
      this.crownLight = new Sprite();
      for (const sprite of [this.crownBase, this.crownDark, this.crownLight]) {
        sprite.anchor.set(0, 1);
        sprite.eventMode = "none";
        this.container.addChild(sprite);
      }
    }

    this.crownBase.texture = crown.base;
    this.crownLight!.texture = crown.light;
    this.crownDark!.texture = crown.dark;

    for (const sprite of [this.crownBase, this.crownDark!, this.crownLight!]) {
      sprite.visible = true;
      sprite.x = 0;
    }
  }

  private bindFlame(textures: PropTextures, glowTexture: Texture | null): void {
    if (!textures.flame) {
      if (this.flame) this.flame.visible = false;
      if (this.glow) this.glow.visible = false;
      return;
    }

    if (!this.flame) {
      this.flame = new Sprite();
      this.flame.anchor.set(0, 1);
      this.flame.eventMode = "none";
      this.flame.tint = EMISSIVE.lamp;
      this.container.addChild(this.flame);
    }

    this.flame.texture = textures.flame;
    this.flame.visible = true;

    if (glowTexture) {
      if (!this.glow) {
        this.glow = new Sprite();
        this.glow.anchor.set(0.5);
        this.glow.eventMode = "none";
        this.glow.tint = EMISSIVE.lamp;
        // Light adds to what is behind it, so a lamp brightens the road rather
        // than laying a pale disc over it.
        this.glow.blendMode = "add";
        // Behind the ironwork: the glow haloes the lamp instead of washing out
        // the shape that makes it read as a lamp.
        this.container.addChildAt(this.glow, 0);
      }

      this.glow.texture = glowTexture;
      this.glow.visible = true;
      this.glow.position.set(textures.width / 2, -(textures.lightY ?? textures.height));
    }
  }
}
