import { Container, Sprite, Texture } from "pixi.js";
import { createRandom, maskToTexture } from "../shared";
import { PROP_BASELINES } from "../ground";
import { applyAmbient } from "../lighting";
import type { LightingState } from "../lighting";

/**
 * The things that cross a scene and then are gone.
 *
 * The shore already moves: grass and flowers sway, a flock crosses the sky
 * every minute or so, windows switch, a crane slews, smoke leaves a chimney.
 * All of it is *in place* — the same things doing the same thing wherever you
 * stand. What was missing is anything that happens **once**: somebody walking
 * the promenade and then gone. A world where nothing ever arrives or leaves is
 * a diorama, however much of it is animated.
 *
 * # Rare on purpose
 * A crossing waits well over half a minute between runs and takes ten to
 * twenty seconds. A visitor who stays a while sees one; a visitor who is here
 * for thirty seconds on their way to the resume sees nothing and loses
 * nothing. ART_DIRECTION.md's animation rule is that motion should be noticed
 * rather than watched, and anything on a tighter loop becomes traffic.
 *
 * # Why it is not a prop
 * `Environment` owns a thousand things that never move from where they were
 * planted, and its whole design is a sliding window over a sorted array. A
 * walker has no place in that array: it is at a different x every frame and
 * belongs to no plot. A sprite and a timer is the honest shape.
 *
 * It is kept as a list rather than as one walker because the next thing to
 * cross — a boat on the horizon, a bicycle — is another row in it and nothing
 * else.
 */

/** Which way a crossing is going. */
type Heading = 1 | -1;

interface Crossing {
  sprite: Sprite;
  /** Frames of the gait. */
  frames: Texture[];
  /** Seconds per frame. */
  frameSeconds: number;
  /** World pixels per second, before the pixel grid. */
  speed: number;
  /** How long to wait between runs, in seconds. */
  idle: [number, number];
  /** Baseline within the ground band, as a fraction of `PROP_BASELINES`. */
  baseline: number;
  /** Lit colour, before the ambient. */
  color: number;

  /** Seconds until the next run starts. Negative means it is running. */
  wait: number;
  x: number;
  heading: Heading;
  elapsed: number;
  frame: number;
}

/** The walker: five pixels wide, and a two-frame gait is all it needs. */
const WALKER = { width: 5, height: 9 };

/**
 * How long it waits between crossings, and how fast it goes.
 *
 * Over half a minute of empty shore between runs, and ten to twenty seconds to
 * cross. Somebody who stays a while sees one; somebody passing through to the
 * resume sees nothing and misses nothing.
 */
const WALKER_IDLE: [number, number] = [38, 95];
const WALKER_SPEED = 17;

/** Shorter first waits, so an arriving visitor is not guaranteed an empty shore. */
const FIRST_WAIT: [number, number] = [6, 22];

/** How far past each edge a crossing starts and ends, in art pixels. */
const OFF_SCREEN = 24;

export interface AmbientLifeOptions {
  /** Total width of the world, in art pixels — the span a crossing traverses. */
  worldWidth: number;
  /** Pass the sky's `pixelScale`, so this shares the world's grid. */
  pixelScale: number;
  /** Where the land is. Same shape the buildings and the planting take. */
  anchors: { shorelineY: number; groundHeight: number };
  /** 0 for `prefers-reduced-motion: reduce`: nothing ever crosses. */
  motionScale?: number;
  seed?: number;
}

/**
 * Where the walker travels: the path, the band the shore already reserves for
 * anything on two feet.
 *
 * Taken from `PROP_BASELINES` rather than restated, so a walker cannot end up
 * on a different line from the benches and lamp posts it is walking past.
 *
 * # Why nothing drives
 * A vehicle was asked for, and there is nowhere on this shore to put one. The
 * bands are a beach, a verge and a footpath; the road that Planet01 has is on
 * its *island*, up on the map, not down here. A car crossing a promenade lined
 * with benches would read as a bug, so there isn't one.
 */
const WALK_BASELINE = PROP_BASELINES.path;

export class AmbientLife {
  readonly container = new Container();

  private readonly crossings: Crossing[] = [];
  private readonly motionScale: number;
  private readonly rand: () => number;

  private pixelScaleValue: number;
  private worldWidth: number;
  private anchors: { shorelineY: number; groundHeight: number };
  private lighting: LightingState | null = null;

  constructor(options: AmbientLifeOptions) {
    this.motionScale = Math.max(0, options.motionScale ?? 1);
    this.worldWidth = options.worldWidth;
    this.pixelScaleValue = options.pixelScale;
    this.anchors = options.anchors;
    this.rand = createRandom(options.seed ?? 0x5c0f);

    this.container.label = "ambient-life";
    this.container.eventMode = "none";

    this.crossings.push(
      this.make(walkerFrames(), 0.26, WALKER_SPEED, WALKER_IDLE, WALK_BASELINE, 0x5d6472)
    );

    this.resize(options.worldWidth, options.anchors, options.pixelScale);
  }

