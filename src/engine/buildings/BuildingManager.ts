import { Container } from "pixi.js";
import { INTERACT_KEY, InteractionPrompt, PROMPT } from "./InteractionZone";
import type { InteractionZone } from "./InteractionZone";
import type { Building, BuildingAnchors, BuildingContext } from "./Building";
import { PROP_BASELINES } from "../ground";
import type { LightingState } from "../lighting";

/**
 * Something that hands out the state of the light and lets you listen to it.
 *
 * Structural rather than the concrete `LightingSystem` — buildings are lit by
 * the world's ambient and their windows burn on what it leaves over, exactly as
 * the lighthouse and the shore's lamps do.
 */
export interface LightingSource {
  subscribe(listener: (state: LightingState) => void): () => void;
}

export interface BuildingManagerOptions {
  /** Total width of the world, in CSS pixels. */
  worldWidth: number;
  /** Viewport size in CSS pixels. */
  width: number;
  height: number;
  /** Pass the sky's `pixelScale` so buildings share the world's pixel grid. */
  pixelScale: number;
  anchors: BuildingAnchors;
  /** Global motion multiplier. 0 for `prefers-reduced-motion: reduce`. */
  motionScale?: number;
  /** How far beyond the view a building stays alive, in CSS pixels. */
  cullMargin?: number;
  /** Notified whenever a building is interacted with. */
  onInteract?: (building: Building) => void;
}

const DEFAULT_CULL_MARGIN = 120;

/**
 * The registry, the camera cull, the proximity test and the one prompt.
 *
 * # Why these four things live together
 * They are all questions about *all* the buildings at once. Which is nearest?
 * Which are worth drawing? Whose name goes on the panel? A building answering
 * any of those for itself would mean ten keyboard listeners racing each other
 * and ten prompts deciding independently to appear.
 *
 * So a building knows how to stand and how to look, and this knows how they
 * compare. Adding a landmark is `manager.add(new WhateverBuilding(context))`,
 * and nothing here needs to know it happened.
 *
 * # The focus point
 * Proximity is measured from a *focus* — the point in the world you are
 * considered to be at. There is no player yet, so the camera's centre is used,
 * dropped onto the path the player will eventually walk. When a character
 * exists, one call changes and nothing else does:
 *
 * ```ts
 * manager.setFocus(player.x, player.y);
 * ```
 *
 * # Usage
 * ```ts
 * const buildings = new BuildingManager({ ... });
 * buildings.add(new AptechBuilding(buildings.context));
 * app.stage.addChildAt(buildings.container, 4);
 * const off = buildings.bindLighting(lightingManager);
 * app.ticker.add((t) => buildings.update(t.deltaMS / 1000));
 * buildings.setViewOffset(viewLeft);
 * ```
 */
export class BuildingManager {
  /** Mount this in front of the land. */
  readonly container = new Container();

  private readonly world = new Container();
  private readonly prompt: InteractionPrompt;

  private readonly registry = new Map<string, Building>();
  /** The same buildings, as an array — iterated every frame, so never rebuilt. */
  private readonly list: Building[] = [];

  private readonly onInteractCallback: ((building: Building) => void) | undefined;
  private readonly cullMargin: number;
  private readonly motionScale: number;

  private worldWidth: number;
  private viewportWidth: number;
  private pixelScaleValue: number;
  private anchors: BuildingAnchors;

  private viewOffset = 0;
  /** The camera transform, for keeping the prompt on screen. See setCameraView. */
  private viewScreenY = 0;
  private viewZoom = 1;
  /** Where the player is considered to be, in world CSS pixels. */
  private focusX = 0;
  private focusY = 0;
  /** The line a character walks along. The default y of the focus. */
  private walkLine = 0;

  private active: InteractionZone | null = null;
  private activeBuilding: Building | null = null;

  private lighting: LightingState | null = null;
  private unsubscribe: (() => void) | null = null;
  private attached = false;

