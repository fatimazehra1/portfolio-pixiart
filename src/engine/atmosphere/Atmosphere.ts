import { Container, Sprite, Texture } from "pixi.js";
import { toTexture } from "../shared";
import { applyAmbient } from "../lighting";
import type { LightingState } from "../lighting";
import { RESOLVED_SCENES } from "../scene";
import type { SceneDirector, SceneState } from "../scene";
import type { GradeManager } from "../grade";

/**
 * Regional colour, one soft patch per scene.
 *
 * # Why this and not real grading
 * The honest way to make a stretch of coast look colder than the next one is to
 * grade the pixels of that stretch. The land is a single strip baked at the
 * width of the whole world, so that means either a shader or slicing the strip
 * into regions and tinting each — the first drags a whole rendering approach
 * into a project that has none, and the second turns one baked texture into
 * dozens and puts a visible seam wherever two regions meet.
 *
 * This is the cheap stand-in and it is a good one: a wide, heavily feathered
 * patch of colour sitting in world space over each scene, multiplied into what
 * is underneath. It costs one sprite per scene and no per-frame work beyond a
 * tint and an alpha. The feathering is what sells it — the patches are far
 * wider than the scenes and overlap their neighbours by design, so what you
 * walk through is a continuous field of colour rather than a row of stains.
 *
 * # Multiply, and what that means
 * Multiply only ever darkens, which is exactly right for this: the global
 * day/night cycle owns how bright the world is, and a local patch that could
 * brighten would be a scene arguing with the hour. So an active scene shows
 * almost nothing here — its patch is near-white and near-transparent — and the
 * dormant and abandoned ones do the visible work. Weather adds the light back
 * at the scenes that want more of it.
 *
 * # Where it sits
 * Over the land and its planting, under the buildings. Above the land because
 * the land is what a place's colour is *for*; below the buildings because they
 * carry their own materials and their own lit windows, and washing a scene
 * colour over a lit window would put the fog in front of the lamp.
 */
export interface AtmosphereOptions {
  /** Pass the sky's `pixelScale` so the patches land on the shared grid. */
  pixelScale?: number;
  /** Viewport height in CSS pixels. */
  height: number;
  /**
   * Where the land starts, in CSS pixels — `Ground.topY`.
   *
   * The patches are confined to the land and everything on it. They must not
   * reach the sky: the sky is drawn outside the camera and belongs to the whole
   * world at once, so a patch of local colour over it reads as a rectangle
   * hanging in the air, which is precisely what it looked like before this
   * argument existed.
   */
  shorelineY: number;
  /**
   * How much wider than its scene each patch is drawn.
   *
   * The whole of the feathering, really. At 1 the patches would be scene-sized
   * and you would see their edges; this far wider than the ground they belong
   * to, every patch is already deep inside its neighbours before its own centre
   * has faded, and the field reads as continuous.
   */
  spread?: number;
  /** Ceiling on how strong any one patch can get, 0–1. */
  maxAlpha?: number;
}

export const DEFAULT_SPREAD = 3.4;
export const DEFAULT_MAX_ALPHA = 0.55;

/**
 * Width of the baked gradient, in texture pixels.
 *
 * Large, and it has to be: every texture in this engine samples nearest — that
 * is the whole pixel-art rule — so a ramp stretched from 128 texels across two
 * thousand screen pixels does not become a gradient, it becomes 128 hard bands
 * about thirteen pixels wide. Baked at roughly the width it is drawn at, each
 * texel lands on a pixel or two and the steps go under the noise floor.
 *
 * This is the one place in the engine where nearest sampling is a cost rather
 * than the point, and the fix is resolution rather than an exception to the
 * rule.
 */
const RAMP_WIDTH = 2048;

export class Atmosphere {
  /** Mount into the `atmosphere` layer. */
  readonly container = new Container();

  private readonly ramp: Texture;
  private readonly patches = new Map<string, Sprite>();
  private readonly spread: number;
  private readonly maxAlpha: number;
  private readonly pixelScaleValue: number;

  private lit: LightingState | null = null;
  private unbindScenes: (() => void) | null = null;
  private unbindLighting: (() => void) | null = null;