  /** Follow the world's lighting. */
  applyLighting(state: LightingState): void {
    this.lighting = state;
    for (const crossing of this.crossings) {
      crossing.sprite.tint = applyAmbient(crossing.color, state);
    }
  }

  /** Re-fit to a new world span or pixel grid. */
  resize(
    worldWidth: number,
    anchors: { shorelineY: number; groundHeight: number },
    pixelScale: number
  ): void {
    this.worldWidth = worldWidth;
    this.anchors = anchors;
    this.pixelScaleValue = pixelScale;
    this.container.scale.set(pixelScale);

    for (const crossing of this.crossings) this.place(crossing);
  }

  /** One frame. `delta` is in seconds. */
  update(delta: number): void {
    if (this.motionScale <= 0) return;
    const step = delta * this.motionScale;

    for (const crossing of this.crossings) {
      if (crossing.wait > 0) {
        crossing.wait -= step;
        if (crossing.wait > 0) continue;
        this.launch(crossing);
      }

      crossing.x += crossing.speed * crossing.heading * step;
      crossing.elapsed += step;

      const frame = Math.floor(crossing.elapsed / crossing.frameSeconds) % crossing.frames.length;
      if (frame !== crossing.frame) {
        crossing.frame = frame;
        crossing.sprite.texture = crossing.frames[frame];
      }

      const span = this.spanFor(crossing);
      if (crossing.heading > 0 ? crossing.x > span.to : crossing.x < span.from) {
        this.park(crossing);
        continue;
      }

      this.place(crossing);
    }
  }

  destroy(): void {
    for (const crossing of this.crossings) {
      for (const texture of crossing.frames) texture.destroy(true);
    }
    this.crossings.length = 0;
    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  private make(
    frames: Texture[],
    frameSeconds: number,
    speed: number,
    idle: [number, number],
    baseline: number,
    color: number
  ): Crossing {
    const sprite = new Sprite(frames[0]);
    sprite.eventMode = "none";
    // Anchored at the foot and the middle, so a crossing stands on the line it
    // travels along however tall it is.
    sprite.anchor.set(0.5, 1);
    sprite.visible = false;
    this.container.addChild(sprite);

    const crossing: Crossing = {
      sprite,
      frames,
      frameSeconds,
      speed,
      idle,
      baseline,
      color,
      wait: this.between(FIRST_WAIT),
      x: 0,
      heading: 1,
      elapsed: 0,
      frame: 0,
    };
    return crossing;
  }

  /** Send one off from whichever edge it happens to have chosen. */
  private launch(crossing: Crossing): void {
    const span = this.spanFor(crossing);
    crossing.heading = this.rand() < 0.5 ? 1 : -1;
    crossing.x = crossing.heading > 0 ? span.from : span.to;
    crossing.elapsed = 0;
    crossing.sprite.visible = true;
    crossing.sprite.scale.x = crossing.heading;
    if (this.lighting) crossing.sprite.tint = applyAmbient(crossing.color, this.lighting);
  }

  /** Put one away until its next run. */
  private park(crossing: Crossing): void {
    crossing.sprite.visible = false;
    crossing.wait = this.between(crossing.idle);
  }

  private place(crossing: Crossing): void {
    const { shorelineY, groundHeight } = this.anchors;
    const y = (shorelineY + groundHeight * crossing.baseline) / this.pixelScaleValue;
    crossing.sprite.position.set(Math.round(crossing.x), Math.round(y));
  }

  /** Where a crossing enters and leaves, in art pixels. */
  private spanFor(crossing: Crossing): { from: number; to: number } {
    const half = crossing.sprite.width / 2;
    const width = this.worldWidth / this.pixelScaleValue;
    return { from: -OFF_SCREEN - half, to: width + OFF_SCREEN + half };
  }

  private between([low, high]: [number, number]): number {
    return low + this.rand() * (high - low);
  }
}

/**
 * A person, in five pixels by nine, walking.
 *
 * Two frames: legs apart and legs together. At this scale that is the entire
 * vocabulary of walking, and a third frame would only be a blur of the first
 * two. Drawn as a silhouette rather than as a figure with a face, which is the
 * same choice the birds and the roof figures on Planet01 make.
 */
function walkerFrames(): Texture[] {
  const { width, height } = WALKER;

  return [0, 1].map((step) => {
    const mask = new Uint8Array(width * height);
    const on = (x: number, y: number) => {
      if (x >= 0 && y >= 0 && x < width && y < height) mask[y * width + x] = 255;
    };

    // Head, shoulders, body.
    on(2, 0);
    on(2, 1);
    for (let x = 1; x <= 3; x++) on(x, 2);
    for (let y = 3; y <= 5; y++) for (let x = 1; x <= 3; x++) on(x, y);

    if (step === 0) {
      // Mid-stride: legs apart, one arm forward.
      on(1, 6);
      on(0, 7);
      on(0, 8);
      on(3, 6);
      on(4, 7);
      on(4, 8);
      on(4, 4);
    } else {
      // Passing: legs together, arms down.
      on(2, 6);
      on(1, 7);
      on(3, 7);
      on(1, 8);
      on(3, 8);
    }

    return maskToTexture(width, height, mask, "AmbientLife");
  });
}
