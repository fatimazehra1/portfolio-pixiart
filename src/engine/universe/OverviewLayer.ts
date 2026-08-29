import { Container, Graphics, Rectangle, Sprite, Texture, TilingSprite } from "pixi.js";
import { createRandom, ditherAlpha, range, rangeInt, toTexture } from "../shared";
import { generateIsoIsland } from "./IsoIslandFactory";
import type { IsoIsland } from "./IsoIslandFactory";
import { DEFAULT_ISO_THEME, ISO_THEME } from "./IsoTheme";
import type { IsoThemeEntry } from "./IsoTheme";
import { LandmarkFactory } from "./LandmarkFactory";
import { KIND_TONES, PETALS, PROP_MATERIALS, PropFactory } from "../environment";
import type { PropKind, PropView } from "../environment";
import type { BuildingRenderer } from "../buildings";
import type { CameraView } from "../camera/Camera";
import type { LightingState } from "../lighting";
import type { Size } from "../types";
import type { ResolvedChapter } from "./UniverseTypes";

/**
 * The overview: the career universe, as a cluster of isometric islands.
 *
 * Nine worlds, generated from one shape function (`IsoIslandFactory`) rather
 * than hand-plotted, each carrying its own building (where a chapter has one)
 * or a small silhouette, and a scatter of the shore's own planting. They
 * cluster tightly rather than sit spaced out on a grid — the composition is
 * "a place packed with places", not "a diagram of one".
 *
 * # Two spaces, as before
 * `backdrop` is screen space, behind the camera: the warm gradient and the
 * drifting cloud bands are atmosphere, not places, and do not pan.
 * `field` is world space, inside the camera: the dashed paths and every
 * island live there, so panning moves them together.
 */

// The sky between the worlds, top to bottom: a deep warm dusk, through peach,
// into pale cream at the foot of the frame. Three stops rather than two — a
// straight lerp from the deep tone to the pale one goes grey through the
// middle, and grey is what this pass exists to get rid of.
const VOID_TOP = 0xa88bb0; // deep dusty mauve
const VOID_MID = 0xe3b79c; // warm peach
const VOID_BOTTOM = 0xfaeacf; // pale cream

/** How dark the frame's own edges go. */
const VIGNETTE_COLOR = 0x4a3550;
const VIGNETTE_ALPHA = 0.34;

/** How much glow an island carries with nothing pointing at it. */
const GLOW_REST = 0.24;

const BOB_PIXELS = 2;
const BOB_PERIOD = [16, 27] as const;
const DETAIL_SMOOTHING = 6;

/**
 * There is no day/night cycle between the worlds — see `OverviewLayer`'s own
 * doc comment on why props are lit from the flat material table instead of
 * the clock. Buildings need the same treatment: without *some* lighting
 * state, `BuildingRenderer` falls back to each material's raw colour, and a
 * few of those (Vaultsys's stone, the lighthouse's shadow tone) were
 * authored to be lit rather than to stand alone. `lightBoost` in `IsoTheme`
 * multiplies this further for the two that still read dark under it.
 */
const HUB_BUILDING_LIGHT: LightingState = {
  ambientIntensity: 1.15,
  ambientTint: 0xfff3d6,
  tintStrength: 0.1,
  shadowStrength: 0.6,
  highlightStrength: 0.6,
  bloomMultiplier: 0.2,
  localLightMultiplier: 0,
  fromPhase: "noon",
  toPhase: "noon",
  blend: 0,
};

/**
 * A building's width, as a fraction of its island's own top-face width.
 *
 * This is the hard constraint, not a fallback — the island is what exists
 * first, and nothing standing on it may be wider than it is. A previous pass
 * had this backwards: a generous cap meant to protect wide buildings instead
 * let Vaultsys and Aptech render at up to 2x their own island's width, which
 * reads as a building floating beside its island rather than standing on it.
 * `heightFactor` in `IsoTheme` is the aspiration; this is the ceiling it
 * always has to fit under first.
 */
const BUILDING_WIDTH_FIT = 0.8;

/** Chronological order the dashed paths connect, exactly as authored. */
const PATH_ORDER = [
  "aptech",
  "workshop",
  "ideas",
  "freelance",
  "planet01",
  "vaulsys",
  "bbit",
  "naturetech",
  "lighthouse",
] as const;