  constructor(options: AtmosphereOptions) {
    this.spread = options.spread ?? DEFAULT_SPREAD;
    this.maxAlpha = options.maxAlpha ?? DEFAULT_MAX_ALPHA;
    this.pixelScaleValue = Math.max(1, Math.round(options.pixelScale ?? 1));

    this.container.label = "atmosphere";
    this.container.eventMode = "none";

    this.ramp = this.bakeRamp();

    for (const scene of RESOLVED_SCENES) {
      const patch = new Sprite(this.ramp);
      patch.eventMode = "none";
      // Multiply: a patch can shade the coast, never light it. See the class note.
      patch.blendMode = "multiply";
      patch.anchor.set(0.5, 0);
      patch.alpha = 0;
      this.patches.set(scene.id, patch);
      this.container.addChild(patch);
    }

    this.resize(options.height, options.shorelineY);
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Follow the director.
   *
   * Reads the same weights everything else does, so a patch is exactly as
   * present as its scene's climate is — the colour on the ground and the fog in
   * the air are two views of one number, and they cannot drift apart.
   */
  bindScenes(scenes: SceneDirector): () => void {
    this.unbindScenes?.();
    this.unbindScenes = scenes.subscribe((state) => this.apply(state));
    return () => {
      this.unbindScenes?.();
      this.unbindScenes = null;
    };
  }

  /** Follow the graded light, so the patches sit in the hour they are drawn in. */
  bindLighting(grade: GradeManager): () => void {
    this.unbindLighting?.();
    this.unbindLighting = grade.subscribe((state) => {
      this.lit = state;
    });
    return () => {
      this.unbindLighting?.();
      this.unbindLighting = null;
    };
  }

  /**
   * Re-fit to a new viewport, in CSS pixels.
   *
   * @param shorelineY where the land starts. Patches begin here and run to the
   *   bottom of the view, so the sky above is never touched.
   */
  resize(height: number, shorelineY: number): void {
    if (height <= 0) return;

    const snap = (v: number) => Math.round(v / this.pixelScaleValue) * this.pixelScaleValue;
    const top = snap(shorelineY);
    // Past the bottom of the view, so a zoomed frame does not run out of patch
    // before it runs out of land.
    const depth = snap(Math.max(1, height * 1.5 - top));

    for (const scene of RESOLVED_SCENES) {
      const patch = this.patches.get(scene.id);
      if (!patch) continue;

      patch.width = snap(scene.width * this.spread);
      patch.height = depth;
      patch.x = snap(scene.worldX);
      patch.y = top;
    }
  }

  destroy(): void {
    this.unbindScenes?.();
    this.unbindScenes = null;
    this.unbindLighting?.();
    this.unbindLighting = null;
    this.container.destroy({ children: true });
    this.ramp.destroy(true);
  }

  // --- Internal --------------------------------------------------------------

  /**
   * Set every patch from the director's weights.
   *
   * A patch's strength is its scene's weight, not its distance — so the patch
   * and the fog and the palette all fade on one curve. The colour is the
   * scene's own tint, lit by the hour so a cold scene at sunset is cold *in the
   * sunset* rather than in the abstract.
   */
  private apply(state: SceneState): void {
    for (const scene of RESOLVED_SCENES) {
      const patch = this.patches.get(scene.id);
      if (!patch) continue;

      const weight = state.weights.get(scene.id) ?? 0;
      const delta = scene.palette;

      // What this scene actually asks for: how far it pulls colour out, plus
      // how far it pulls exposure down. An active scene asks for neither and
      // stays invisible, which is why the shore's default look is untouched.
      const strength =
        delta.desaturation * 0.7 + Math.max(0, 1 - delta.exposure) * 1.6;

      patch.alpha = Math.min(this.maxAlpha, strength * weight);
      patch.tint = this.lit ? applyAmbient(delta.tint, this.lit) : delta.tint;
    }
  }

  /**
   * A horizontal bell, baked once and shared by every patch.
   *
   * White at the centre falling to white-with-no-alpha at both edges, so under
   * multiply the middle of a scene is fully tinted and the edges are untouched.
   * Raised-cosine rather than linear: a linear ramp has a corner at each end,
   * and a corner in a gradient this wide is visible as a band.
   */
  private bakeRamp(): Texture {
    return toTexture(
      RAMP_WIDTH,
      1,
      (pixels) => {
        for (let x = 0; x < RAMP_WIDTH; x += 1) {
          const t = x / (RAMP_WIDTH - 1);
          const falloff = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
          const o = x * 4;
          pixels[o] = 255;
          pixels[o + 1] = 255;
          pixels[o + 2] = 255;
          pixels[o + 3] = Math.round(falloff * 255);
        }
      },
      "Atmosphere"
    );
  }
}
