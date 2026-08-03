import { Container, Sprite, Texture } from "pixi.js";
import { BIRD_FLAP_CYCLE, createBirdFrames } from "./textures";
import { createRandom, range, rangeInt } from "./random";

/** One bird's place in the formation and its own sense of rhythm. */
interface Bird {
  sprite: Sprite;
  /** Offset from the lead bird, in sky pixels. */
  offsetX: number;
  offsetY: number;
  /** Phase offsets so a flock never flaps or bobs in unison. */
  flapPhase: number;
  bobPhase: number;
  bobRate: number;
}

/** Never more than this many birds in the air at once. */
const MAX_BIRDS = 5;

/** Seconds a wingbeat frame is held. */
const FLAP_INTERVAL = 0.13;

/** How long the sky stays empty between flights, in seconds. */
const IDLE_RANGE: [number, number] = [26, 78];

/** Shorter wait for the first flight, so an arriving visitor sees one sooner. */
const FIRST_IDLE_RANGE: [number, number] = [7, 26];

/** Crossing speed in sky pixels per second. Purposeful, but never hurried. */
const SPEED_RANGE: [number, number] = [13, 21];

/**
 * Altitude band, 0–1 down the sky. Kept clear of the horizon haze below and of
 * the washed-out top of the sunset ramp above, where a silhouette would vanish.
 */
const ALTITUDE_RANGE: [number, number] = [0.16, 0.46];

/**
 * A single flock of birds that crosses the sky now and then.
 *
 * Two to five birds fly in a loose trailing V, each flapping and bobbing on its
 * own phase, and the sky is empty between flights — the point is that the world
 * is inhabited, not that there are birds in it (ART_DIRECTION.md §Screenshot
 * Rule: if it looks empty add life; if it looks crowded remove elements). One
 * flock at a time, and never at night, when a silhouette against a navy sky is
 * just noise and the birds would have roosted anyway.
 *
 * Sprites are pooled: five are made once and shown or hidden. Nothing is
 * allocated per flight.
 *
 * TODO(assets): frames are the built-in 5×3 glyphs. Pass `frames` to use
 * authored art instead — see TODO(assets) in textures.ts.
 */
export class BirdFlock {
  readonly container = new Container();

  private readonly frames: Texture[];
  private readonly ownsFrames: boolean;
  private readonly birds: Bird[] = [];
  private readonly rand: () => number;

  private skyWidth = 0;
  private skyHeight = 0;

  private flying = false;
  private active = 0;
  private leadX = 0;
  private leadY = 0;
  private direction: 1 | -1 = 1;
  private speed = 0;
  private trailSpan = 0;
  private idle: number;
  private elapsed = 0;

  /** Palette opacity. At 0 (night) no new flight starts. */
  private toneAlpha = 1;

  constructor(seed: number, frames?: Texture[]) {
    this.rand = createRandom(seed);
    this.ownsFrames = frames === undefined;
    this.frames = frames ?? createBirdFrames();

    this.container.label = "sky:birds";
    this.idle = range(this.rand, ...FIRST_IDLE_RANGE);

    for (let i = 0; i < MAX_BIRDS; i++) {
      const sprite = new Sprite(this.frames[0]);
      sprite.visible = false;
      this.container.addChild(sprite);
      this.birds.push({
        sprite,
        offsetX: 0,
        offsetY: 0,
        flapPhase: 0,
        bobPhase: 0,
        bobRate: 1,
      });
    }
  }

  resize(skyWidth: number, skyHeight: number): void {
    this.skyWidth = skyWidth;
    this.skyHeight = skyHeight;

    // Keep an in-flight flock inside the new sky rather than restarting it.
    const [low, high] = ALTITUDE_RANGE;
    this.leadY = Math.min(Math.max(this.leadY, low * skyHeight), high * skyHeight);
  }

