import type { Container } from "pixi.js";
import { StarField } from "./StarField";
import {
  MOUNT_BEFORE_LABEL,
  PHASE_VISIBILITY,
  STAR_SETTINGS,
  type StarSettings,
  type StarsOptions,
} from "./StarConfig";
import type { TimePhase } from "../time";

/**
 * The shape of a clock reading this system needs.
 *
 * Structural rather than the concrete `TimeSystem`, so the field can be driven
 * by anything that knows which two phases the world is between — but a
 * `TimeSnapshot` satisfies it exactly, which is what wires this to the existing
 * clock without either knowing about the other.
 */
export interface StarTimeSnapshot {
  phase: TimePhase;
  nextPhase: TimePhase;
  blend: number;
}

export interface StarTimeSource {
  subscribe(listener: (snapshot: StarTimeSnapshot) => void): () => void;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The star system.
 *
 * Owns a field of stars, decides how visible it should be at any moment, and
 * mounts it into the sky. It draws nothing itself and holds no colours — the
 * field is the picture, this is the switch.
 *
 * # When stars are out
 * Only dusk and night, and never as a switch being thrown. Visibility is
 * interpolated between the two phases the clock says the world is between,
 * using the clock's own blend — which is already eased and already continuous.
 * So the field uncovers across the sunset-to-dusk crossing and is gone again
 * across night-to-dawn, and there is no code path here that assigns visibility
 * outright.
 *
 * # Where it sits
 * Inside the sky's own container, immediately in front of the gradient and
 * behind everything else — which puts it behind the clouds and beneath the
 * moon, as it should be. That position is found by label rather than by index,
 * so the sky is free to reorder itself without this breaking, and the sky needs
 * no knowledge of stars at all.
 *
 * Being inside that container also means the field inherits the whole-number
 * scale that keeps the world pixel-perfect, and works in sky pixels throughout.
 *
 * # Usage
 * ```ts
 * const stars = new Stars();
 * stars.mountInto(sky.container);
 * stars.resize(sky.size.width, sky.size.height);
 * const off = stars.bindTime(timeManager.time);
 * app.ticker.add((t) => stars.update(t.deltaMS / 1000));
 * ```
 */
export class Stars {
  private readonly field: StarField;
  private readonly settings: StarSettings;
  private readonly motionScale: number;

  private unsubscribe: (() => void) | null = null;
  private visibility = 0;

  constructor(options: StarsOptions = {}) {
    this.settings = { ...STAR_SETTINGS, ...options.settings };
    this.motionScale = Math.max(0, options.motionScale ?? 1);
    this.field = new StarField(this.settings);
  }

  // --- Queries ---------------------------------------------------------------

  /** The field's container. Prefer `mountInto` over adding this by hand. */
  get container(): Container {
    return this.field.container;
  }

  /** How visible the field currently is, 0–1. */
  get alpha(): number {
    return this.visibility;
  }

  /** How many stars are in the sky. */
  get count(): number {
    return this.field.count;
  }

  // --- Commands --------------------------------------------------------------

  /**
   * Insert the field into the sky, behind the clouds and beneath the moon.
   *
   * @param parent the sky's container.
   * @param beforeLabel the child to sit immediately behind. Defaults to the sun,
   *   which the sky already draws behind both the moon and every cloud band.
   */
  mountInto(parent: Container, beforeLabel: string = MOUNT_BEFORE_LABEL): void {
    const index = parent.children.findIndex((child) => child.label === beforeLabel);

    // If that child isn't there, fall back to just above the gradient rather
    // than to the top of the pile — being wrong at the back of the sky is a
    // missing effect, being wrong at the front is stars over the clouds.
    parent.addChildAt(this.container, index >= 0 ? index : Math.min(1, parent.children.length));
  }

  /** Re-fit the field. Dimensions are in sky pixels, from `SkySystem.size`. */
  resize(skyWidth: number, skyHeight: number): void {
    this.field.resize(skyWidth, skyHeight);
  }

  /**
   * Follow a clock. Returns an unsubscribe function.
   *
   * Fires immediately with the current time, so a sky loaded at midnight has
   * its stars from the first frame rather than from the next phase change.
   */
  bindTime(source: StarTimeSource): () => void {
    this.unsubscribe?.();

    this.unsubscribe = source.subscribe((snapshot) => {
      this.applyTime(snapshot);
    });

    return () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
    };
  }

  /** Set visibility from a clock reading, without subscribing to anything. */
  applyTime(snapshot: StarTimeSnapshot): void {
    const from = PHASE_VISIBILITY[snapshot.phase] ?? 0;
    const to = PHASE_VISIBILITY[snapshot.nextPhase] ?? from;
    const blend = snapshot.blend < 0 ? 0 : snapshot.blend > 1 ? 1 : snapshot.blend;

    this.setVisibility(lerp(from, to, blend));
  }

  /** Set visibility directly, 0–1. */
  setVisibility(alpha: number): void {
    this.visibility = alpha;
    this.field.setVisibility(alpha);
    // Under reduced motion `update` never advances, so the new brightness has
    // to be pushed here or the field would fade in still holding zeros.
    if (this.motionScale === 0) this.field.refresh();
  }

  /** Advance the twinkle. `delta` is seconds. */
  update(delta: number): void {
    const step = delta * this.motionScale;
    if (step <= 0) return;
    this.field.update(step);
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.field.destroy();
  }
}
