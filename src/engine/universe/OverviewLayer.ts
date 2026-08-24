import { Container, Rectangle, Sprite, Texture } from "pixi.js";
import { maskToTexture } from "../shared";
import { bakeIsland } from "./IslandFactory";
import type { Island, IslandTones } from "./IslandFactory";
import { LandmarkFactory } from "./LandmarkFactory";
import { tierFor, visibleAt } from "./LevelOfDetail";
import {
  KIND_TONES,
  PETALS,
  PROP_MATERIALS,
  PropFactory,
  PropView,
} from "../environment";
import { StarField, STAR_SETTINGS } from "../stars";
import type { CameraView } from "../camera/Camera";
import type { Size } from "../types";
import type { AmbientKind, DetailTier, ResolvedChapter } from "./UniverseTypes";

/**
 * The overview: the career universe, seen from outside.
 *
 * Nine worlds in a dark sky, each one a chapter, composed in two dimensions at
 * nine different sizes and heights. The one thing this view has to prove is
 * that a career is a set of *places* rather than a row of buildings on a road —
 * so if the worlds ever line up, the composition has failed and no amount of
 * art will rescue it.
 *
 * # Three channels of identity
 * A world is told apart by its **outline** first (`IslandFactory` cuts eight
 * genuinely different forms), then by what **stands** on it (`LandmarkFactory`
 * silhouettes), then by **colour**. In that order, because that is the order
 * the channels survive distance: at the far zoom the outline is all there is.
 *
 * # Progressive detail
 * Every landmark and every plant carries a tier, and `LevelOfDetail` says which
 * tiers exist at the current zoom. Below its tier a thing is switched off — not
 * dimmed — so the far view of nine worlds costs nine outlines and nine primary
 * landmarks, and pushing in *reveals* rather than *enlarges*. That reveal is
 * the whole feeling the map is built to produce.
 *
 * # Where it sits
 * Two containers in two different spaces, and the split matters:
 *
 *  - `backdrop` is **screen space**, mounted behind the camera. The sky does
 *    not move when you pan, for the same reason the coast's does not: it is not
 *    a place, it is what is behind every place.
 *  - `field` is **world space**, inside the camera container. The worlds are
 *    somewhere, and panning moves them.
 *
 * # Alive, barely
 * Each world gets at most **one** ambient tell — a beacon turning over, smoke
 * rising, a crane leaning. One, because a map where everything animates has no
 * focus and spends its frame budget on things nobody is looking at, while a map
 * where each place has a single slow movement reads as inhabited. All of it is
 * whole-pixel and none of it is synchronised.
 */

/** How hard the hover ramp chases its target, as a rate per second. */
const DETAIL_SMOOTHING = 6;

/** The space between the worlds. Never pure black (DESIGN.md §Color Palette). */
const VOID_COLOR = 0x0b1220;

/**
 * How far a world rises and falls, in art pixels, and over how long.
 *
 * Two pixels across the better part of half a minute. Ambient motion in pixel
 * art has exactly one failure mode — being noticed — and the fix is always less
 * distance over more time, never a softer curve.
 */
const BOB_PIXELS = 2;
const BOB_PERIOD = [16, 27] as const;

export interface OverviewLayerOptions {
  chapters: readonly ResolvedChapter[];
  /** Pass the engine's shared `pixelScale` so the worlds land on the grid. */
  pixelScale: number;
  /** Viewport size in CSS pixels. */
  width: number;
  height: number;
  /** Global motion multiplier. 0 for `prefers-reduced-motion: reduce`. */
  motionScale?: number;
  /** The pointer moved onto a world, or off every world. */
  onHover?: (id: string | null) => void;
  /** A world was clicked. */
  onSelect?: (id: string) => void;
}

/** One landmark standing on a world. */
interface Landmark {
  container: Container;
  tier: DetailTier;
  /** The lit tone, which is what a beacon and a spark brighten. */
  light: Sprite;
  /** Whether this is the world's primary structure. Ambient acts on it. */
  primary: boolean;
  /** Where it stands, before any ambient motion. What `swing` oscillates around. */
  baseX: number;
}