  constructor(options: BuildingManagerOptions) {
    this.worldWidth = options.worldWidth;
    this.viewportWidth = options.width;
    this.pixelScaleValue = options.pixelScale;
    this.anchors = options.anchors;
    this.motionScale = Math.max(0, options.motionScale ?? 1);
    this.cullMargin = options.cullMargin ?? DEFAULT_CULL_MARGIN;
    this.onInteractCallback = options.onInteract;

    this.container.label = "buildings";
    this.container.eventMode = "none";
    this.world.label = "buildings:world";
    this.world.eventMode = "none";
    // Buildings are sorted by their baseline, so one standing further down the
    // beach correctly covers one set further back.
    this.world.sortableChildren = true;

    this.prompt = new InteractionPrompt(this.motionScale);
    // Above every building, always. A prompt that sorted with the architecture
    // would disappear behind the thing it is describing.
    this.container.addChild(this.world, this.prompt.container);

    this.resize(options.width, options.height, options.anchors);
    this.attach();
  }

  // --- Queries ---------------------------------------------------------------

  /** Everything a building needs in order to be constructed for this world. */
  get context(): BuildingContext {
    return {
      worldWidth: this.worldWidth,
      pixelScale: this.pixelScaleValue,
      anchors: this.anchors,
      motionScale: this.motionScale,
    };
  }

  get buildings(): readonly Building[] {
    return this.list;
  }

  get(id: string): Building | undefined {
    return this.registry.get(id);
  }

  /** The building currently offering itself, if you are standing close enough. */
  get focused(): Building | null {
    return this.activeBuilding;
  }

  get stats(): { total: number; visible: number } {
    let visible = 0;
    for (const building of this.list) if (!building.culled) visible++;
    return { total: this.list.length, visible };
  }

  // --- Commands --------------------------------------------------------------

  /** Register a building. It takes its place in the world immediately. */
  add(building: Building): Building {
    if (this.registry.has(building.id)) {
      throw new Error(`BuildingManager: duplicate building id "${building.id}"`);
    }

    this.registry.set(building.id, building);
    this.list.push(building);
    // Depth by baseline, matching how the shore sorts its planting.
    building.container.zIndex = building.worldY;
    this.world.addChild(building.container);

    if (this.lighting) building.applyLighting(this.lighting);
    return building;
  }

  /** Unregister and destroy a building. */
  remove(id: string): void {
    const building = this.registry.get(id);
    if (!building) return;

    this.registry.delete(id);
    const index = this.list.indexOf(building);
    if (index >= 0) this.list.splice(index, 1);

    if (this.activeBuilding === building) this.clearFocus();
    building.destroy();
  }

