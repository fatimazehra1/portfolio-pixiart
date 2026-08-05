import { Container, Sprite, Texture } from "pixi.js";
import { maskToTexture as bakeMask } from "../shared";
import { LighthouseBeam } from "./LighthouseBeam";
import {
  BASE_BAND,
  DEFAULT_PIXEL_HEIGHT,
  DEFAULT_SEED,
  EMISSIVE,
  MATERIALS,
  TOWER,
  lighthouseWorldX,
  type LighthouseOptions,
  type MaterialName,
  type ShoreAnchors,
} from "./LighthouseConfig";
import { applyAmbient } from "../lighting";
import type { LightingState } from "../lighting";
import { createRandom } from "../shared/random";

/**
 * Something that hands out the state of the light and lets you listen to it.
 *
 * Structural rather than the concrete `LightingSystem`, and deliberately *not*
 * the clock: the beam is a local light source, and the lighting system is where
 * this world decided local light sources read their strength from. The chain is
 * clock → day/night → lighting → this, one way, and the types keep it that way.
 */
export interface LightingSource {
  subscribe(listener: (state: LightingState) => void): () => void;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Bake with the lighthouse's name on any failure. See `@/engine/shared`. */
function maskToTexture(width: number, height: number, mask: Uint8Array): Texture {
  return bakeMask(width, height, mask, "Lighthouse");
}

/** The layers the tower is built from. Each is a white mask, tinted separately. */
type TowerLayer =
  | "stone"
  | "stoneLight"
  | "stoneDark"
  | "iron"
  | "ironLight"
  | "copper"
  | "copperLight"
  | "copperDark"
  | "glass";

/** Layers that make their own light, and so aren't lit by the ambient. */
type EmissiveLayer = "window" | "lamp";

/** Draw order, back to front. */
const LAYER_ORDER: readonly (TowerLayer | EmissiveLayer)[] = [
  "stone",
  "stoneLight",
  "stoneDark",
  "glass",
  "window",
  "lamp",
  "copper",
  "copperLight",
  "copperDark",
  "iron",
  "ironLight",
];

/** Which material lights each layer. */
const LAYER_MATERIAL: Record<TowerLayer, MaterialName> = {
  stone: "stone",
  stoneLight: "stoneLight",
  stoneDark: "stoneDark",
  iron: "iron",
  ironLight: "ironLight",
  copper: "copper",
  copperLight: "copperLight",
  copperDark: "copperDark",
  glass: "glass",
};

/**
 * The Lighthouse — the end of the shore, and the one building visible from
 * everywhere else on it (WORLD.md §Overview).
 *
 * # What it is made of
 * A stone shaft on a plinth, an overhanging gallery with an iron railing, a
 * glazed lantern room, and a verdigris copper dome. All of it is plotted into
 * white masks once, on construction, and then tinted — so the tower is lit by
 * the same ambient as the sand it stands on and there is no second set of
 * colours to keep in step with the sky.
 *
 * The only parts that keep their own colour are the ones making light: the
 * windows and the lamp. Those are driven by the lighting system's local-light
 * multiplier, which is nothing at noon and everything at midnight.
 *
 * # Where it stands
 * In world space, on the plot the ground already reserves for it. It is mounted
 * inside the camera and never moves itself, so the tower and the beach are
 * carried by one transform on one pixel grid — which is what keeps the base of
 * the tower welded to the sand instead of shimmering against it.
 *
 * # Usage
 * ```ts
 * const lighthouse = new Lighthouse({
 *   width, height,
 *   worldWidth: WORLD_WIDTH,
 *   pixelScale: sky.pixelScale,
 *   anchors: { horizonY: ocean.topY, shorelineY: ground.topY, groundHeight },
 * });
 * engine.layer("structures").addChild(lighthouse.container);
 * const off = lighthouse.bindLighting(lightingManager);
 * app.ticker.add((t) => lighthouse.update(t.deltaMS / 1000));
 * ```
 *
 * Owns the tower and its beam. No interaction, no dialogue, no sound.
 *
 * TODO(assets): the tower is plotted in code because `public/assets/buildings/`
 * is empty. It is built from named proportions in LighthouseConfig and tinted
 * through one material set, so authored art replaces `bake` alone — the beam,
 * the lighting and the placement know nothing about where the pixels came from.
 */
export class Lighthouse {
  /** Mount this in front of the ground. */
  readonly container = new Container();