/** What grows where, keyed by `identity.terrain` — same idea the coast uses. */
const PLANTING: Record<string, { kinds: readonly PropKind[]; count: [number, number] }> = {
  campus: { kinds: ["tree", "bush", "flower", "tallGrass"], count: [4, 6] },
  city: { kinds: ["rock", "bush", "tallGrass"], count: [2, 4] },
  vault: { kinds: ["rock", "rock", "bush"], count: [2, 3] },
  forge: { kinds: ["tree", "rock", "bush", "tallGrass"], count: [3, 5] },
  shore: { kinds: ["rock", "driftwood", "tallGrass"], count: [2, 4] },
  spire: { kinds: ["bush", "tallGrass"], count: [2, 4] },
  workshop: { kinds: ["rock", "bush"], count: [2, 4] },
  meadow: { kinds: ["flower", "tallGrass", "bush"], count: [4, 6] },
};
const DEFAULT_PLANTING = PLANTING.shore;

export interface OverviewLayerOptions {
  chapters: readonly ResolvedChapter[];
  /** Pass the engine's shared `pixelScale` so the islands land on the grid. */
  pixelScale: number;
  width: number;
  height: number;
  /** Global motion multiplier. 0 for `prefers-reduced-motion: reduce`. */
  motionScale?: number;
  /** The pointer moved onto a world, or off every world. */
  onHover?: (id: string | null) => void;
  /** A world was clicked. */
  onSelect?: (id: string) => void;
}

interface Marker {
  chapter: ResolvedChapter;
  island: IsoIsland;
  /** Root, at the chapter's overview position. Does not bob — the hit area stays put. */
  container: Container;
  /** Everything that bobs: island, building, props, glow. */
  body: Container;
  glow: Sprite;
  building: BuildingRenderer | null;
  propViews: PropView[];
  target: number;
  hover: number;
  bobRate: number;
  bobPhase: number;
  /** Marker-local y of whatever stands tallest — island, building, or landmark. */
  visualTop: number;
}

export class OverviewLayer {
  readonly backdrop = new Container();
  readonly field = new Container();
  /** Screen space, in front of the camera: the vignette, and nothing else. */
  readonly overlay = new Container();

  private readonly gradient = new Sprite();
  private readonly vignette = new Sprite();
  /** Purely scenic: far islands and drifting rocks, behind every real world. */
  private readonly farField = new Container();
  private readonly cloudLayers: { sprite: TilingSprite; speed: number }[] = [];
  private readonly pathGraphics = new Graphics();

  private readonly markers = new Map<string, Marker>();
  private readonly props = new PropFactory({ seed: 0x2a1f });
  /** For the five chapters with no dedicated renderer — a small quiet silhouette. */
  private readonly landmarkArt = new LandmarkFactory();
  private readonly cloudTextures: Texture[] = [];
  private readonly farTextures: Texture[] = [];
  private readonly farViews: {
    sprite: Sprite;
    baseY: number;
    rate: number;
    amount: number;
    phase: number;
  }[] = [];
  private glowTexture: Texture | null = null;

  private readonly onHover: ((id: string | null) => void) | undefined;
  private readonly onSelect: ((id: string) => void) | undefined;
  private readonly chapters: readonly ResolvedChapter[];
  private readonly motionScale: number;

  private pixelScaleValue: number;
  private viewport: Size;
  private elapsed = 0;
  private presence = 1;

  constructor(options: OverviewLayerOptions) {
    this.chapters = options.chapters;
    this.onHover = options.onHover;
    this.onSelect = options.onSelect;
    this.motionScale = Math.max(0, options.motionScale ?? 1);
    this.pixelScaleValue = Math.max(1, Math.round(options.pixelScale));
    this.viewport = { width: options.width, height: options.height };

    this.backdrop.label = "overview:backdrop";
    this.backdrop.eventMode = "none";
    this.field.label = "overview:field";
    this.field.eventMode = "static";

    this.overlay.label = "overview:overlay";
    this.overlay.eventMode = "none";

    this.gradient.eventMode = "none";
    this.gradient.texture = this.bakeGradient();
    this.backdrop.addChild(this.gradient);
    this.buildClouds();

    this.vignette.eventMode = "none";
    this.vignette.texture = this.bakeVignette();
    this.overlay.addChild(this.vignette);

    this.farField.label = "overview:far";
    this.farField.eventMode = "none";
    this.field.addChild(this.farField);

    this.pathGraphics.eventMode = "none";
    this.field.addChild(this.pathGraphics);

    this.build();
    this.resize(this.viewport);
  }