  /** Follow the world's lighting. Returns an unsubscribe function. */
  bindLighting(source: LightingSource): () => void {
    this.unsubscribe?.();

    this.unsubscribe = source.subscribe((state) => {
      this.lighting = state;
      for (const building of this.list) building.applyLighting(state);
    });

    return () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
    };
  }

  /**
   * Where you are, in world CSS pixels.
   *
   * `y` defaults to the path, which is where a character will walk — so passing
   * the camera's centre x is enough to make proximity behave as though someone
   * were standing on the road looking up at the building.
   */
  setFocus(x: number, y: number = this.walkLine): void {
    this.focusX = x;
    this.focusY = y;
  }

  /**
   * Feed the buildings the camera's horizontal position, in world CSS pixels.
   *
   * What to cull, not where to stand. The landmarks live in world space inside
   * the camera's `structures` layer, so the camera moves them by exactly what
   * it moves the beach they stand on — which is the only way a building and its
   * own ground can be guaranteed never to disagree.
   */
  setViewOffset(x: number): void {
    this.viewOffset = x;
  }

  /** Re-fit to a new viewport, in CSS pixels. */
  resize(width: number, height: number, anchors: BuildingAnchors = this.anchors): void {
    if (width <= 0 || height <= 0) return;

    this.viewportWidth = width;
    this.anchors = anchors;
    this.walkLine = anchors.shorelineY + anchors.groundHeight * PROP_BASELINES.path;

    this.container.scale.set(this.pixelScaleValue);

    const context = this.context;
    for (const building of this.list) {
      building.resize(context);
      building.container.zIndex = building.worldY;
    }

    this.setViewOffset(this.viewOffset);
  }

  /** Change the pixel grid, when the sky's does. */
  setPixelScale(pixelScale: number): void {
    if (pixelScale === this.pixelScaleValue) return;
    this.pixelScaleValue = pixelScale;
    this.resize(this.viewportWidth, 1, this.anchors);
  }

  /**
   * Advance everything. `delta` is in seconds.
   *
   * Three passes over the building list, all of them O(buildings) with no
   * allocation: cull against the view, animate what survived, and find the
   * nearest zone you are inside. With a dozen landmarks that is a few dozen
   * comparisons a frame.
   */
  update(delta: number): void {
    const margin = this.cullMargin;
    const left = this.viewOffset - margin;
    const right = this.viewOffset + this.viewportWidth + margin;

    let nearest: Building | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const building of this.list) {
      const half = building.width / 2;
      building.setCulled(building.worldX + half < left || building.worldX - half > right);
      building.update(delta);

      const distance = building.zone.distanceSquared(this.focusX, this.focusY);
      const radius = building.zone.radius;
      if (distance <= radius * radius && distance < nearestDistance) {
        nearest = building;
        nearestDistance = distance;
      }
    }

    if (nearest) {
      const anchor = nearest.promptAnchor;
      this.prompt.show(nearest.zone, anchor.x, this.promptY(anchor.y - PROMPT.lift));
      this.activeBuilding = nearest;
      this.active = nearest.zone;
      // A building far enough off screen to be culled cannot be offering
      // anything you can see, whatever the arithmetic says.
      this.prompt.setOnScreen(!nearest.culled);
    } else if (this.active) {
      this.clearFocus();
    }

    this.prompt.update(delta);
  }

  destroy(): void {
    this.detach();

    this.unsubscribe?.();
    this.unsubscribe = null;

    for (const building of this.list) building.destroy();
    this.list.length = 0;
    this.registry.clear();

    this.prompt.destroy();
    this.container.destroy({ children: true });
  }

  /**
   * Tell the manager how the camera is transforming it.
   *
   * Only the prompt needs this, and only so it can stay on screen. A tall
   * building at a close zoom puts its own roof above the top of the viewport,
   * and a prompt anchored to that roof goes with it — you end up standing in
   * front of a landmark being offered something you cannot read.
   */
  setCameraView(screenY: number, zoom: number): void {
    this.viewScreenY = screenY;
    this.viewZoom = zoom > 0 ? zoom : 1;
  }

  // --- Internal --------------------------------------------------------------

  /**
   * Keep the prompt inside the frame, in the manager's own pixel grid.
   *
   * Pushed down rather than clamped to the very edge, so it still reads as
   * floating above something rather than stuck to the ceiling. Below the
   * threshold nothing happens at all — an ordinary building's prompt sits where
   * the building puts it, which is what it should do.
   */
  private promptY(wanted: number): number {
    const scale = this.pixelScaleValue * this.viewZoom;
    if (scale <= 0) return wanted;

    // The panel hangs *above* its anchor, so the anchor has to sit at least a
    // panel-height below the top of the frame. Height is already in this
    // container's own pixels, so it carries over unscaled; only the screen-space
    // margin has to be converted back through the transform.
    const margin = PROMPT.lift * this.pixelScaleValue;
    const lowest = this.prompt.height + (margin - this.viewScreenY) / scale;

    return Math.max(wanted, Math.round(lowest));
  }

  private attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener("keydown", this.onKeyDown);
  }

  private detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener("keydown", this.onKeyDown);
  }

  private clearFocus(): void {
    this.prompt.hide();
    this.active = null;
    this.activeBuilding = null;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== INTERACT_KEY) return;
    // Holding the key down is one interaction, not sixty a second.
    if (event.repeat) return;
    // Let the browser have the key while someone is typing.
    if (isTextEntry(event.target)) return;

    const zone = this.active;
    const building = this.activeBuilding;
    if (!zone || !building) return;

    event.preventDefault();
    zone.trigger();
    this.onInteractCallback?.(building);
  };
}

/** True if the event landed in something the user is typing into. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
