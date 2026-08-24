import { Container, Rectangle, Sprite } from "pixi.js";
import { InteractionZone } from "./InteractionZone";
import { Pixels, type BuildingRenderer } from "./BuildingRenderer";
import { BUILDING_PLOTS, PROP_BASELINES } from "../ground";
import type { GroundBand, PlotArea } from "../ground";
import type { LightingState } from "../lighting";

/** Where the land is, in CSS pixels. Read off the ground rather than recomputed. */
export interface BuildingAnchors {
  /** Where the land begins — `Ground.topY`. */
  shorelineY: number;
  /** How tall the land band is. */
  groundHeight: number;
}

/** Everything a building needs from the world in order to stand in it. */
export interface BuildingContext {
  /** Total width of the world, in CSS pixels. */
  worldWidth: number;
  /** Pass the sky's `pixelScale` so every system shares one pixel grid. */
  pixelScale: number;
  anchors: BuildingAnchors;
  /** Global motion multiplier. 0 for `prefers-reduced-motion: reduce`. */
  motionScale: number;
  /**
   * Ground kept clear, as fractions of *this world's* width.
   *
   * Defaults to the coastline's own layout, which is what the whole waterfront
   * used before there was more than one world. A chapter world passes its own —
   * its scenes rebased onto its own origin — because a plot expressed as a
   * fraction of the ten-scene coast means nothing inside a world that contains
   * one of them. This is the one line that stopped every building assuming it
   * stood somewhere along a single shore.
   */
  plots?: readonly PlotArea[];
}

/**
 * What a building *is*, before any of it is drawn.
 *
 * The whole identity of a landmark in one object: who it is, where it stands and
 * how close you have to be. A new career building is this plus a renderer.
 */
export interface BuildingDefinition {
  /** Stable, machine-readable. Used as the registry key. */
  id: string;
  /** What the world calls it, and what the prompt shows. */
  name: string;
  /**
   * Which reserved plot it stands on, by name.
   *
   * Read from the ground's own layout rather than restated, so a building is
   * guaranteed to land on ground that was deliberately kept clear of planting
   * (GroundLayout §BUILDING_PLOTS).
   */
  plot: string;
  /** Where along that plot it stands, 0–1. Defaults to the middle. */
  plotPosition?: number;
  /** Which band of the land it stands on. Defaults to the building verge. */
  band?: GroundBand;
  /**
   * How close you have to be for the prompt, in CSS pixels.
   *
   * Defaults to a little over half the building's own width, so the offer
   * appears as the building fills the view rather than at some distance
   * unrelated to how big it is.
   */
  interactionRadius?: number;
  /** A 7×7 `.`/`#` marker shown beside the name on the prompt. */
  icon?: readonly string[];
}

/** Fraction of a building's width used as its interaction radius by default. */
const DEFAULT_RADIUS_RATIO = 0.62;

/**
 * A landmark in the world.
 *
 * # The template
 * This is the whole contract every career building follows. A subclass supplies
 * a definition and a renderer and gets, without writing any of it: placement on
 * a reserved plot, a pixel grid shared with the shore, day/night lighting, an
 * interaction zone, camera culling and teardown. Adding the next one is
 *
 * ```ts
 * export class Planet01Building extends Building {
 *   constructor(context: BuildingContext) {
 *     super(PLANET01, new Planet01Renderer(context.motionScale), context);
 *   }
 * }
 * ```
 *
 * and nothing in this file, the manager or the renderer base changes.
 *
 * # What it does not do
 * It does not listen to input, own a prompt, or decide whether it is the nearest
 * thing to you — those are the manager's, because they are questions about *all*
 * the buildings and answering them per building is how you end up with ten
 * prompts and ten keyboard listeners.
 */
export abstract class Building {
  /** The building's artwork. Mounted into the manager's world container. */
  readonly container = new Container();

  readonly id: string;
  readonly name: string;
  readonly zone: InteractionZone;

  protected readonly renderer: BuildingRenderer;
  protected readonly definition: BuildingDefinition;

  private readonly motionScale: number;
  private readonly explicitRadius: number | undefined;
  /** A hard-edged outline, shown while the pointer is on the building. */
  private readonly highlight: Sprite;

  private pixelScaleValue = 1;
  /** Position in world pixels — the grid the manager's container works in. */
  private pixelX = 0;
  private pixelBaseY = 0;

  private elapsed = 0;
  private culledValue = false;
  private hoverTarget = 0;
  private hoverAmount = 0;

