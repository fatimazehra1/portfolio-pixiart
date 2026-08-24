/**
 * The interact key, by `KeyboardEvent.code`. One place, so rebinding is one
 * edit rather than a search.
 *
 * The keyboard path is an optional equivalent to clicking a building, kept for
 * anyone navigating without a pointer — see `BuildingManager`'s doc comment
 * for why nothing draws a "press this" prompt over the art to advertise it.
 */
export const INTERACT_KEY = "KeyE";

export interface InteractionZoneOptions {
  /** Where the offer is, in world CSS pixels. */
  x: number;
  y: number;
  /** How close you have to be, in world CSS pixels. */
  radius: number;
  /** What the prompt calls it. */
  label: string;
  /** A 7×7 `.`/`#` bitmap shown beside the name. */
  icon?: readonly string[];
  /** What pressing the key does. */
  onInteract: () => void;
}

/**
 * A circle of ground that offers something.
 *
 * Pure geometry and a callback — no display objects, no input listener, no
 * knowledge of what is drawing it. A building owns one of these; the manager
 * decides which one is nearest and reads its label and icon for whatever
 * modern affordance the interface puts up. That separation is why a hundred
 * buildings cost one `E`-key listener rather than a hundred.
 */
export class InteractionZone {
  readonly label: string;
  readonly icon: readonly string[] | undefined;

  private readonly onInteract: () => void;

  private xValue: number;
  private yValue: number;
  private radiusValue: number;

  constructor(options: InteractionZoneOptions) {
    this.xValue = options.x;
    this.yValue = options.y;
    this.radiusValue = options.radius;
    this.label = options.label;
    this.icon = options.icon;
    this.onInteract = options.onInteract;
  }

  // --- Queries ---------------------------------------------------------------

  get x(): number {
    return this.xValue;
  }

  get y(): number {
    return this.yValue;
  }

  get radius(): number {
    return this.radiusValue;
  }

  /**
   * Whether a point is close enough, and by how much.
   *
   * Squared throughout: nothing here needs the actual distance, and comparing
   * squares saves a square root per building per frame for a number that would
   * be thrown away.
   */
  distanceSquared(x: number, y: number): number {
    const dx = x - this.xValue;
    const dy = y - this.yValue;
    return dx * dx + dy * dy;
  }

  contains(x: number, y: number): boolean {
    return this.distanceSquared(x, y) <= this.radiusValue * this.radiusValue;
  }

  // --- Commands --------------------------------------------------------------

  moveTo(x: number, y: number): void {
    this.xValue = x;
    this.yValue = y;
  }

  setRadius(radius: number): void {
    this.radiusValue = radius;
  }

  /** Take the offer. */
  trigger(): void {
    this.onInteract();
  }
}
