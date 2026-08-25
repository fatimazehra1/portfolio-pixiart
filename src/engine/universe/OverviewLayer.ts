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

const VOID_TOP = 0xcdb7d6; // dusty lavender
const VOID_BOTTOM = 0xf6dcc0; // pale peach

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
 * Width beyond which a building would visibly overrun its own island.
 *
 * Loose on purpose: Vaultsys (156×88, aspect 1.77) needs ~1.95x to reach its
 * own height target, and a tighter cap was silently short-circuiting it back
 * down to a runt before that target was ever reached. Only Aptech's genuinely
 * wide campus (aspect 2.5) still gets capped, which is correct — it is
 * supposed to read as low and wide.
 */
const BUILDING_WIDTH_CAP = 2.0;

/** Chronological order the dashed paths connect, exactly as authored. */
const PATH_ORDER = [
  "aptech",
  "workshop",
  "ideas",
  "freelance",
  "planet01",
  "vaultsys",
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
}

export class OverviewLayer {
  readonly backdrop = new Container();
  readonly field = new Container();

  private readonly gradient = new Sprite();
  private readonly cloudLayers: { sprite: TilingSprite; speed: number }[] = [];
  private readonly pathGraphics = new Graphics();

  private readonly markers = new Map<string, Marker>();
  private readonly props = new PropFactory({ seed: 0x2a1f });
  /** For the five chapters with no dedicated renderer — a small quiet silhouette. */
  private readonly landmarkArt = new LandmarkFactory();
  private readonly cloudTextures: Texture[] = [];
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

    this.gradient.eventMode = "none";
    this.backdrop.addChild(this.gradient);
    this.buildClouds();

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
    this.field.eventMode = on ? "static" : "none";
    this.backdrop.alpha = this.presence;
    this.field.alpha = this.presence;
  }

  setHover(id: string, hover: number): void {
    const marker = this.markers.get(id);
    if (marker) marker.target = hover < 0 ? 0 : hover > 1 ? 1 : hover;
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

    const t = 1 - Math.exp(-DETAIL_SMOOTHING * delta);

    for (const marker of this.markers.values()) {
      const before = marker.hover;
      marker.hover = before + (marker.target - before) * t;
      if (Math.abs(marker.target - marker.hover) < 0.002) marker.hover = marker.target;
      marker.glow.alpha = marker.hover * 0.55;

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
    this.gradient.texture?.destroy(true);
    this.backdrop.destroy({ children: true });
    this.field.destroy({ children: true });
  }

  // --- Internal: backdrop --------------------------------------------------

  /** A warm vertical gradient — dusty lavender at the top, pale peach below. */
  private bakeGradient(): Texture {
    const h = 128;
    return toTexture(
      1,
      h,
      (pixels) => {
        const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
        const top = [(VOID_TOP >> 16) & 0xff, (VOID_TOP >> 8) & 0xff, VOID_TOP & 0xff];
        const bot = [(VOID_BOTTOM >> 16) & 0xff, (VOID_BOTTOM >> 8) & 0xff, VOID_BOTTOM & 0xff];
        for (let y = 0; y < h; y++) {
          const t = y / (h - 1);
          const o = y * 4;
          pixels[o] = lerp(top[0], bot[0], t);
          pixels[o + 1] = lerp(top[1], bot[1], t);
          pixels[o + 2] = lerp(top[2], bot[2], t);
          pixels[o + 3] = 255;
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
    const bands = [
      { seed: 0x9911, y: 0.14, alpha: 0.22, scale: 0.85, speed: 2.4 },
      { seed: 0xa42c, y: 0.28, alpha: 0.32, scale: 1.15, speed: 4.1 },
      { seed: 0xb0e7, y: 0.44, alpha: 0.26, scale: 1.4, speed: 6.3 },
    ];

    for (const band of bands) {
      const texture = this.bakeCloudTile(band.seed);
      this.cloudTextures.push(texture);
      const sprite = new TilingSprite({ texture, width: 1, height: 1 });
      sprite.eventMode = "none";
      sprite.alpha = band.alpha;
      sprite.tint = 0xffffff;
      (sprite as unknown as { __band: typeof band }).__band = band;
      this.backdrop.addChild(sprite);
      this.cloudLayers.push({ sprite, speed: band.speed });
    }
  }

  private layoutClouds(size: Size): void {
    for (const { sprite } of this.cloudLayers) {
      const band = (sprite as unknown as { __band: { y: number; scale: number } }).__band;
      sprite.width = size.width;
      sprite.height = size.height * 0.3;
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
      glow.alpha = 0;
      glow.eventMode = "none";
      glow.scale.set((island.width / 96) * 1.3);
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

    // Scaled to a target *height*, not width — a raw-pixel scale makes a
    // squat campus (156×62) and a five-storey tower (108×168) read as wildly
    // different presences even on equal-sized islands. The width cap is what
    // stops a short, wide building (Aptech) hitting that height target by
    // overrunning its island sideways instead.
    const topWidth = island.topBounds.right - island.topBounds.left;
    const heightScale = (topWidth * (theme.heightFactor ?? 1.05)) / renderer.height;
    const widthCapScale = (topWidth * BUILDING_WIDTH_CAP) / renderer.width;
    const drawScale = Math.max(0.1, Math.min(heightScale, widthCapScale));

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