  // --- Commands ----------------------------------------------------------------

  setPresence(presence: number): void {
    this.presence = presence < 0 ? 0 : presence > 1 ? 1 : presence;
    const on = this.presence > 0.001;

    this.backdrop.visible = on;
    this.field.visible = on;
    this.overlay.visible = on;
    this.overlay.alpha = this.presence * VIGNETTE_ALPHA;
    this.field.eventMode = on ? "static" : "none";
    this.backdrop.alpha = this.presence;
    this.field.alpha = this.presence;
  }

  setHover(id: string, hover: number): void {
    const marker = this.markers.get(id);
    if (marker) marker.target = hover < 0 ? 0 : hover > 1 ? 1 : hover;
  }

  /**
   * The universe-space y of whatever stands tallest on this world — island,
   * building, or landmark. `World.chapterScreen` uses this to anchor a
   * world's label above the actual structure, not just above the island's
   * own (much shorter) silhouette.
   */
  topOf(id: string): number | null {
    const marker = this.markers.get(id);
    if (!marker) return null;
    return marker.chapter.overview.y + marker.visualTop * this.pixelScaleValue;
  }

  update(delta: number, _view: CameraView): void {
    if (delta <= 0) return;
    void _view;

    this.elapsed += delta * this.motionScale;

    if (this.motionScale > 0) {
      for (const { sprite, speed } of this.cloudLayers) {
        sprite.tilePosition.x -= speed * delta;
      }
    }

    if (this.motionScale > 0) {
      for (const far of this.farViews) {
        far.sprite.y = far.baseY + Math.sin(this.elapsed * far.rate + far.phase) * far.amount;
      }
    }

    const t = 1 - Math.exp(-DETAIL_SMOOTHING * delta);

    for (const marker of this.markers.values()) {
      const before = marker.hover;
      marker.hover = before + (marker.target - before) * t;
      if (Math.abs(marker.target - marker.hover) < 0.002) marker.hover = marker.target;
      // A standing glow, not a hover-only one: the tint is what separates an
      // island from the backdrop at all. Hover only deepens what is there.
      marker.glow.alpha = GLOW_REST + marker.hover * 0.34;

      if (this.motionScale > 0) {
        marker.body.y = Math.round(
          Math.sin(this.elapsed * marker.bobRate + marker.bobPhase) * BOB_PIXELS
        );
        marker.building?.tick(this.elapsed);
      }

      for (const view of marker.propViews) view.animate(this.elapsed);
    }
  }

  resize(size: Size, pixelScale: number = this.pixelScaleValue): void {
    if (size.width <= 0 || size.height <= 0) return;

    this.viewport = size;
    this.gradient.width = size.width;
    this.gradient.height = size.height;
    this.vignette.width = size.width;
    this.vignette.height = size.height;
    this.layoutClouds(size);

    const next = Math.max(1, Math.round(pixelScale));
    if (next !== this.pixelScaleValue) {
      this.pixelScaleValue = next;
      this.rebuild();
    }

    this.field.scale.set(this.pixelScaleValue);
  }

  destroy(): void {
    this.release();
    this.props.destroy();
    this.glowTexture?.destroy(true);
    this.glowTexture = null;
    for (const texture of this.cloudTextures) texture.destroy(true);
    this.cloudTextures.length = 0;
    for (const texture of this.farTextures) texture.destroy(true);
    this.farTextures.length = 0;
    this.gradient.texture?.destroy(true);
    this.vignette.texture?.destroy(true);
    this.backdrop.destroy({ children: true });
    this.overlay.destroy({ children: true });
    this.field.destroy({ children: true });
  }

  // --- Internal: backdrop --------------------------------------------------