/** One world's sprites and its current state. */
interface Marker {
  chapter: ResolvedChapter;
  island: Island;
  container: Container;
  /** Everything that bobs. The hit target does not, so the click stays still. */
  body: Container;
  ring: Sprite;
  landmarks: Landmark[];
  views: { view: PropView; tier: DetailTier }[];
  /** Smoke puffs, if this world makes smoke. */
  puffs: Sprite[];
  /** Where the hover ramp is heading, 0–1. */
  target: number;
  /** Where it actually is. */
  hover: number;
  bobRate: number;
  bobPhase: number;
  ambientPhase: number;
}

export class OverviewLayer {
  /** Screen space, behind the camera. The sky between the worlds. */
  readonly backdrop = new Container();
  /** World space, inside the camera. The worlds themselves. */
  readonly field = new Container();

  private readonly markers = new Map<string, Marker>();
  private readonly textures: Texture[] = [];
  private readonly props: PropFactory;
  private readonly landmarkArt = new LandmarkFactory();
  private readonly stars: StarField;
  private readonly starLayer = new Container();
  private readonly onHover: ((id: string | null) => void) | undefined;
  private readonly onSelect: ((id: string) => void) | undefined;
  private readonly chapters: readonly ResolvedChapter[];
  private readonly motionScale: number;
  private readonly voidSprite: Sprite;
  private puffTexture: Texture | null = null;

  private pixelScaleValue: number;
  private viewport: Size;
  private elapsed = 0;
  /** The tier everything is currently built for. Only changes on a threshold. */
  private tier: DetailTier = "far";
  /** 1 on the map, 0 once you are inside a world. */
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
    // `static` rather than `passive`: the hit targets are below and the
    // container has to be walked to reach them.
    this.field.eventMode = "static";

    this.voidSprite = new Sprite(Texture.WHITE);
    this.voidSprite.tint = VOID_COLOR;
    this.voidSprite.eventMode = "none";
    this.backdrop.addChild(this.voidSprite);

    // The shore's own star field, held permanently open. On the coast the clock
    // decides whether stars are out; between the worlds there is no hour and no
    // horizon, so they simply are.
    this.stars = new StarField({ ...STAR_SETTINGS, horizon: 1, fadeStart: 1 });
    this.stars.setVisibility(1);
    // Inside its own scaled container, exactly as the coast's sky holds it: the
    // field works in art pixels, and a star mounted unscaled is one screen pixel
    // — an accurate star and the wrong art.
    this.starLayer.addChild(this.stars.container);
    this.starLayer.eventMode = "none";
    this.backdrop.addChild(this.starLayer);

    // One workshop for every world's planting, so two campuses that want the
    // same tree share one drawing of it.
    this.props = new PropFactory({ seed: 0x151a });

