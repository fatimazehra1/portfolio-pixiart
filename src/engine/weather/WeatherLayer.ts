import { Container, Sprite, Texture } from "pixi.js";
import { createRandom, range } from "../shared";
import { applyAmbient, localIntensity } from "../lighting";
import type { LightingState } from "../lighting";
import type { WeatherProfile } from "./WeatherProfiles";

/** One particle's state. Plain data; the sprite is lent to it. */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  swayAmount: number;
  swayRate: number;
  swayPhase: number;
}

export interface WeatherLayerOptions {
  profile: WeatherProfile;
  /** White 1×1, shared by every layer. */
  texture: Texture;
  seed: number;
  motionScale?: number;
}

/**
 * The one weather emitter.
 *
 * Every effect in the world is this class plus a different `WeatherProfile` —
 * rain, fog, dust, sparks and clear air all run the same twenty lines of
 * integration. There is no rain class.
 *
 * # How it stays pixel art
 * Particles hold fractional positions and velocities, because motion has to be
 * smooth to look like motion, but they are *drawn* on whole art pixels — the
 * sprite position is rounded every frame. So a raindrop moves at 137 pixels per
 * second and still only ever occupies whole cells of the grid, which is exactly
 * what a hand-animated sprite would do.
 *
 * # How it stays cheap
 * The particle count is decided once per resize from the field's area, and the
 * sprites are allocated once and reused forever. Changing intensity hides
 * sprites rather than creating them, so walking from clear air into fog costs
 * a few `visible` assignments and no allocation at all.
 */
export class WeatherLayer {
  readonly container = new Container();

  private readonly profile: WeatherProfile;
  private readonly texture: Texture;
  private readonly seed: number;
  private readonly motionScale: number;

  private readonly veil: Sprite;
  private readonly field = new Container();

  private particles: Particle[] = [];
  private sprites: Sprite[] = [];

  private width = 0;
  private height = 0;
  /** Where in the field this profile's band starts and ends, in art pixels. */
  private bandTop = 0;
  private bandHeight = 0;

  /** 0–1. What the scene is asking for. */
  private intensityValue = 0;
  /** How many sprites are currently shown. Derived from intensity. */
  private live = 0;

  private lit: LightingState | null = null;

  constructor(options: WeatherLayerOptions) {
    this.profile = options.profile;
    this.texture = options.texture;
    this.seed = options.seed;
    this.motionScale = Math.max(0, options.motionScale ?? 1);

    this.container.eventMode = "none";
    this.field.eventMode = "none";

    this.veil = new Sprite(this.texture);
    this.veil.eventMode = "none";
    this.veil.tint = this.profile.veil.color;
    this.veil.alpha = 0;

    this.container.addChild(this.veil, this.field);
  }

  // --- Queries ---------------------------------------------------------------

  get intensity(): number {
    return this.intensityValue;
  }

  /** Nothing to draw. The system skips updating these entirely. */
  get idle(): boolean {
    return this.intensityValue <= 0.001;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * How hard this effect is running, 0–1.
   *
   * Scales the particle count, the particle opacity and the veil together.
   * Scaling all three rather than just one is what makes a low intensity read
   * as *thin weather* rather than as the same weather turned down.
   */
  setIntensity(value: number): void {
    const next = value < 0 ? 0 : value > 1 ? 1 : value;
    if (next === this.intensityValue) return;
    this.intensityValue = next;

    this.container.visible = next > 0.001;
    // A flashing profile writes its own alpha every frame; setting a steady one
    // here would make it visible between strikes, which is the one thing
    // lightning must not be.
    if (!this.profile.flash) this.veil.alpha = this.profile.veil.alpha * next;

    // Sprites beyond the live count are hidden, not destroyed.
    this.live = Math.round(this.particles.length * next);
    for (let i = 0; i < this.sprites.length; i += 1) {
      this.sprites[i].visible = i < this.live;
    }
  }

  /** Re-fit the field. `width`/`height` are in art pixels. */
  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.width = Math.ceil(width);
    this.height = Math.ceil(height);

    const [from, to] = this.profile.band;
    this.bandTop = Math.round(this.height * from);
    this.bandHeight = Math.max(1, Math.round(this.height * (to - from)));

    // The veil fills the band, not the field. A wash over the whole view is a
    // colour filter on the picture; a wash that starts at the horizon and
    // thickens downward is fog sitting on the water, which is the difference
    // between weather being *in* the scene and being laid over it.
    this.veil.x = 0;
    this.veil.y = this.bandTop;
    this.veil.width = this.width;
    this.veil.height = this.bandHeight;

    this.rebuild();
  }