  constructor(
    definition: BuildingDefinition,
    renderer: BuildingRenderer,
    context: BuildingContext
  ) {
    this.definition = definition;
    this.renderer = renderer;
    this.id = definition.id;
    this.name = definition.name;
    this.motionScale = Math.max(0, context.motionScale);
    this.explicitRadius = definition.interactionRadius;

    this.container.label = `building:${definition.id}`;
    this.container.addChild(renderer.container);

    renderer.build();

    // A building is a place you can point at and click, not just walk up to.
    // The hit region is the artwork's own bounding box, in the same unscaled
    // grid `renderer.width`/`renderer.height` already use — set once, because
    // a building's own art never changes size.
    const half = renderer.width >> 1;
    this.container.eventMode = "static";
    this.container.cursor = "pointer";
    this.container.hitArea = new Rectangle(-half, -renderer.height, renderer.width, renderer.height);

    // The highlight itself: a frame a few pixels proud of the artwork, hidden
    // until hovered. `BuildingManager` decides *when* to show it; this only
    // owns how it looks, the same split every other visual here follows.
    const pad = 3;
    const frame = new Pixels(renderer.width + pad * 2, renderer.height + pad * 2);
    frame.frame(0, 0, frame.width, frame.height);
    this.highlight = new Sprite(frame.bake());
    this.highlight.tint = 0xffe4a3;
    this.highlight.alpha = 0;
    this.highlight.eventMode = "none";
    this.highlight.position.set(-half - pad, -renderer.height - pad);
    this.container.addChild(this.highlight);

    this.zone = new InteractionZone({
      x: 0,
      y: 0,
      radius: 1,
      label: definition.name,
      icon: definition.icon,
      // Bound once, here. A zone that reached back into the building for its
      // behaviour would make every building's interaction the manager's problem.
      onInteract: () => this.interact(),
    });

    this.resize(context);
  }

  // --- Queries ---------------------------------------------------------------

  /** Centre line, in world CSS pixels. */
  get worldX(): number {
    return this.pixelX * this.pixelScaleValue;
  }

  /** The baseline it stands on, in world CSS pixels. */
  get worldY(): number {
    return this.pixelBaseY * this.pixelScaleValue;
  }

  get width(): number {
    return this.renderer.width * this.pixelScaleValue;
  }

  get height(): number {
    return this.renderer.height * this.pixelScaleValue;
  }

  get interactionRadius(): number {
    return this.zone.radius;
  }

  /** Whether the camera has this out of view. Culled buildings do not animate. */
  get culled(): boolean {
    return this.culledValue;
  }

  /** Where the prompt should point, in the manager's pixel grid. */
  get promptAnchor(): { x: number; y: number } {
    return { x: this.pixelX, y: this.pixelBaseY - this.renderer.promptTop };
  }

  // --- Commands --------------------------------------------------------------

  /** Re-fit to a new viewport and a new shore. */
  resize(context: BuildingContext): void {
    this.pixelScaleValue = context.pixelScale;

    const plots = context.plots ?? BUILDING_PLOTS;
    const plot = plots.find((p) => p.name === this.definition.plot);
    // A world with no plot of that name still gets its building, in the middle
    // rather than nowhere — a missing layout entry should look wrong, not throw.
    const position = this.definition.plotPosition ?? 0.5;
    const fraction = plot ? plot.from + (plot.to - plot.from) * position : 0.5;

    const band = this.definition.band ?? "backVerge";
    const baseY =
      context.anchors.shorelineY + context.anchors.groundHeight * PROP_BASELINES[band];

    this.pixelX = Math.round((fraction * context.worldWidth) / context.pixelScale);
    this.pixelBaseY = Math.round(baseY / context.pixelScale);

    // The artwork is anchored at its foot and centred on the building's line.
    this.renderer.container.position.set(-(this.renderer.width >> 1), 0);
    this.container.position.set(this.pixelX, this.pixelBaseY);

    this.zone.moveTo(this.worldX, this.worldY);
    this.zone.setRadius(this.explicitRadius ?? this.width * DEFAULT_RADIUS_RATIO);
  }

  /** Light the building. Called by the manager, which owns the subscription. */
  applyLighting(state: LightingState): void {
    this.renderer.applyLighting(state);
  }

  /** Take the building in or out of the view. */
  setCulled(culled: boolean): void {
    if (this.culledValue === culled) return;
    this.culledValue = culled;
    this.container.visible = !culled;
  }

  /**
   * Advance the idle animation. `delta` is in seconds.
   *
   * A culled building does nothing at all — which is the point of culling, and
   * why a world of twenty landmarks costs the same as a world of the two you can
   * currently see.
   */
  /**
   * The pointer is on this building, or has left it.
   *
   * Called by the manager — it decides which building is under the pointer,
   * this only owns what that looks like. See the class doc's "what it does
   * not do".
   */
  setHovered(hovering: boolean): void {
    this.hoverTarget = hovering ? 1 : 0;
  }

  update(delta: number): void {
    if (this.culledValue) return;

    // The hover ring is feedback for the pointer, not ambient motion, so it
    // still responds under `prefers-reduced-motion` — it just snaps instead
    // of easing.
    const hoverRate = this.motionScale > 0 ? 10 : 40;
    const hoverStep = 1 - Math.exp(-hoverRate * delta);
    this.hoverAmount += (this.hoverTarget - this.hoverAmount) * hoverStep;
    if (Math.abs(this.hoverTarget - this.hoverAmount) < 0.002) this.hoverAmount = this.hoverTarget;
    this.highlight.alpha = this.hoverAmount * 0.8;

    const step = delta * this.motionScale;
    if (step <= 0) return;

    this.elapsed += step;
    this.renderer.tick(this.elapsed);
  }

  destroy(): void {
    this.container.removeAllListeners();
    this.highlight.texture.destroy(true);
    this.renderer.destroy();
    this.container.destroy({ children: true });
  }

  // --- For subclasses --------------------------------------------------------

  /**
   * What pressing the key does.
   *
   * Deliberately the only thing a building has to override beyond its artwork.
   * Everything a landmark will eventually open — dialogue, a timeline, a resume
   * card — hangs off this one method, and none of it exists yet.
   */
  protected abstract interact(): void;
}