  /** The vertical gradient: deep mauve overhead, peach, then pale cream. */
  private bakeGradient(): Texture {
    const h = 128;
    return toTexture(
      1,
      h,
      (pixels) => {
        const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
        const split = (c: number) => [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff];
        const stops = [split(VOID_TOP), split(VOID_MID), split(VOID_BOTTOM)];
        // The peach stop sits high, so the deep tone stays a band overhead
        // rather than a wash over the whole frame.
        const knee = 0.42;
        for (let y = 0; y < h; y++) {
          const t = y / (h - 1);
          const low = t < knee;
          const a = low ? stops[0] : stops[1];
          const b = low ? stops[1] : stops[2];
          const k = low ? t / knee : (t - knee) / (1 - knee);
          const o = y * 4;
          pixels[o] = lerp(a[0], b[0], k);
          pixels[o + 1] = lerp(a[1], b[1], k);
          pixels[o + 2] = lerp(a[2], b[2], k);
          pixels[o + 3] = 255;
        }
      },
      "Overview"
    );
  }

  /**
   * The frame's own edges, darkened. Baked small and stretched: it is a
   * falloff, not a picture, and 64x64 of dithered alpha survives the stretch
   * without banding the way a smooth ramp would.
   */
  private bakeVignette(): Texture {
    const n = 64;
    const color = [(VIGNETTE_COLOR >> 16) & 0xff, (VIGNETTE_COLOR >> 8) & 0xff, VIGNETTE_COLOR & 0xff];

    return toTexture(
      n,
      n,
      (pixels) => {
        for (let y = 0; y < n; y++) {
          const dy = (y + 0.5) / n - 0.5;
          for (let x = 0; x < n; x++) {
            const dx = (x + 0.5) / n - 0.5;
            // Elliptical, and wider than it is tall — the corners of a wide
            // frame are further from the middle than its top edge is.
            const d = Math.sqrt((dx / 0.62) ** 2 + (dy / 0.55) ** 2);
            const a = Math.max(0, Math.min(1, (d - 0.55) / 0.7)) ** 1.6;
            const o = (y * n + x) * 4;
            pixels[o] = color[0];
            pixels[o + 1] = color[1];
            pixels[o + 2] = color[2];
            pixels[o + 3] = Math.round(a * 255);
          }
        }
      },
      "Overview"
    );
  }