  /**
   * Light the weather.
   *
   * Everything that does not make its own light is dimmed and tinted by the
   * ambient, exactly as the shore is — fog at midnight is blue, and fog that
   * stayed white would sit on the world like a sheet of paper. Emissive
   * profiles instead ride the local-light multiplier, so sparks are barely
   * visible at noon and burn at night.
   */
  applyLighting(state: LightingState): void {
    this.lit = state;

    if (this.profile.emissive) {
      const strength = localIntensity(1, state);
      this.veil.tint = this.profile.veil.color;
      for (const sprite of this.sprites) sprite.tint = this.profile.color;
      this.field.alpha = 0.25 + 0.75 * strength;
      return;
    }

    this.field.alpha = 1;
    const particle = applyAmbient(this.profile.color, state);
    this.veil.tint = applyAmbient(this.profile.veil.color, state);
    for (const sprite of this.sprites) sprite.tint = particle;
  }

  /** Advance the field. `delta` is in seconds. */
  update(delta: number, elapsed: number): void {
    if (this.idle) return;

    if (this.profile.flash) this.strike(elapsed);

    const step = delta * this.motionScale;
    if (step <= 0) return;

    const bottom = this.bandTop + this.bandHeight;

    for (let i = 0; i < this.live; i += 1) {
      const p = this.particles[i];

      p.x += p.vx * step;
      p.y += p.vy * step;

      // Wrap rather than respawn. A particle leaving the right edge is the same
      // particle arriving at the left, so the field never has to allocate and
      // its density never fluctuates.
      if (p.x < 0) p.x += this.width;
      else if (p.x >= this.width) p.x -= this.width;

      if (p.y < this.bandTop) p.y += this.bandHeight;
      else if (p.y >= bottom) p.y -= this.bandHeight;

      const sway = p.swayAmount * Math.sin(elapsed * p.swayRate + p.swayPhase);

      const sprite = this.sprites[i];
      // Whole art pixels only. See the class note.
      sprite.x = Math.round(p.x + sway);
      sprite.y = Math.round(p.y);
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
    this.particles = [];
    this.sprites = [];
  }

  // --- Internal --------------------------------------------------------------

  /**
   * Drive the veil as an intermittent flash rather than a steady wash.
   *
   * The strike time comes from the clock rather than from a timer, so a layer
   * that has been faded out for a minute does not owe a burst of strikes when
   * it fades back in — it simply joins whatever the sky was already doing.
   *
   * Within a strike the alpha is a decaying ramp multiplied by a fast square
   * beat. The decay is what makes it a flash rather than a pulse; the beat is
   * what makes it lightning rather than a lamp being switched on.
   *
   * Not smoothed by `motionScale`, but silenced by it: under
   * `prefers-reduced-motion` a flashing sky is exactly the thing not to render.
   */
  private strike(elapsed: number): void {
    const flash = this.profile.flash!;

    if (this.motionScale <= 0) {
      this.veil.alpha = 0;
      return;
    }

    // Where we are in the current cycle, 0–1.
    const cycle = (elapsed % flash.period) / flash.period;
    const window = flash.duration / flash.period;

    if (cycle > window) {
      this.veil.alpha = 0;
      return;
    }

    const t = cycle / window;
    const decay = (1 - t) ** 2;
    // Odd beats land bright, even beats dark — a stutter, not a fade.
    const beat = Math.floor(t * flash.beats * 2) % 2 === 0 ? 1 : 0.25;

    this.veil.alpha = flash.peak * decay * beat * this.intensityValue;
  }

  /** Decide the population and lay it out. Called on resize only. */
  private rebuild(): void {
    this.field.removeChildren();
    this.particles = [];
    this.sprites = [];

    const area = (this.width * this.bandHeight) / 10_000;
    const count = Math.round(this.profile.density * area);
    if (count <= 0) {
      this.live = 0;
      return;
    }

    const rand = createRandom(this.seed);
    const { size, alpha, vx, vy, sway, streak, color } = this.profile;

    for (let i = 0; i < count; i += 1) {
      const w = Math.max(1, Math.round(range(rand, size[0], size[1])));

      const particle: Particle = {
        x: rand() * this.width,
        y: this.bandTop + rand() * this.bandHeight,
        vx: range(rand, vx[0], vx[1]),
        vy: range(rand, vy[0], vy[1]),
        size: w,
        alpha: range(rand, alpha[0], alpha[1]),
        swayAmount: range(rand, sway.amount[0], sway.amount[1]),
        swayRate: range(rand, sway.rate[0], sway.rate[1]),
        swayPhase: rand() * Math.PI * 2,
      };

      const sprite = new Sprite(this.texture);
      sprite.eventMode = "none";
      sprite.width = w;
      sprite.height = Math.max(1, Math.round(w * streak));
      sprite.alpha = particle.alpha;
      sprite.tint = color;
      sprite.x = Math.round(particle.x);
      sprite.y = Math.round(particle.y);

      this.particles.push(particle);
      this.sprites.push(sprite);
      this.field.addChild(sprite);
    }

    // Re-apply whatever state we already had, so a resize doesn't reset the
    // weather to full strength in the wrong colour for one frame.
    if (this.lit) this.applyLighting(this.lit);
    const held = this.intensityValue;
    this.intensityValue = -1;
    this.setIntensity(held);
  }
}
