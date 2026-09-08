import { Container, Graphics, Rectangle, Sprite, Texture, TilingSprite } from "pixi.js";
import { createRandom, ditherAlpha, range, rangeInt, toTexture } from "../shared";
import { generateIsoIsland } from "./IsoIslandFactory";
import type { IsoIsland } from "./IsoIslandFactory";
import { DEFAULT_ISO_THEME, ISO_THEME } from "./IsoTheme";
import type { DressingEntry, IsoThemeEntry } from "./IsoTheme";
import { LandmarkFactory } from "./LandmarkFactory";
import { SiteFactory } from "./SiteFactory";
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
 *
 * Set so the top face is always at least 1.6x the building's own width: at the
 * old 0.8 a building filled its whole surface, and an island you cannot see
 * any ground on is a plinth, not a place.
 */
const BUILDING_WIDTH_FIT = 0.625; // top face is at least 1.6x the building it carries

/**
 * Grounding — what makes a building stand on its island rather than sit in
 * front of it.
 *
 * Two cues, both of them made of things this world already draws. Planting
 * along the foot, so the join is crossed by tufts and stones instead of being
 * a clean horizontal line; and a small pull of the building's own materials
 * toward its island's surface tones, so the two share a colour family.
 *
 * No shadow, and nothing soft. A contact shadow is a gradient, and a gradient
 * over pixel art is the fastest way to give away that the pixel art is a
 * costume (CLAUDE.md §Pixel Art Rules) — dithering it does not save it at
 * this size, it only turns a soft blob into a hard one.
 */
const BASE_PROPS: readonly PropKind[] = ["tallGrass", "rock", "tallGrass", "bush"];
const BASE_PROP_COUNT = [2, 4] as const;
/** How far a building's materials are pulled toward its island's surface tone. */
const GROUND_BLEND = 0.16;

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
  campus: { kinds: ["tree", "bush", "flower", "tallGrass"], count: [2, 3] },
  city: { kinds: ["rock", "bush", "tallGrass"], count: [1, 2] },
  vault: { kinds: ["rock", "rock", "bush"], count: [1, 2] },
  forge: { kinds: ["tree", "rock", "bush", "tallGrass"], count: [2, 3] },
  shore: { kinds: ["rock", "driftwood", "tallGrass"], count: [1, 2] },
  spire: { kinds: ["bush", "tallGrass"], count: [1, 2] },
  workshop: { kinds: ["rock", "bush"], count: [1, 2] },
  meadow: { kinds: ["flower", "tallGrass", "bush"], count: [2, 3] },
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

/** Where whatever stands on an island meets its top face. */
interface Foot {
  /** Marker-local y of the top face under the island's centre column. */
  y: number;
  /** The standing thing's own drawn width. Zero until something is planted. */
  width: number;
  /** Marker-local x of the top face's midpoint — where a building is centred. */
  centerX: number;
  /** The island's top-face width — the ceiling on how far the planting spreads. */
  topWidth: number;
}

export class OverviewLayer {
  readonly backdrop = new Container();
  readonly field = new Container();
  /** Screen space, in front of the camera: the vignette, and nothing else. */
  readonly overlay = new Container();

  private readonly gradient = new Sprite();
  private readonly vignette = new Sprite();
  /** Purely scenic: far islands, behind every real world. */
  private readonly farField = new Container();
  private readonly cloudLayers: { sprite: TilingSprite; speed: number }[] = [];
  private readonly pathGraphics = new Graphics();