  /** The rotating light. Exposed for anything that needs to read its angle. */
  readonly beam: LighthouseBeam;

  private readonly tower = new Container();
  private readonly sprites = new Map<TowerLayer | EmissiveLayer, Sprite>();
  private readonly textures = new Map<TowerLayer | EmissiveLayer, Texture>();

  private readonly worldWidth: number | undefined;
  private readonly fixedPixelScale: number | undefined;
  private readonly targetPixelHeight = DEFAULT_PIXEL_HEIGHT;
  private readonly worldFraction: number;

  private pixelScaleValue = 1;
  private anchors: ShoreAnchors;

  private lighting: LightingState | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(options: LighthouseOptions) {
    this.worldWidth = options.worldWidth;
    this.fixedPixelScale = options.pixelScale;
    this.worldFraction = options.x ?? lighthouseWorldX();
    this.anchors = options.anchors;

    this.container.label = "lighthouse";
    this.container.eventMode = "none";
    this.tower.label = "lighthouse:tower";

    this.beam = new LighthouseBeam(options.beam, options.motionScale ?? 1);

    this.bake(createRandom(options.seed ?? DEFAULT_SEED));

    // The beam passes behind its own tower and comes back out in front of it.
    this.container.addChild(this.beam.back, this.tower, this.beam.front);

    this.resize(options.width, options.height, options.anchors);
    this.applyTint();
  }

  // --- Queries ---------------------------------------------------------------

  /** Whole screen pixels per lighthouse pixel. Matches the sky's. */
  get pixelScale(): number {
    return this.pixelScaleValue;
  }

  /** Where the tower stands, in world CSS pixels. */
  get worldX(): number {
    return this.towerCentre() * this.pixelScaleValue;
  }

  /** The lamp's world position in CSS pixels — the anchor for a camera focus. */
  get lampPosition(): { x: number; y: number } {
    return {
      x: this.worldX,
      y: this.lampY() * this.pixelScaleValue,
    };
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Follow the world's lighting. Returns an unsubscribe function.
   *
   * Fires immediately with the current light, so a lighthouse built at midnight
   * is already burning on its first frame rather than from the next phase.
   */
  bindLighting(source: LightingSource): () => void {
    this.unsubscribe?.();

    this.unsubscribe = source.subscribe((state) => {
      this.applyLighting(state);
    });

    return () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
    };
  }

  /**
   * Take a lighting reading, without subscribing to anything.
   *
   * The stone is lit by the ambient; the beam and the windows are lit by what is
   * *left over* for local sources, which is the same number every lantern and
   * lit window in this world will use. That is the whole of the day/night
   * behaviour — there is no code path here that asks what time it is.
   */
  applyLighting(state: LightingState): void {
    this.lighting = state;
    this.applyTint();

    const local = state.localLightMultiplier;
    this.beam.setActivation(local);

    const window = this.sprites.get("window");
    if (window) window.alpha = local;

    const lamp = this.sprites.get("lamp");
    // The bulb itself keeps a little presence even in daylight — an unlit lamp
    // room reads as a hole in the tower rather than as glass.
    if (lamp) lamp.alpha = lerp(0.25, 1, local);
  }

  /* The tower has no `setViewOffset`. It stands in world space inside the
   * camera's `structures` layer, at one fixed spot on the shore, and it is
   * never culled — the whole point of a lighthouse is that it is visible from
   * everywhere (WORLD.md §Overview). There is nothing left for it to say about
   * where the view is. */