    this.build();
    this.resize(this.viewport);
  }

  // --- Queries ---------------------------------------------------------------

  /** Whether the map is on screen at all. */
  get visible(): boolean {
    return this.backdrop.visible;
  }

  /** The detail tier currently built. */
  get detailTier(): DetailTier {
    return this.tier;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * How present the map is, 0–1.
   *
   * Driven by `UniverseState.approach`, inverted: 1 on the map, 0 once you are
   * inside a world. Below the threshold both containers switch off outright
   * rather than sitting at alpha 0, so an invisible map cannot swallow a click
   * meant for the world underneath it.
   */
  setPresence(presence: number): void {
    this.presence = presence < 0 ? 0 : presence > 1 ? 1 : presence;
    const on = this.presence > 0.001;

    this.backdrop.visible = on;
    this.field.visible = on;
    this.field.eventMode = on ? "static" : "none";
    this.backdrop.alpha = this.presence;
    this.field.alpha = this.presence;
  }

  /** How strongly one world is being pointed at, 0–1. */
  setHover(id: string, hover: number): void {
    const marker = this.markers.get(id);
    if (marker) marker.target = hover < 0 ? 0 : hover > 1 ? 1 : hover;
  }

  /**
   * Ease the hover ramps, run the ambient, and re-gate detail.
   *
   * `view` is the camera's applied transform. Only its zoom is read — the field
   * is inside the camera container, so the camera has already placed it and
   * this must not place it a second time.
   */
  update(delta: number, view: CameraView): void {
    if (delta <= 0) return;

    // Detail first, so anything switched on this frame is animated this frame
    // rather than appearing a frame late.
    this.applyTier(tierFor(view.zoom));

    this.elapsed += delta * this.motionScale;
    // Nothing breathes when motion is off (DESIGN.md §Animation).
    if (this.motionScale > 0) this.stars.update(delta);

    const t = 1 - Math.exp(-DETAIL_SMOOTHING * delta);

    for (const marker of this.markers.values()) {
      const before = marker.hover;
      marker.hover = before + (marker.target - before) * t;
      if (Math.abs(marker.target - marker.hover) < 0.002) marker.hover = marker.target;

      marker.ring.alpha = marker.hover * 0.8;

      if (this.motionScale > 0) {
        // Whole pixels only. A sub-pixel drift is a blur, and this is pixel art.
        marker.body.y = Math.round(
          Math.sin(this.elapsed * marker.bobRate + marker.bobPhase) * BOB_PIXELS
        );
        this.runAmbient(marker);
      }

      for (const entry of marker.views) entry.view.animate(this.elapsed);
    }
  }

  /** Re-fit to a new viewport, in CSS pixels. */
  resize(size: Size, pixelScale: number = this.pixelScaleValue): void {
    if (size.width <= 0 || size.height <= 0) return;

    this.viewport = size;
    this.voidSprite.width = size.width;
    this.voidSprite.height = size.height;

    const next = Math.max(1, Math.round(pixelScale));
    if (next !== this.pixelScaleValue) {
      // The grid itself changed, so every world is now the wrong number of art
      // pixels across and must be re-baked. Every other resize leaves them be.
      this.pixelScaleValue = next;
      this.rebuild();
    }

    this.field.scale.set(this.pixelScaleValue);
    this.starLayer.scale.set(this.pixelScaleValue);
    this.stars.resize(
      Math.ceil(size.width / this.pixelScaleValue),
      Math.ceil(size.height / this.pixelScaleValue)
    );
  }

  destroy(): void {
    this.release();
    this.props.destroy();
    this.landmarkArt.destroy();
    this.stars.destroy();
    this.puffTexture?.destroy(true);
    this.puffTexture = null;
    this.backdrop.destroy({ children: true });
    this.field.destroy({ children: true });
  }

  // --- Internal --------------------------------------------------------------

  /**
   * Switch things on and off for a new tier.
   *
   * Visibility rather than construction, and that is a deliberate trade. Nine
   * worlds hold on the order of fifty small sprites between them — trivial
   * memory — while building and destroying them at every threshold crossing
   * would churn textures and pool entries every time the camera drifted across
   * a boundary. Pixi skips invisible subtrees entirely, so the draw cost is the
   * same either way, which is the cost that actually matters here.
   */
  private applyTier(next: DetailTier): void {
    if (next === this.tier) return;
    this.tier = next;

    for (const marker of this.markers.values()) {
      for (const landmark of marker.landmarks) {
        landmark.container.visible = visibleAt(landmark.tier, next);
      }
      for (const entry of marker.views) {
        entry.view.container.visible = visibleAt(entry.tier, next);
      }
      // Smoke is a near-and-mid tell. At the far zoom a two-pixel puff is noise.
      for (const puff of marker.puffs) puff.visible = next !== "far";
    }
  }

  /** The one thing that moves on this world. See `AmbientKind`. */
  private runAmbient(marker: Marker): void {
    const kind: AmbientKind | undefined = marker.chapter.identity.ambient;
    if (!kind) return;

    const primary = marker.landmarks.find((l) => l.primary);
    const t = this.elapsed + marker.ambientPhase;

    switch (kind) {
      case "beacon": {
        // A lamp turning: bright for a moment, then round the back. Sharpened
        // with a power so it reads as a sweep rather than a throb.
        if (!primary) return;
        const turn = (Math.sin(t * 0.9) + 1) / 2;
        primary.light.alpha = 0.25 + turn ** 3 * 0.75;
        return;
      }
      case "spark": {
        // Arrival, not weather: mostly nothing, occasionally a flash.
        if (!primary) return;
        const strike = Math.sin(t * 2.3) * Math.sin(t * 5.7 + 1.1);
        primary.light.alpha = strike > 0.86 ? 1 : 0.3;
        return;
      }
      case "swing": {
        // A crane leaning. One pixel each way, and slow enough that you catch
        // it having moved rather than watch it moving. Measured from `baseX`,
        // not the container's current position — the earlier version fed each
        // frame's result back in as the next frame's base, which is a random
        // walk, not a sway, and drifted the crane clean off its island over a
        // few minutes.
        if (!primary) return;
        primary.container.x = primary.baseX + Math.round(Math.sin(t * 0.35));
        return;
      }
      case "flutter": {
        if (!primary) return;
        primary.light.alpha = 0.6 + 0.4 * Math.sin(t * 1.7);
        return;
      }
      case "smoke": {
        // Puffs rise, fade, and start again from the chimney. Each one is a
        // third of a cycle behind the last, so the column never pulses.
        for (let i = 0; i < marker.puffs.length; i++) {
          const puff = marker.puffs[i];
          const phase = (t * 0.22 + i / marker.puffs.length) % 1;
          puff.y = puff.height * -1 - Math.round(phase * 9);
          puff.alpha = (1 - phase) * 0.55;
        }
        return;
      }
    }
  }

  private rebuild(): void {
    const state = new Map<string, number>();
    for (const [id, marker] of this.markers) state.set(id, marker.hover);

    this.release();
    this.build();
    // The tier was reset by the rebuild; re-apply whatever it actually is.
    const tier = this.tier;
    this.tier = "far";
    this.applyTier(tier);

    for (const [id, hover] of state) {
      const marker = this.markers.get(id);
      if (!marker) continue;
      marker.hover = hover;
      marker.target = hover;
    }
  }

  private build(): void {
    const scale = this.pixelScaleValue;

    for (const chapter of this.chapters) {
      const island = bakeIsland(chapter, scale);
      const { identity } = chapter;

      const keel = this.tones(
        island.keel,
        identity.secondary,
        shift(identity.secondary, 1.35),
        shift(identity.secondary, 0.66)
      );
      const cap = this.tones(
        island.cap,
        identity.primary,
        shift(identity.primary, 1.3),
        shift(identity.primary, 0.7)
      );

      const body = new Container();
      body.label = "island";
      body.eventMode = "none";
      body.addChild(...keel, ...cap);

      const offsetX = -(island.width >> 1);
      const offsetY = -island.surfaceY;
      for (const sprite of [...keel, ...cap]) {
        sprite.x = offsetX;
        sprite.y = offsetY;
      }

      const landmarks = this.raise(chapter, island, offsetX, offsetY);
      for (const landmark of landmarks) body.addChild(landmark.container);

      const views = this.plant(island, offsetX, offsetY);
      for (const entry of views) body.addChild(entry.view.container);

      const puffs = identity.ambient === "smoke" ? this.makePuffs(landmarks) : [];
      for (const puff of puffs) body.addChild(puff);

      // The approach ring, around the world's waterline rather than its full
      // height — an island hangs below the place it *is*.
      const radius = island.width >> 1;
      const ring = new Sprite(this.disc(radius + 4, radius + 2));
      ring.anchor.set(0.5);
      ring.tint = identity.accent;
      ring.alpha = 0;
      ring.eventMode = "none";

      // The hit target covers the whole island, keel included, and deliberately
      // does not bob: a click missing because the thing under the pointer
      // drifted out from under it is the bug ambient motion reliably causes.
      const hit = new Sprite(Texture.EMPTY);
      hit.eventMode = "static";
      hit.cursor = "pointer";
      hit.hitArea = new Rectangle(offsetX, offsetY, island.width, island.height);

      const container = new Container();
      container.label = `chapter:${chapter.id}`;
      container.x = Math.round(chapter.overview.x / scale);
      container.y = Math.round(chapter.overview.y / scale);
      container.addChild(ring, body, hit);

      hit.on("pointerover", () => this.onHover?.(chapter.id));
      hit.on("pointerout", () => this.onHover?.(null));
      hit.on("pointertap", () => this.onSelect?.(chapter.id));

      this.field.addChild(container);
      this.markers.set(chapter.id, {
        chapter,
        island,
        container,
        body,
        ring,
        landmarks,
        views,
        puffs,
        target: 0,
        hover: 0,
        // Its own rate and phase, derived from where it sits rather than rolled,
        // so nine worlds never rise together and a re-bake changes nothing.
        bobRate:
          (Math.PI * 2) /
          (BOB_PERIOD[0] + (chapter.overview.x % (BOB_PERIOD[1] - BOB_PERIOD[0]))),
        bobPhase: (chapter.overview.y % 100) / 16,
        ambientPhase: (chapter.overview.x % 37) / 5,
      });
    }
  }

  /** Stand this chapter's structures on its island. */
  private raise(
    chapter: ResolvedChapter,
    island: Island,
    offsetX: number,
    offsetY: number
  ): Landmark[] {
    const out: Landmark[] = [];
    const radius = island.width >> 1;
    const { identity } = chapter;

    identity.landmarks.forEach((spec, index) => {
      const art = this.landmarkArt.textures(spec.bitmap);
      if (!art) return;

      const scale = Math.max(1, Math.round(spec.scale ?? 1));
      const drawWidth = art.width * scale;
      const drawHeight = art.height * scale;

      // Where it stands, and what it stands on. Read off the island's own
      // surface rather than a nominal baseline, so a stepped or bumpy world
      // does not hover its tower over the low side.
      const column = Math.max(
        0,
        Math.min(island.width - 1, Math.round(radius + spec.at * radius))
      );
      const groundY = island.surface[column];

      const make = (texture: Texture, tint: number) => {
        const sprite = new Sprite(texture);
        sprite.tint = tint;
        sprite.eventMode = "none";
        sprite.scale.set(scale);
        return sprite;
      };

      // The lit face is a *lighter version of the structure*, not the accent.
      // Tinting it with the accent painted whole walls in lamp colour and every
      // building came out washed out and weightless — the accent is a light
      // source, and a light source the size of a wall stops reading as one.
      //
      // The exception is a world whose ambient tell *is* a light: a lighthouse
      // lamp and an idea striking are both supposed to be the brightest thing
      // on their island, and only the primary structure carries it.
      const glows =
        index === 0 && (identity.ambient === "beacon" || identity.ambient === "spark");
      const base = make(art.base, identity.secondary);
      const dark = make(art.dark, shift(identity.secondary, 0.62));
      const light = make(art.light, glows ? identity.accent : shift(identity.secondary, 1.5));

      const container = new Container();
      container.eventMode = "none";
      container.addChild(base, dark, light);
      // Centred on its column, and standing *on* the ground rather than in it.
      container.x = offsetX + column - (drawWidth >> 1);
      container.y = offsetY + groundY - drawHeight + 1;
      if (spec.flip) {
        container.scale.x = -1;
        container.x += drawWidth;
      }

      const tier = spec.tier ?? "mid";
      container.visible = visibleAt(tier, this.tier);

      out.push({ container, tier, light, primary: index === 0, baseX: container.x });
    });

    return out;
  }

  /** Stand this island's planting on it, using the shore's own prop workshop. */
  private plant(
    island: Island,
    offsetX: number,
    offsetY: number
  ): { view: PropView; tier: DetailTier }[] {
    const out: { view: PropView; tier: DetailTier }[] = [];

    for (const item of island.props) {
      const textures = this.props.textures(item.kind, item.variant);
      const view = this.props.acquire();

      view.bind(
        {
          kind: item.kind,
          variant: item.variant,
          // Centred on its spot. `PropView` anchors a prop at its bottom-*left*
          // corner, so a tree placed by its intended centre would hang its whole
          // crown off the right-hand side of the island.
          x: item.x + offsetX - (textures.width >> 1),
          band: "backVerge",
          dy: 0,
          flip: item.flip,
          scale: 1,
          motion: "sway",
          phase: item.phase,
          swayRate: item.swayRate,
          swayAmount: item.swayAmount,
          y: item.y + offsetY,
        },
        textures,
        null
      );

      // Lit from the flat material table rather than the day/night cycle. There
      // is no hour between the worlds, and a map that changed colour with the
      // clock would be telling you something untrue about itself.
      const tones = KIND_TONES[item.kind];
      const light =
        item.kind === "flower"
          ? PROP_MATERIALS[PETALS[item.variant % PETALS.length]]
          : PROP_MATERIALS[tones.light];
      view.setTones(PROP_MATERIALS[tones.base], light, PROP_MATERIALS[tones.dark]);

      view.container.visible = visibleAt(item.tier, this.tier);
      out.push({ view, tier: item.tier });
    }

    return out;
  }

  /** Three puffs over the first chimney-ish landmark this world has. */
  private makePuffs(landmarks: Landmark[]): Sprite[] {
    // The last landmark, because a chimney or lean-to is authored after the
    // building it sits on. A world with one landmark smokes from that one.
    const source = landmarks[landmarks.length - 1] ?? landmarks[0];
    if (!source) return [];

    if (!this.puffTexture) {
      const mask = new Uint8Array(4);
      mask.fill(255);
      this.puffTexture = maskToTexture(2, 2, mask, "OverviewLayer");
    }

    const puffs: Sprite[] = [];
    for (let i = 0; i < 3; i++) {
      const puff = new Sprite(this.puffTexture);
      puff.tint = 0xb8b2a8;
      puff.eventMode = "none";
      puff.alpha = 0;
      puff.x = Math.round(source.container.x + 1);
      puff.y = source.container.y;
      puffs.push(puff);
    }
    return puffs;
  }

  /** Three sprites, one per tone, ready to be tinted and stacked. */
  private tones(tones: IslandTones, base: number, light: number, dark: number): Sprite[] {
    const make = (texture: Texture, tint: number) => {
      const sprite = new Sprite(texture);
      sprite.tint = tint;
      sprite.eventMode = "none";
      return sprite;
    };
    return [make(tones.base, base), make(tones.dark, dark), make(tones.light, light)];
  }

  private release(): void {
    for (const marker of this.markers.values()) {
      for (const entry of marker.views) this.props.release(entry.view);
      marker.container.removeAllListeners();
      marker.container.destroy({ children: true });

      for (const tone of [marker.island.cap, marker.island.keel]) {
        tone.base.destroy(true);
        tone.light.destroy(true);
        tone.dark.destroy(true);
      }
    }
    this.markers.clear();

    for (const texture of this.textures) texture.destroy(true);
    this.textures.length = 0;
  }

  /**
   * A filled circle, or an annulus when `inner` is above zero.
   *
   * Baked as a white mask and tinted, like every other shape in this engine.
   * Hard-edged: a pixel is in or out and there is no coverage term, because an
   * anti-aliased circle is exactly the soft edge CLAUDE.md forbids.
   */
  private disc(radius: number, inner: number): Texture {
    const size = radius * 2 + 1;
    const mask = new Uint8Array(size * size);
    const outerSq = radius * radius;
    const innerSq = inner * inner;

    for (let y = 0; y < size; y++) {
      const dy = y - radius;
      for (let x = 0; x < size; x++) {
        const dx = x - radius;
        const d = dx * dx + dy * dy;
        if (d <= outerSq && d >= innerSq) mask[y * size + x] = 255;
      }
    }

    const texture = maskToTexture(size, size, mask, "OverviewLayer");
    this.textures.push(texture);
    return texture;
  }
}

/** Push a colour towards white or black. The cheapest possible shading ramp. */
function shift(color: number, factor: number): number {
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
  const r = clamp(((color >> 16) & 0xff) * factor);
  const g = clamp(((color >> 8) & 0xff) * factor);
  const b = clamp((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}