  private readonly markers = new Map<string, Marker>();
  private readonly props = new PropFactory({ seed: 0x2a1f });
  /** For any chapter with no dedicated renderer — a small quiet silhouette. */
  private readonly landmarkArt = new LandmarkFactory();
  /** Crates, cones, hedges, bollards: the ground dressing the shore does not grow. */
  private readonly siteArt = new SiteFactory();
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
    this.siteArt.destroy();
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
      // `size` is divided by the elongation so `overview.radius` keeps meaning
      // "half the island's horizontal extent" for every chapter — otherwise a
      // long, narrow island would quietly overrun the spacing and the bounds
      // the whole cluster is derived from.
      const elongation = theme.elongation ?? 1;
      const size = Math.max(10, Math.round(chapter.overview.radius / scale / elongation));
      const island = generateIsoIsland({
        size,
        topPalette: theme.topPalette,
        rockPalette: theme.rockPalette,
        edgeSeed: seedOf(chapter.id),
        undersideLength: Math.max(8, Math.round(theme.undersideLength / scale)),
        elongation,
        aspect: theme.aspect,
        roughness: theme.roughness,
        wallRatio: theme.wallRatio,
        undersideTaper: theme.undersideTaper,
        secondaryRock: theme.secondaryRock,
        strata: theme.rockStrata,
        // Scaled with the grid like every other vertical measure here, and
        // floored at one pixel: a step rounded away to nothing is a flat
        // island, which is a quieter failure than a step half a pixel tall.
        steps: theme.steps?.map((step) => ({
          at: step.at,
          rise: Math.max(1, Math.round(step.rise * (3 / scale))),
        })),
        vines: theme.vines,
        vineTones: theme.vineTones,
        ground: theme.ground,
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

      // Depth order inside an island is by baseline, not by insertion: a crate
      // in front of the building has to draw over it and a hedge behind it has
      // to draw under it, and the same loop places both.
      body.sortableChildren = true;
      glow.zIndex = -2;
      islandSprite.zIndex = -1;

      const foot = footOf(island);
      const building = this.plantBuilding(theme, island, foot, body);
      const landmarkTop = building ? null : this.plantLandmark(chapter, island, foot, body);
      const propViews = this.scatterProps(chapter, island, foot, body);
      // Last of all, so the planting crosses in front of the building's lowest
      // rows rather than stopping politely at them.
      propViews.push(...this.scatterBase(chapter, island, foot, body));
      propViews.push(...this.dressIsland(chapter, theme, island, foot, body));

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
   * Distance, faked the cheapest way there is: a handful of small islands far
   * too faint and far too small to be mistaken for a world you could visit,
   * drifting on their own slow cycles. They take no pointer events and carry
   * nothing — they exist so the space between the nine real worlds is a place
   * rather than a gap.
   *
   * The four loose *rocks* that used to sit alongside them are gone. At five
   * to seven pixels with a two-tone palette they never resolved into anything
   * — they read as grey smudges dropped in the void, which is precisely what a
   * stray shadow would look like and exactly the wrong thing to have floating
   * near an island.
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
    foot: Foot,
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

    renderer.container.scale.set(drawScale);
    renderer.container.x = foot.centerX - (renderer.width * drawScale) / 2;
    // Plus whatever slack the renderer left under its own baseline: the sprite
    // is anchored to the bitmap's bottom edge, and on the hub a bare isometric
    // top face shows the difference as a building hovering over its island.
    renderer.container.y = foot.y + renderer.baselineGap * drawScale;
    renderer.container.zIndex = island.topCenter.y + foot.y;
    body.addChild(renderer.container);

    const boost = theme.lightBoost ?? 1;
    renderer.applyLighting({
      ...HUB_BUILDING_LIGHT,
      ambientIntensity: HUB_BUILDING_LIGHT.ambientIntensity * boost,
    });
    // Each of these was drawn for its own side-on scene, in its own palette.
    // On the hub they stand on ground that shares none of it, which is half of
    // why they read as pasted on. A nudge toward the island's own surface tone
    // is enough — far enough to share a family, not far enough to repaint.
    renderer.blendToward(theme.topPalette[1], GROUND_BLEND);

    foot.width = renderer.width * drawScale;
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
    foot: Foot,
    body: Container
  ): number | null {
    const spec = chapter.identity.landmarks[0];
    if (!spec) return null;

    const art = this.landmarkArt.textures(spec.bitmap);
    if (!art) return null;

    const theme = ISO_THEME[chapter.id] ?? DEFAULT_ISO_THEME;
    // A whole-number scale, as always, aimed at the same 1.6x top face every
    // *building* gets rather than at half of it. Aiming smaller is what left
    // the five landmark islands reading as blobs: at a third of the top face a
    // shed rounded down to scale 2 and lost its own doorway. Floored rather
    // than rounded, so the fit is a floor and never a ceiling.
    const topWidth = island.topBounds.right - island.topBounds.left;
    const drawScale = Math.max(1, Math.floor((topWidth * BUILDING_WIDTH_FIT) / art.width));

    // One tone lighter than the shape's own shading calls for, and further
    // lifted by `lightBoost` where a bitmap is mostly its `#` (shadow) cells —
    // the lighthouse most of all. Unlit, these read as near-black silhouettes
    // against the hub's bright sky; there is no clock here to light them
    // properly, so the flat lift stands in for it.
    const boost = theme.lightBoost ?? 1;
    const make = (texture: Texture, tint: number, ownBoost = boost) => {
      const sprite = new Sprite(texture);
      sprite.tint = lift(tint, ownBoost);
      sprite.eventMode = "none";
      sprite.scale.set(drawScale);
      return sprite;
    };

    const container = new Container();
    container.eventMode = "none";
    container.addChild(
      // Outline first, in the island's darkest rock and deliberately *not*
      // lifted — the shed and the tent are earth-toned things standing on
      // earth, and without a hard edge between them the silhouette the whole
      // drawing is carrying simply is not there at hub scale.
      make(art.outline, theme.rockPalette[3], 1),
      make(art.base, theme.rockPalette[0]),
      make(art.dark, theme.rockPalette[2]),
      make(art.light, theme.topPalette[0]),
      // The lit cells: the chapter's own accent, flat and at full strength.
      // A window that reads as lit is worth more here than three more rows of
      // architecture, and it is the only warm thing on a cool island.
      make(art.lit, chapter.identity.accent, 1)
    );

    // Centred on the drawing's *anchor* column rather than on its bitmap
    // width: the lighthouse carries a beam out to one side, and centring the
    // bounding box put the tower itself off the edge of the island while the
    // beam sat over the middle of it.
    container.x = foot.centerX - art.anchorX * drawScale;
    container.y = foot.y - art.height * drawScale;
    container.zIndex = island.topCenter.y + foot.y;
    body.addChild(container);

    foot.width = art.width * drawScale;
    return container.y;
  }

  /**
   * Everything on the ground that is not the building.
   *
   * # Arrangement is the whole job
   * Nine islands each carrying one building and a ring of evenly spaced bushes
   * read as nine plots, not nine places. What separates a used yard from a
   * decorated one is where things end up: gathered at the door, strung along
   * the way in, dropped out on the open ground, and banked up at the edges.
   * `IsoTheme.dressing` says what and which of those four; this decides where
   * inside them, against the island's own per-column footprint so nothing ever
   * stands off the land.
   *
   * # Two sources, one loop
   * A name is looked up in `SiteFactory` first and the shore's `PropFactory`
   * second. Crates and cones come from the former because the coast has no
   * reason to grow them; bushes, benches and lamps come from the latter
   * because it already does, and a second bush drawn to a second rule is how
   * a scene starts looking assembled from parts.
   */
  private dressIsland(
    chapter: ResolvedChapter,
    theme: IsoThemeEntry,
    island: IsoIsland,
    foot: Foot,
    body: Container
  ): PropView[] {
    const views: PropView[] = [];
    const plan = theme.dressing;
    if (!plan || plan.length === 0) return views;

    const rand = createRandom(seedOf(chapter.id) ^ 0x2d97);
    const { left, right } = island.topBounds;
    if (right <= left) return views;

    const axis = island.topCenter.x + foot.centerX;
    const footHalf = Math.max(6, foot.width / 2);
    const pathHalf = (theme.ground?.path ?? 0) / 2;
    const accent = chapter.identity.accent;

    /**
     * A column and a depth for one piece, or null if the land says no.
     *
     * `half` is the piece's own half-width, and every column it would cover is
     * tested rather than only the one it stands on. Testing the centre alone
     * is what left crates hanging over the rim with a third of themselves in
     * open sky — at the ends of a cap two pixels deep, most of a sprite is
     * outside the column it is standing in.
     */
    const place = (
      entry: DressingEntry,
      index: number,
      half: number,
      tall: boolean
    ): { x: number; y: number } | null => {
      const onLand = (column: number, y: number): boolean => {
        for (let c = column - half; c <= column + half; c++) {
          if (c < left || c > right) return false;
          const top = island.surface[c];
          const bottom = island.capBottom[c];
          if (top < 0 || y < top || y > bottom) return false;
        }
        return true;
      };

      for (let attempt = 0; attempt < 14; attempt++) {
        const side = index % 2 === 0 ? -1 : 1;
        let column: number;
        let depth: number;

        switch (entry.zone) {
          case "yard":
            column = Math.round(axis + side * range(rand, footHalf * 0.7, footHalf * 1.7));
            depth = range(rand, 0.42, 0.86);
            break;
          case "path":
            column = Math.round(axis + side * range(rand, pathHalf + 2, pathHalf + 8));
            depth = range(rand, 0.4, 0.94);
            break;
          case "apron":
            column = Math.round(axis + range(rand, -1, 1) * foot.topWidth * 0.34);
            depth = range(rand, 0.72, 0.95);
            break;
          default:
            // Banked against the perimeter, front and back both. This is the
            // half of "define the edges" the island cannot bake itself: the
            // rim tone draws the line, and these stand on it. Inset from the
            // very ends, where the cap is too shallow to stand anything in.
            column = rangeInt(rand, left + 3, right - 3);
            // Anything tall goes to the *back* rim only. A tree on the front
            // rim is drawn in front of the building and is taller than it —
            // which is how Aptech ended up behind a hedge of its own planting.
            depth = tall || rand() < 0.5 ? range(rand, 0.06, 0.2) : range(rand, 0.82, 0.96);
            break;
        }

        const top = island.surface[column];
        const bottom = island.capBottom[column];
        if (top < 0 || bottom <= top) continue;

        const y = Math.round(top + (bottom - top) * depth);
        if (!onLand(column, y)) continue;
        // Never under the building itself — a crate behind a wall is a crate
        // nobody sees, and one in front of the door is worse.
        if (entry.zone !== "rim" && Math.abs(column - axis) < footHalf * 0.62) continue;
        return { x: column, y };
      }
      return null;
    };

    for (const entry of plan) {
      for (let i = 0; i < entry.count; i++) {
        // Resolved before placing, because how wide a thing is decides where
        // it will fit.
        const art = this.siteArt.textures(entry.what);
        const grown = art ? null : this.props.textures(entry.what as PropKind, 0);
        const pieceWidth = art?.width ?? grown?.width ?? 0;
        if (pieceWidth === 0) continue;

        const pieceHeight = art?.height ?? grown?.height ?? 0;
        const spot = place(entry, i, Math.max(1, pieceWidth >> 1), pieceHeight > 14);
        if (!spot) continue;

        const site = art ? this.siteArt.make(entry.what, accent) : null;
        if (site) {
          site.container.x = spot.x - island.topCenter.x - (site.width >> 1);
          site.container.y = spot.y - island.topCenter.y - site.height;
          site.container.zIndex = spot.y;
          body.addChild(site.container);
          continue;
        }

        const view = this.growProp(entry.what as PropKind, rand, island, spot);
        if (view) {
          view.container.zIndex = spot.y;
          body.addChild(view.container);
          views.push(view);
        }
      }
    }

    return views;
  }

  /** One of the shore's own props, bound at a spot on this island's cap. */
  private growProp(
    kind: PropKind,
    rand: () => number,
    island: IsoIsland,
    spot: { x: number; y: number }
  ): PropView | null {
    const variant = rangeInt(rand, 0, 3);
    const textures = this.props.textures(kind, variant);
    if (!textures) return null;

    const view = this.props.acquire();
    view.bind(
      {
        kind,
        variant,
        x: spot.x - island.topCenter.x - (textures.width >> 1),
        y: spot.y - island.topCenter.y,
        band: "backVerge",
        dy: 0,
        flip: rand() < 0.5,
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
    view.setTones(
      PROP_MATERIALS[tones.base],
      PROP_MATERIALS[tones.light],
      PROP_MATERIALS[tones.dark]
    );
    return view;
  }

  /**
   * Tufts, stones and small bushes along the foot, straddling the bottom edge.
   *
   * The seam a building makes with the top face it stands on is a clean
   * horizontal line, and a clean line between two separately drawn things is
   * exactly what says they were drawn separately. Breaking it costs four to
   * six of the shore's own props, sat a pixel or two below the baseline so
   * their tops overlap the wall — the same planting already scattered across
   * the rest of the island, just aimed at the join.
   */
  private scatterBase(
    chapter: ResolvedChapter,
    island: IsoIsland,
    foot: Foot,
    body: Container
  ): PropView[] {
    const views: PropView[] = [];
    if (foot.width <= 0) return views;

    const rand = createRandom(seedOf(chapter.id) ^ 0x71c3);
    const count = rangeInt(rand, BASE_PROP_COUNT[0], BASE_PROP_COUNT[1]);
    const half = Math.min(foot.width, foot.topWidth) / 2;

    for (let i = 0; i < count; i++) {
      const kind = BASE_PROPS[rangeInt(rand, 0, BASE_PROPS.length - 1)];
      const variant = rangeInt(rand, 0, 3);
      const textures = this.props.textures(kind, variant);

      // Along the foot rather than under the middle of it — a prop behind the
      // building is a prop nobody sees — and out past the corners a little,
      // so the silhouette's ends are broken up too.
      const side = rand() < 0.5 ? -1 : 1;
      const x = Math.round(foot.centerX + side * range(rand, half * 0.55, half * 1.05));
      const column = Math.round(x + island.topCenter.x);
      if (column < 0 || column >= island.width || island.surface[column] < 0) continue;

      const view = this.props.acquire();
      view.bind(
        {
          kind,
          variant,
          x: x - (textures.width >> 1),
          y: foot.y + rangeInt(rand, 0, 2),
          band: "backVerge",
          dy: 0,
          flip: rand() < 0.5,
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
      view.setTones(
        PROP_MATERIALS[tones.base],
        PROP_MATERIALS[tones.light],
        PROP_MATERIALS[tones.dark]
      );

      view.container.zIndex = island.topCenter.y + foot.y + rangeInt(rand, 0, 2);
      body.addChild(view.container);
      views.push(view);
    }

    return views;
  }

  /**
   * Scatter this chapter's planting across its island's top face.
   *
   * Everything here is drawn *after* whatever stands on the island, so a tuft
   * that lands on the centre column lands in front of the building — which is
   * how the cottage ended up behind a meadow and the lighthouse behind its own
   * shore grass. The planting keeps clear of the standing thing's own width
   * and grows on the ground around it instead; the deliberate overlap at the
   * seam is `scatterBase`'s job, and it is aimed at the foot only.
   */
  private scatterProps(
    chapter: ResolvedChapter,
    island: IsoIsland,
    foot: Foot,
    body: Container
  ): PropView[] {
    const scheme = PLANTING[chapter.identity.terrain] ?? DEFAULT_PLANTING;
    const rand = createRandom(seedOf(chapter.id) ^ 0x5bd1);
    const count = rangeInt(rand, scheme.count[0], scheme.count[1]);
    const views: PropView[] = [];

    const left = island.topBounds.left;
    const right = island.topBounds.right;
    if (right <= left) return views;

    // Half the standing thing's width plus air — but never less than a fifth of
    // the top face either side, because the two chapters with the *smallest*
    // things standing on them (Freelance's cottage, Contact's lighthouse) are
    // exactly the ones a bush in front of reduces to a green lump.
    const width = right - left;
    const clear = Math.max(foot.width * 0.5 + 4, width * 0.24);

    for (let i = 0; i < count; i++) {
      const kind = scheme.kinds[rangeInt(rand, 0, scheme.kinds.length - 1)];
      // Resampled rather than dropped: a skipped draw would thin the planting
      // on exactly the islands with the widest buildings, which is backwards.
      let x = -1;
      for (let attempt = 0; attempt < 8; attempt++) {
        const candidate = Math.max(left + 1, Math.min(right - 1, rangeInt(rand, left, right)));
        if (island.surface[candidate] < 0) continue;
        if (Math.abs(candidate - (island.topCenter.x + foot.centerX)) < clear) continue;
        x = candidate;
        break;
      }
      if (x < 0) continue;
      const surfaceY = island.surface[x];

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

      view.container.zIndex = surfaceY;
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

/** The spot on the top face a building stands on, before anything stands there. */
function footOf(island: IsoIsland): Foot {
  // The top face's own centre, not its back rim: `island.surface` holds the
  // *highest* row of each column, which on the centre column is the far edge
  // of the ellipse — standing there floats a building half a cap-height above
  // the surface it is meant to rest on.
  // Centred on the top face's *own* midpoint, not on the island texture's.
  // `topCenter.x` is the geometric centre of the plot the coastline was
  // generated in; `topBounds` is where the land actually ended up, and on a
  // rough island the two are several pixels apart. Standing on the former is
  // what walked Workshop's shed off its own left edge.
  return {
    y: 0,
    width: 0,
    centerX: Math.round((island.topBounds.left + island.topBounds.right) / 2 - island.topCenter.x),
    topWidth: island.topBounds.right - island.topBounds.left,
  };
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
