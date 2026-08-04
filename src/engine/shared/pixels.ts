import { CanvasSource, Texture } from "pixi.js";

/**
 * Baking pixels into textures, for the whole engine.
 *
 * Every system in this world draws by writing bytes into an ImageData and
 * handing it to Pixi with nearest-neighbour sampling and no mipmaps — that
 * combination is what keeps the art hard-edged at every scale (CLAUDE.md
 * §Pixel Art Rules). Six copies of these two functions existed, differing only
 * in an `export` keyword and the prefix on an error message.
 *
 * `label` is that prefix, kept because a "2D canvas context unavailable" thrown
 * from six possible places is worth being able to attribute.
 */

/**
 * Paint into a raw RGBA buffer and bake the result.
 *
 * `paint` receives the ImageData's byte array directly — four bytes per pixel,
 * row-major. Deliberately the lowest-level seam available: everything above it
 * is drawing, everything below it is Pixi.
 */
export function toTexture(
  width: number,
  height: number,
  paint: (pixels: Uint8ClampedArray) => void,
  label = "Engine"
): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(`${label}: 2D canvas context unavailable`);

  const image = new ImageData(width, height);
  paint(image.data);
  ctx.putImageData(image, 0, 0);

  return new Texture({
    source: new CanvasSource({
      resource: canvas,
      scaleMode: "nearest",
      antialias: false,
      autoGenerateMipmaps: false,
    }),
  });
}

/**
 * White RGB with a per-pixel alpha mask.
 *
 * The workhorse of the entire engine. Shapes are baked as white silhouettes and
 * *tinted* at runtime, which is what lets one drawing be lit by six different
 * times of day without ever being re-baked — and why a palette change costs a
 * tint assignment rather than a texture upload.
 */
export function maskToTexture(
  width: number,
  height: number,
  mask: Uint8Array,
  label = "Engine"
): Texture {
  return toTexture(
    width,
    height,
    (pixels) => {
      for (let i = 0; i < mask.length; i++) {
        const o = i * 4;
        pixels[o] = 255;
        pixels[o + 1] = 255;
        pixels[o + 2] = 255;
        pixels[o + 3] = mask[i];
      }
    },
    label
  );
}