  /**
   * Advance the flock. `delta` is seconds, already scaled by the sky's motion
   * setting — so at `motionScale: 0` this is never called and no birds fly.
   */
  update(delta: number): void {
    this.elapsed += delta;

    if (!this.flying) {
      // Don't count down towards a flight nobody could see.
      if (this.toneAlpha <= 0.01 || this.skyWidth <= 0) return;
      this.idle -= delta;
      if (this.idle <= 0) this.launch();
      return;
    }

    this.leadX += this.direction * this.speed * delta;

    // Let a flock that's already up finish crossing even if night falls on it —
    // it fades out with the palette and lands off-screen rather than freezing.
    if (this.hasLeftTheSky()) {
      this.land();
      return;
    }

    this.draw();
  }

  /** Tint and opacity from the palette. */
  setTone(color: number, alpha: number): void {
    this.toneAlpha = alpha;
    this.container.alpha = alpha;
    this.container.visible = alpha > 0.001;

    for (const bird of this.birds) {
      bird.sprite.tint = color;
    }
  }

  /** Birds sit in the middle distance, between the cloud bands. */
  setParallax(viewX: number, depth: number): void {
    this.container.x = Math.round(-viewX * depth);
  }

  destroy(): void {
    if (this.ownsFrames) {
      for (const frame of this.frames) frame.destroy(true);
    }
    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  private launch(): void {
    this.flying = true;
    this.active = rangeInt(this.rand, 2, MAX_BIRDS);
    this.direction = this.rand() < 0.5 ? 1 : -1;
    this.speed = range(this.rand, ...SPEED_RANGE);

    const [low, high] = ALTITUDE_RANGE;
    this.leadY = Math.round(range(this.rand, low, high) * this.skyHeight);

    // Build the V behind the leader: each bird drops back and alternates sides.
    this.trailSpan = 0;
    for (let i = 0; i < this.birds.length; i++) {
      const bird = this.birds[i];
      bird.sprite.visible = i < this.active;
      if (i >= this.active) continue;

      const rank = i;
      bird.offsetX = -this.direction * rank * range(this.rand, 5, 9);
      bird.offsetY =
        (rank % 2 === 0 ? -1 : 1) * Math.ceil(rank / 2) * range(this.rand, 2, 4) +
        range(this.rand, -1, 1);
      bird.flapPhase = this.rand() * FLAP_INTERVAL * BIRD_FLAP_CYCLE.length;
      bird.bobPhase = this.rand() * Math.PI * 2;
      bird.bobRate = range(this.rand, 1.1, 1.8);

      this.trailSpan = Math.max(this.trailSpan, Math.abs(bird.offsetX));
    }

    // Start fully off-screen, so the flock eases in rather than appearing.
    const margin = this.trailSpan + 12;
    this.leadX = this.direction > 0 ? -margin : this.skyWidth + margin;

    this.draw();
  }

  private land(): void {
    this.flying = false;
    this.idle = range(this.rand, ...IDLE_RANGE);
    for (const bird of this.birds) bird.sprite.visible = false;
  }

  private hasLeftTheSky(): boolean {
    const margin = this.trailSpan + 12;
    return this.direction > 0 ? this.leadX > this.skyWidth + margin : this.leadX < -margin;
  }

  private draw(): void {
    for (let i = 0; i < this.active; i++) {
      const bird = this.birds[i];

      const step = Math.floor((this.elapsed + bird.flapPhase) / FLAP_INTERVAL);
      bird.sprite.texture = this.frames[BIRD_FLAP_CYCLE[step % BIRD_FLAP_CYCLE.length]];

      // A single pixel of rise and fall. Rounded, so it steps on the pixel grid
      // instead of sliding between rows.
      const bob = Math.round(Math.sin(this.elapsed * bird.bobRate + bird.bobPhase));

      bird.sprite.x = Math.round(this.leadX + bird.offsetX);
      bird.sprite.y = Math.round(this.leadY + bird.offsetY) + bob;
    }
  }
}