  /** Re-fit to a new viewport, in CSS pixels. */
  resize(width: number, height: number, anchors: ShoreAnchors = this.anchors): void {
    if (width <= 0 || height <= 0) return;

    this.anchors = anchors;
    this.pixelScaleValue =
      this.fixedPixelScale ?? Math.max(1, Math.floor(height / this.targetPixelHeight));

    this.container.scale.set(this.pixelScaleValue);

    // The tower stands on the back verge of the land, where the ground layout
    // holds a plot clear for it, and is placed by its centre line.
    const baseY = Math.round(
      (anchors.shorelineY + anchors.groundHeight * BASE_BAND) / this.pixelScaleValue
    );

    this.tower.position.set(
      this.towerCentre() - (TOWER.width >> 1),
      baseY - TOWER.height
    );

    this.beam.setGeometry({
      lampX: this.towerCentre(),
      lampY: baseY - TOWER.height + this.lampOffsetY(),
      horizonY: anchors.horizonY / this.pixelScaleValue,
      shorelineY: anchors.shorelineY / this.pixelScaleValue,
    });
  }

  /**
   * Turn the light. `delta` is in seconds — pass `ticker.deltaMS / 1000`.
   *
   * The tower itself never moves. Stone doesn't.
   */
  update(delta: number): void {
    this.beam.update(delta);
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;

    this.beam.destroy();
    for (const texture of this.textures.values()) texture.destroy(true);
    this.textures.clear();
    this.sprites.clear();

    this.container.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  /** The tower's centre line, in lighthouse pixels across the world. */
  private towerCentre(): number {
    const worldWidth = this.worldWidth ?? 0;
    return Math.round((this.worldFraction * worldWidth) / this.pixelScaleValue);
  }

  /** How far down the bitmap the lamp sits. */
  private lampOffsetY(): number {
    return TOWER.finialHeight + TOWER.domeHeight + Math.round(TOWER.lanternHeight / 2);
  }

  /** The lamp's y in lighthouse pixels down the viewport. */
  private lampY(): number {
    return this.tower.y + this.lampOffsetY();
  }

  /** Light every layer by the current ambient. */
  private applyTint(): void {
    for (const [layer, sprite] of this.sprites) {
      if (layer === "window") {
        sprite.tint = EMISSIVE.window;
        continue;
      }
      if (layer === "lamp") {
        sprite.tint = EMISSIVE.lamp;
        continue;
      }

      const base = MATERIALS[LAYER_MATERIAL[layer as TowerLayer]];
      sprite.tint = this.lighting ? applyAmbient(base, this.lighting) : base;
    }
  }

  /**
   * Plot the tower.
   *
   * Built rather than hand-plotted, because at 32×112 a bitmap literal would be
   * unreadable and unmaintainable — but every proportion it is built from was
   * chosen by hand in LighthouseConfig, and the only thing random here is where
   * the stone is worn. Light falls from the upper left throughout, which is the
   * one convention everything else on this shore already follows.
   */
  private bake(rand: () => number): void {
    const w = TOWER.width;
    const h = TOWER.height;
    const cx = w >> 1;

    const layers = new Map<TowerLayer | EmissiveLayer, Uint8Array>();
    for (const name of LAYER_ORDER) layers.set(name, new Uint8Array(w * h));

    const put = (layer: TowerLayer | EmissiveLayer, x: number, y: number, alpha = 255) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      layers.get(layer)![y * w + x] = alpha;
    };
    const row = (layer: TowerLayer | EmissiveLayer, y: number, from: number, to: number) => {
      for (let x = from; x <= to; x++) put(layer, x, y);
    };

    // Vertical structure, top to bottom.
    const domeTop = TOWER.finialHeight;
    const domeBottom = domeTop + TOWER.domeHeight - 1;
    const lanternTop = domeBottom + 1;
    const lanternBottom = lanternTop + TOWER.lanternHeight - 1;
    const railTop = lanternBottom + 1;
    const railBottom = railTop + TOWER.railingHeight - 1;
    const floorTop = railBottom + 1;
    const floorBottom = floorTop + TOWER.galleryFloorHeight - 1;
    const shaftTop = floorBottom + 1;
    const plinthTop = h - TOWER.plinthHeight;
    const shaftBottom = plinthTop - 1;

    // --- Finial: the spike the whole silhouette ends on ---------------------
    put("copper", cx - 1, 0);
    put("copperLight", cx, 0);

    // --- Dome: copper, tapering out over the lantern room -------------------
    for (let y = domeTop; y <= domeBottom; y++) {
      const t = (y - domeTop) / Math.max(1, domeBottom - domeTop);
      // Eased rather than linear, so the cap is domed instead of conical.
      const width = Math.round(
        lerp(TOWER.domeTopWidth, TOWER.lanternWidth + 2, Math.sqrt(t))
      );
      const half = width >> 1;
      row("copper", y, cx - half, cx + half - 1);
      put("copperLight", cx - half, y);
      put("copperLight", cx - half + 1, y);
      put("copperDark", cx + half - 1, y);
      if (y === domeBottom) row("copperDark", y, cx - half, cx + half - 1);
    }

    // --- Lantern room: iron frame, glass between, and the lamp inside -------
    {
      const half = TOWER.lanternWidth >> 1;
      const left = cx - half;
      const right = cx + half - 1;

      for (let y = lanternTop; y <= lanternBottom; y++) {
        row("glass", y, left + 1, right - 1);
        put("iron", left, y);
        put("iron", right, y);
      }
      // Astragals: the vertical glazing bars. Without them the lantern room is
      // a lit rectangle, and a lit rectangle is a window, not a lighthouse.
      for (let x = left + 4; x < right; x += 4) {
        for (let y = lanternTop; y <= lanternBottom; y++) put("iron", x, y);
      }
      row("ironLight", lanternTop, left, right);
      row("iron", lanternBottom, left, right);

      // The lamp: a bright core sitting in the middle of the glass.
      const lampTop = lanternTop + 2;
      const lampBottom = lanternBottom - 2;
      for (let y = lampTop; y <= lampBottom; y++) {
        const t = (y - lampTop) / Math.max(1, lampBottom - lampTop);
        const half = Math.round(lerp(3, 2, Math.abs(t - 0.5) * 2));
        row("lamp", y, cx - half, cx + half - 1);
      }
    }

    // --- Gallery railing ----------------------------------------------------
    {
      const half = TOWER.galleryWidth >> 1;
      const left = cx - half;
      const right = cx + half - 1;

      // Top rail, then uprights, then the kick rail at the floor.
      row("ironLight", railTop, left, right);
      for (let x = left; x <= right; x += 2) {
        for (let y = railTop + 1; y < railBottom; y++) put("iron", x, y);
      }
      row("iron", railBottom - 1, left, right);
      row("iron", railBottom, left, right);
    }

    // --- Gallery floor: the overhang the railing stands on -------------------
    for (let y = floorTop; y <= floorBottom; y++) {
      const inset = y === floorBottom ? 2 : 0;
      const half = (TOWER.galleryWidth >> 1) - inset;
      row("stone", y, cx - half, cx + half - 1);
      put("stoneLight", cx - half, y);
      put("stoneDark", cx + half - 1, y);
      // The underside of an overhang is the darkest place on any building.
      if (y === floorBottom) row("stoneDark", y, cx - half, cx + half - 1);
    }

    // --- Shaft: tapered stone, coursed, worn ---------------------------------
    const shaftHalf = (y: number): number => {
      const t = (y - shaftTop) / Math.max(1, shaftBottom - shaftTop);
      return Math.round(lerp(TOWER.shaftTopWidth, TOWER.shaftBottomWidth, t)) >> 1;
    };

    for (let y = shaftTop; y <= shaftBottom; y++) {
      const half = shaftHalf(y);
      const left = cx - half;
      const right = cx + half - 1;

      row("stone", y, left, right);

      // Round the shaft off with light rather than with outline. The tower is a
      // cylinder, and a flat column of one grey with a lit edge reads as a
      // rectangle — so the whole width is shaded, brightest a third of the way
      // in from the lit side and falling away to the shadow on the right.
      for (let x = left; x <= right; x++) {
        const across = (x - left) / Math.max(1, right - left);
        if (across < 0.3) put("stoneLight", x, y, across < 0.14 ? 200 : 255);
        else if (across > 0.62) put("stoneDark", x, y, across > 0.84 ? 255 : 150);
      }

      // Courses. The joint is a shadow line, and the stone just under it
      // catches a little light — which is what gives a flat wall its depth.
      if ((y - shaftTop) % TOWER.courseHeight === 0) {
        row("stoneDark", y, left, right);
        if (y + 1 <= shaftBottom) {
          for (let x = left + 1; x < right; x++) {
            if (rand() < 0.5) put("stoneLight", x, y + 1, 150);
          }
        }
      }

      // Weathering: the odd block darker than its neighbours.
      if (rand() < 0.18) {
        const x = left + 1 + Math.floor(rand() * Math.max(1, right - left - 1));
        put("stoneDark", x, y, 120);
      }
    }

    // --- Windows up the shaft ------------------------------------------------
    for (let i = 0; i < TOWER.windowCount; i++) {
      const t = TOWER.windowStart + i * TOWER.windowStep;
      const y = Math.round(lerp(shaftBottom, shaftTop, t));
      const half = TOWER.windowWidth >> 1;

      for (let dy = 0; dy < TOWER.windowHeight; dy++) {
        row("window", y - dy, cx - half, cx + half - 1);
      }
      // A stone surround, so the window is set into the wall rather than
      // painted on it.
      for (let dy = -1; dy <= TOWER.windowHeight; dy++) {
        put("stoneDark", cx - half - 1, y - dy);
        put("stoneDark", cx + half, y - dy);
      }
      row("stoneDark", y + 1, cx - half - 1, cx + half);
      row("stoneLight", y - TOWER.windowHeight, cx - half - 1, cx + half);
    }

    // --- Plinth: the stepped base, and the door ------------------------------
    for (let y = plinthTop; y <= h - 1; y++) {
      const step = y < plinthTop + 2 ? 2 : 0;
      const half = (TOWER.plinthWidth >> 1) - step;
      const left = cx - half;
      const right = cx + half - 1;

      row("stone", y, left, right);
      put("stoneLight", left, y);
      put("stoneLight", left + 1, y);
      put("stoneDark", right, y);
      put("stoneDark", right - 1, y);

      if ((y - plinthTop) % TOWER.courseHeight === 0) row("stoneDark", y, left, right);
    }

    {
      const half = TOWER.doorWidth >> 1;
      const top = h - TOWER.doorHeight;

      for (let y = top; y <= h - 1; y++) {
        row("iron", y, cx - half, cx + half - 1);
      }
      // Arched head, and a lit edge down the hinge side.
      put("stone", cx - half, top);
      put("stone", cx + half - 1, top);
      row("ironLight", top + 1, cx - half, cx + half - 1);
      for (let y = top + 1; y <= h - 1; y++) put("ironLight", cx - half, y, 120);
    }

    // Bake every layer that has anything in it.
    for (const name of LAYER_ORDER) {
      const mask = layers.get(name)!;
      const texture = maskToTexture(w, h, mask);
      this.textures.set(name, texture);

      const sprite = new Sprite(texture);
      sprite.eventMode = "none";
      this.sprites.set(name, sprite);
      this.tower.addChild(sprite);
    }
  }
}
