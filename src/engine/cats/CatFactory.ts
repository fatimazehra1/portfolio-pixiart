import { Texture } from "pixi.js";
import { maskToTexture } from "../shared";

/**
 * One cat, drawn twice over and lit twice over.
 *
 * # Two poses, because a cat has two states worth drawing
 * Curled and asleep by day, sitting up with its eyes lit at night. That is the
 * day/night cycle applied to an animal rather than to a window, and it is the
 * only reason the cats change at all — nothing here animates for its own sake.
 *
 * Each pose has two frames. Asleep, the second frame is one pixel taller at
 * the ribs: breathing. Awake, the second frame moves the tail tip. At nine
 * pixels wide there is nothing else honest to animate.
 *
 * # Why the eyes are a separate texture
 * They are emissive: they hold their colour at every hour and only their
 * strength changes, exactly as a lit window does (`LayerMaterial.emissive`).
 * Baked into the body they would be tinted down with the fur at dusk, which is
 * the opposite of what eyes do.
 */

/** The bitmap every pose is drawn in. Nine by seven, and no bigger. */
export const CAT_WIDTH = 9;
export const CAT_HEIGHT = 7;

export interface CatTextures {
  /** Two frames, curled up. */
  asleep: Texture[];
  /** Two frames, sitting. */
  awake: Texture[];
  /** Two eyes, positioned for the awake pose. One frame — eyes do not animate. */
  eyes: Texture;
}

type Plot = (on: (x: number, y: number) => void, frame: number) => void;

function bake(plot: Plot, frame: number, label: string): Texture {
  const mask = new Uint8Array(CAT_WIDTH * CAT_HEIGHT);
  const on = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < CAT_WIDTH && y < CAT_HEIGHT) mask[y * CAT_WIDTH + x] = 255;
  };
  plot(on, frame);
  return maskToTexture(CAT_WIDTH, CAT_HEIGHT, mask, label);
}

/**
 * Curled, seen from the side: a loaf with two ears and a tail round the front.
 *
 * Rows 3 to 6 are the body, row 2 the head and ears, and the tail curves back
 * along the bottom. Asleep is the pose most of them are in most of the time,
 * so it is the one drawn most carefully.
 */
const plotAsleep: Plot = (on, frame) => {
  const lift = frame === 1 ? 1 : 0;

  // Ears.
  on(2, 2 - lift);
  on(4, 2 - lift);
  // Head.
  for (let x = 2; x <= 4; x++) on(x, 3 - lift);
  // Body: a low mound running to the right, rising by one when breathing in.
  for (let x = 1; x <= 7; x++) on(x, 4 - lift);
  for (let x = 1; x <= 8; x++) on(x, 5);
  for (let x = 2; x <= 7; x++) on(x, 6);
  // Tail, curled round the front of the body.
  on(0, 5);
  on(0, 6);
  on(1, 6);
};

/**
 * Sitting up, facing left: haunches at the back, chest at the front, tail
 * hanging down behind.
 */
const plotAwake: Plot = (on, frame) => {
  // Ears and head.
  on(2, 0);
  on(4, 0);
  for (let x = 2; x <= 4; x++) on(x, 1);
  for (let x = 2; x <= 4; x++) on(x, 2);
  // Chest and front legs.
  for (let x = 2; x <= 5; x++) on(x, 3);
  for (let x = 2; x <= 6; x++) on(x, 4);
  for (let x = 2; x <= 7; x++) on(x, 5);
  for (let x = 2; x <= 7; x++) on(x, 6);
  // Tail: down behind on one frame, flicked out on the other.
  if (frame === 0) {
    on(8, 4);
    on(8, 5);
    on(8, 6);
  } else {
    on(8, 3);
    on(8, 4);
    on(7, 3);
  }
};

/** Two pixels, where the awake pose's head is. Nothing else is emissive. */
const plotEyes: Plot = (on) => {
  on(2, 1);
  on(4, 1);
};

export function createCatTextures(): CatTextures {
  return {
    asleep: [0, 1].map((frame) => bake(plotAsleep, frame, "Cat")),
    awake: [0, 1].map((frame) => bake(plotAwake, frame, "Cat")),
    eyes: bake(plotEyes, 0, "Cat"),
  };
}

/**
 * The outline shown while the pointer is on a cat.
 *
 * A frame one pixel proud of the bitmap, the same gesture a building's own
 * hover uses. Faint on purpose: it has to say "this is interactive" to
 * somebody who has already spotted the cat, and nothing at all to somebody
 * sweeping the mouse across the scene on their way to the Resume button.
 */
export function createCatHighlight(): Texture {
  const w = CAT_WIDTH + 2;
  const h = CAT_HEIGHT + 2;
  const mask = new Uint8Array(w * h);
  const on = (x: number, y: number) => {
    mask[y * w + x] = 255;
  };
  for (let x = 0; x < w; x++) {
    on(x, 0);
    on(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    on(0, y);
    on(w - 1, y);
  }
  return maskToTexture(w, h, mask, "Cat");
}