  /** A soft, multi-lobed cloud puff, tileable enough at low alpha. */
  private bakeCloudTile(seed: number): Texture {
    const rand = createRandom(seed);
    const w = 220;
    const h = 56;
    const alpha = new Float32Array(w * h);

    const lobes = rangeInt(rand, 2, 3);
    for (let i = 0; i < lobes; i++) {
      const cx = range(rand, w * 0.2, w * 0.8);
      const cy = range(rand, h * 0.4, h * 0.65);
      const rx = range(rand, w * 0.14, w * 0.22);
      const ry = range(rand, h * 0.28, h * 0.4);

      for (let y = 0; y < h; y++) {
        const dy = (y - cy) / ry;
        for (let x = 0; x < w; x++) {
          const dx = (x - cx) / rx;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > 1.2) continue;
          alpha[y * w + x] = Math.max(alpha[y * w + x], Math.max(0, 1 - d / 1.2));
        }
      }
    }

    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (alpha[i] <= 0) continue;
        mask[i] = ditherAlpha(alpha[i], 5, x, y);
      }
    }

    return toTexture(
      w,
      h,
      (pixels) => {
        for (let i = 0; i < mask.length; i++) {
          const o = i * 4;
          pixels[o] = 255;
          pixels[o + 1] = 255;
          pixels[o + 2] = 255;
          pixels[o + 3] = mask[i];
        }
      },
      "Overview"
    );
  }

  private buildClouds(): void {
    // Three bands: further is smaller, fainter and slower — the one cheap cue
    // that reads as depth without a single extra draw call's worth of logic.
    // Each gets its own tile so the three don't read as one pattern at three
    // scales.
    // Tinted, not white. Against the old flat cream these were white on white
    // and read as nothing at all; each band now carries a little of the sky it
    // sits in — mauve high up, warm peach lower down — so they stay
    // low-contrast without disappearing.
    const bands = [
      { seed: 0x9911, y: 0.06, alpha: 0.3, scale: 0.75, speed: 1.6, tint: 0xe6d6ea },
      { seed: 0xa42c, y: 0.26, alpha: 0.4, scale: 1.1, speed: 3.2, tint: 0xfaeaf0 },
      { seed: 0xb0e7, y: 0.5, alpha: 0.34, scale: 1.5, speed: 5.4, tint: 0xfff2e0 },
    ];

    for (const band of bands) {
      const texture = this.bakeCloudTile(band.seed);
      this.cloudTextures.push(texture);
      const sprite = new TilingSprite({ texture, width: 1, height: 1 });
      sprite.eventMode = "none";
      sprite.alpha = band.alpha;
      sprite.tint = band.tint;
      (sprite as unknown as { __band: typeof band }).__band = band;
      this.backdrop.addChild(sprite);
      this.cloudLayers.push({ sprite, speed: band.speed });
    }
  }

  private layoutClouds(size: Size): void {
    for (const { sprite } of this.cloudLayers) {
      const band = (sprite as unknown as { __band: { y: number; scale: number } }).__band;
      // Wider than the viewport by half, so the band keeps drifting past the
      // edge rather than visibly wrapping inside the frame.
      sprite.width = size.width;
      sprite.height = size.height * 0.34;
      sprite.y = size.height * band.y;
      sprite.tileScale.set(band.scale);
    }
  }

  // --- Internal: islands ----------------------------------------------------

  private rebuild(): void {
    const state = new Map<string, number>();
    for (const [id, marker] of this.markers) state.set(id, marker.hover);

    this.release();
    this.build();

    for (const [id, hover] of state) {
      const marker = this.markers.get(id);
      if (!marker) continue;
      marker.hover = hover;
      marker.target = hover;
    }
  }

  private build(): void {
    const scale = this.pixelScaleValue;
    if (!this.glowTexture) this.glowTexture = this.bakeGlow(48);

    this.buildFarField(scale);

    // Paths first, so the islands sit over them.
    this.pathGraphics.clear();
    this.drawPaths(scale);

    for (const chapter of this.chapters) {
      const theme = ISO_THEME[chapter.id] ?? DEFAULT_ISO_THEME;
      const size = Math.max(10, Math.round(chapter.overview.radius / scale));
      const island = generateIsoIsland({
        size,
        topPalette: theme.topPalette,
        rockPalette: theme.rockPalette,
        edgeSeed: seedOf(chapter.id),
        undersideLength: Math.max(8, Math.round(theme.undersideLength / scale)),
      });

      const body = new Container();
      body.label = "island:body";
      body.eventMode = "none";

      const glow = new Sprite(this.glowTexture);
      glow.anchor.set(0.5);
      glow.tint = theme.topPalette[0];
      glow.alpha = GLOW_REST;
      glow.eventMode = "none";
      glow.scale.set((island.width / 96) * 2.1);
      body.addChild(glow);

      const islandSprite = new Sprite(island.texture);
      islandSprite.x = -island.topCenter.x;
      islandSprite.y = -island.topCenter.y;
      islandSprite.eventMode = "none";
      body.addChild(islandSprite);

      const building = this.plantBuilding(theme, island, body);
      const landmarkTop = building ? null : this.plantLandmark(chapter, island, body);
      const propViews = this.scatterProps(chapter, island, body);

      const container = new Container();
      container.label = `chapter:${chapter.id}`;
      container.x = Math.round(chapter.overview.x / scale);
      container.y = Math.round(chapter.overview.y / scale);
      container.addChild(body);

      // The hit area has to reach up over whatever stands on the island, not
      // just the island's own texture bounds — a five-storey tower is most of
      // what you would actually try to point at.
      const structureTop = building
        ? building.container.y - building.height * building.container.scale.y
        : (landmarkTop ?? -island.topCenter.y);
      const top = Math.min(-island.topCenter.y, structureTop);

      const hit = new Sprite(Texture.EMPTY);
      hit.eventMode = "static";
      hit.cursor = "pointer";
      hit.hitArea = new Rectangle(
        -island.topCenter.x,
        top,
        island.width,
        island.height - island.topCenter.y - top
      );
      hit.on("pointerover", () => this.onHover?.(chapter.id));
      hit.on("pointerout", () => this.onHover?.(null));
      hit.on("pointertap", () => this.onSelect?.(chapter.id));
      container.addChild(hit);

      this.field.addChild(container);
      this.markers.set(chapter.id, {
        chapter,
        island,
        container,
        body,
        glow,
        building,
        propViews,
        target: 0,
        hover: 0,
        bobRate:
          (Math.PI * 2) /
          (BOB_PERIOD[0] + (chapter.overview.x % (BOB_PERIOD[1] - BOB_PERIOD[0]))),
        bobPhase: (chapter.overview.y % 100) / 16,
        visualTop: top,
      });
    }
  }

  /**
   * Distance, faked the cheapest way there is: a handful of small islands and
   * loose rocks, far too faint and far too small to be mistaken for a world
   * you could visit, drifting on their own slow cycles. They take no pointer
   * events and carry nothing — they exist so the space between the nine real
   * worlds is a place rather than a gap.
   */
  private buildFarField(scale: number): void {
    for (const child of this.farField.removeChildren()) child.destroy();
    this.farViews.length = 0;
    for (const texture of this.farTextures) texture.destroy(true);
    this.farTextures.length = 0;

    // Placed against the cluster's own extent, so adding a tenth world moves
    // the far pieces with it instead of stranding them.
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    for (const chapter of this.chapters) {
      left = Math.min(left, chapter.overview.x);
      right = Math.max(right, chapter.overview.x);
      top = Math.min(top, chapter.overview.y);
      bottom = Math.max(bottom, chapter.overview.y);
    }
    if (!Number.isFinite(left)) return;

    const w = right - left;
    const h = bottom - top;
    const at = (u: number, v: number) => ({ x: left + w * u, y: top + h * v });

    // Fractions of the cluster, not pixels — the composition survives a
    // re-spread of the real islands.
    const specs = [
      { at: at(0.08, 0.06), size: 22, alpha: 0.3, tone: 0xb9a3c4, rock: 0x8d7a99 },
      { at: at(0.72, 0.02), size: 17, alpha: 0.24, tone: 0xc7b0c9, rock: 0x9a86a0 },
      { at: at(0.5, 1.05), size: 26, alpha: 0.22, tone: 0xd9bda6, rock: 0xa88f7c },
      { at: at(0.95, 0.84), size: 14, alpha: 0.2, tone: 0xd3bcb4, rock: 0xa08c88 },
      // The loose rocks: the same generator, small enough to read as debris.
      { at: at(0.3, 0.34), size: 6, alpha: 0.3, tone: 0xbca6b6, rock: 0x8f7d8c },
      { at: at(0.63, 0.62), size: 5, alpha: 0.26, tone: 0xc6ae9f, rock: 0x977f74 },
      { at: at(0.16, 0.78), size: 7, alpha: 0.24, tone: 0xbfa9b4, rock: 0x8c7a86 },
      { at: at(0.88, 0.34), size: 5, alpha: 0.22, tone: 0xd2b6a4, rock: 0x9c8478 },
    ];

    const rand = createRandom(0x4f1c);
    for (const spec of specs) {
      const island = generateIsoIsland({
        size: Math.max(4, Math.round(spec.size)),
        // Two tones, flattened towards the sky: at this alpha the palette is
        // reading as haze, and four steps of contrast would fight the near
        // islands for attention.
        topPalette: [spec.tone, spec.tone, spec.rock, spec.rock],
        rockPalette: [spec.rock, spec.rock, spec.rock, spec.rock],
        edgeSeed: rangeInt(rand, 1, 0xffff),
        undersideLength: Math.max(4, Math.round(spec.size * 0.7)),
      });
      this.farTextures.push(island.texture);

      const sprite = new Sprite(island.texture);
      sprite.eventMode = "none";
      sprite.alpha = spec.alpha;
      sprite.anchor.set(0.5);
      sprite.x = Math.round(spec.at.x / scale);
      const baseY = Math.round(spec.at.y / scale);
      sprite.y = baseY;
      this.farField.addChild(sprite);

      this.farViews.push({
        sprite,
        baseY,
        rate: range(rand, 0.12, 0.3),
        amount: range(rand, 1.5, 3.5),
        phase: range(rand, 0, Math.PI * 2),
      });
    }
  }

  /** Stand this chapter's own detailed landmark on its island, unscaled art unchanged. */
  private plantBuilding(
    theme: IsoThemeEntry,
    island: IsoIsland,
    body: Container
  ): BuildingRenderer | null {
    if (!theme.building) return null;

    const renderer = theme.building();
    renderer.build();

    // Width first, always — the island exists before anything stands on it,
    // and a building wider than its own top face reads as floating beside the
    // island rather than standing on it. The height factor only ever shrinks
    // this further, aiming for a *presence* similar across every building
    // (a raw-pixel scale makes a squat campus and a five-storey tower read as
    // wildly different sizes even on equal islands) — it never grows a
    // building past the width fit to get there.
    const topWidth = island.topBounds.right - island.topBounds.left;
    const widthFitScale = (topWidth * BUILDING_WIDTH_FIT) / renderer.width;
    const heightTargetScale = (topWidth * (theme.heightFactor ?? 1.05)) / renderer.height;
    const drawScale = Math.max(0.1, Math.min(widthFitScale, heightTargetScale));

    const col = Math.round(island.topCenter.x);
    const footY = island.surface[col] >= 0 ? island.surface[col] : island.topBounds.top;

    renderer.container.scale.set(drawScale);
    renderer.container.x = -(renderer.width * drawScale) / 2;
    renderer.container.y = footY - island.topCenter.y;
    body.addChild(renderer.container);

    const boost = theme.lightBoost ?? 1;
    renderer.applyLighting({
      ...HUB_BUILDING_LIGHT,
      ambientIntensity: HUB_BUILDING_LIGHT.ambientIntensity * boost,
    });

    return renderer;
  }

  /**
   * The quiet fallback for the five chapters with no dedicated renderer yet —
   * the same small silhouette `identity.landmarks` was already carrying, tinted
   * to the island's own rock tones instead of drawn plain.
   */
  private plantLandmark(
    chapter: ResolvedChapter,
    island: IsoIsland,
    body: Container
  ): number | null {
    const spec = chapter.identity.landmarks[0];
    if (!spec) return null;

    const art = this.landmarkArt.textures(spec.bitmap);
    if (!art) return null;

    const theme = ISO_THEME[chapter.id] ?? DEFAULT_ISO_THEME;
    const drawScale = Math.max(1, Math.round((island.topBounds.right - island.topBounds.left) / (art.width * 3)));

    // One tone lighter than the shape's own shading calls for, and further
    // lifted by `lightBoost` where a bitmap is mostly its `#` (shadow) cells —
    // the lighthouse most of all. Unlit, these read as near-black silhouettes
    // against the hub's bright sky; there is no clock here to light them
    // properly, so the flat lift stands in for it.
    const boost = theme.lightBoost ?? 1;
    const make = (texture: Texture, tint: number) => {
      const sprite = new Sprite(texture);
      sprite.tint = lift(tint, boost);
      sprite.eventMode = "none";
      sprite.scale.set(drawScale);
      return sprite;
    };

    const container = new Container();
    container.eventMode = "none";
    container.addChild(
      make(art.base, theme.rockPalette[0]),
      make(art.dark, theme.rockPalette[2]),
      make(art.light, theme.topPalette[0])
    );

    const col = Math.round(island.topCenter.x);
    const footY = island.surface[col] >= 0 ? island.surface[col] : island.topBounds.top;
    container.x = -(art.width * drawScale) / 2;
    container.y = footY - island.topCenter.y - art.height * drawScale;
    body.addChild(container);
    return container.y;
  }

  /** Scatter this chapter's planting across its island's top face. */
  private scatterProps(chapter: ResolvedChapter, island: IsoIsland, body: Container): PropView[] {
    const scheme = PLANTING[chapter.identity.terrain] ?? DEFAULT_PLANTING;
    const rand = createRandom(seedOf(chapter.id) ^ 0x5bd1);
    const count = rangeInt(rand, scheme.count[0], scheme.count[1]);
    const views: PropView[] = [];

    const left = island.topBounds.left;
    const right = island.topBounds.right;
    if (right <= left) return views;

    for (let i = 0; i < count; i++) {
      const kind = scheme.kinds[rangeInt(rand, 0, scheme.kinds.length - 1)];
      const x = Math.max(left + 1, Math.min(right - 1, rangeInt(rand, left, right)));
      const surfaceY = island.surface[x];
      if (surfaceY < 0) continue;

      const variant = rangeInt(rand, 0, 3);
      const textures = this.props.textures(kind, variant);
      const view = this.props.acquire();
      const flip = rand() < 0.5;

      view.bind(
        {
          kind,
          variant,
          x: x - island.topCenter.x - (textures.width >> 1),
          y: surfaceY - island.topCenter.y,
          band: "backVerge",
          dy: 0,
          flip,
          scale: 1,
          motion: "sway",
          phase: range(rand, 0, Math.PI * 2),
          swayRate: range(rand, 0.3, 0.5),
          swayAmount: 1,
        },
        textures,
        null
      );

      const tones = KIND_TONES[kind];
      const light =
        kind === "flower" ? PROP_MATERIALS[PETALS[i % PETALS.length]] : PROP_MATERIALS[tones.light];
      view.setTones(PROP_MATERIALS[tones.base], light, PROP_MATERIALS[tones.dark]);

      body.addChild(view.container);
      views.push(view);
    }

    return views;
  }

  // --- Internal: paths -------------------------------------------------------

  /** Curved dashed lines through the chapters, in chronological order. */
  private drawPaths(scale: number): void {
    const points = PATH_ORDER.map((id) => this.chapters.find((c) => c.id === id)).filter(
      (c): c is ResolvedChapter => !!c
    );

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i].overview;
      const b = points[i + 1].overview;
      this.strokeDashedCurve(
        { x: a.x / scale, y: a.y / scale },
        { x: b.x / scale, y: b.y / scale },
        i % 2 === 0 ? 1 : -1
      );
    }

    // Dark against the light backdrop, and heavy enough to actually read at
    // hub scale — the first pass was both too pale and too thin to survive
    // being drawn under nine islands.
    this.pathGraphics.stroke({ width: 3, color: 0x4a3a2a, alpha: 0.6 });
  }

  private strokeDashedCurve(
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    bend: number
  ): void {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / dist;
    const ny = dx / dist;
    const bow = dist * 0.16 * bend;

    const cx = (p0.x + p1.x) / 2 + nx * bow;
    const cy = (p0.y + p1.y) / 2 + ny * bow;

    const steps = Math.max(8, Math.round(dist / 10));
    const dash = 9;
    const gap = 6;
    let travelled = 0;
    let drawing = true;
    let prev = p0;

    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const mt = 1 - t;
      const x = mt * mt * p0.x + 2 * mt * t * cx + t * t * p1.x;
      const y = mt * mt * p0.y + 2 * mt * t * cy + t * t * p1.y;
      const segLen = Math.hypot(x - prev.x, y - prev.y);

      travelled += segLen;
      if (drawing) {
        this.pathGraphics.moveTo(prev.x, prev.y).lineTo(x, y);
      }
      if (travelled >= (drawing ? dash : gap)) {
        travelled = 0;
        drawing = !drawing;
      }

      prev = { x, y };
    }
  }

  // --- Internal: teardown ------------------------------------------------------

  private release(): void {
    for (const marker of this.markers.values()) {
      for (const view of marker.propViews) this.props.release(view);
      marker.building?.destroy();
      marker.container.removeAllListeners();
      marker.container.destroy({ children: true });
      marker.island.texture.destroy(true);
    }
    this.markers.clear();
  }

  private bakeGlow(radius: number): Texture {
    const r = Math.max(2, Math.round(radius));
    const size = r * 2;
    const mask = new Uint8Array(size * size);

    for (let y = 0; y < size; y++) {
      const dy = (y + 0.5 - r) / r;
      for (let x = 0; x < size; x++) {
        const dx = (x + 0.5 - r) / r;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) continue;
        mask[y * size + x] = ditherAlpha((1 - d) ** 2, 5, x, y);
      }
    }

    return toTexture(
      size,
      size,
      (pixels) => {
        for (let i = 0; i < mask.length; i++) {
          const o = i * 4;
          pixels[o] = 255;
          pixels[o + 1] = 255;
          pixels[o + 2] = 255;
          pixels[o + 3] = mask[i];
        }
      },
      "Overview"
    );
  }
}

/** A stable number from a chapter id, so an island is the same island twice. */
function seedOf(id: string): number {
  let seed = 0x9e37;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  return seed;
}

/** Multiply a colour's channels by `factor`, clamped. The cheapest brighten. */
function lift(color: number, factor: number): number {
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
  const r = clamp(((color >> 16) & 0xff) * factor);
  const g = clamp(((color >> 8) & 0xff) * factor);
  const b = clamp((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}
