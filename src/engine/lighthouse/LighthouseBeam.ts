import { Container, Sprite, Texture } from "pixi.js";
import { ditherAlpha, maskToTexture as bakeMask } from "../shared";
import { BEAM_SETTINGS, EMISSIVE, type BeamSettings } from "./LighthouseConfig";

const TAU = Math.PI * 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where the lamp is and what the beam is sweeping over, in lighthouse pixels. */
export interface BeamGeometry {
  /** The lamp itself — the apex of the cone. */
  lampX: number;
  lampY: number;
  /** The sky/sea horizon. Where a beam pointing out to sea recedes to. */
  horizonY: number;
  /** Where the land begins. The beam never reaches past this. */
  shorelineY: number;
}

// --- Baking ------------------------------------------------------------------

/** Bake with the lighthouse's name on any failure. See `@/engine/shared`. */
function maskToTexture(width: number, height: number, mask: Uint8Array): Texture {
  return bakeMask(width, height, mask, "Lighthouse");
}

/**
 * The shaft: a wedge that opens out from the lamp and fades as it goes.
 *
 * Baked with its apex at the left edge, vertically centred, so the sprite can be
 * anchored there and simply rotated to point wherever the light is looking.
 *
 * Two falloffs multiply: along the beam, because light thins with distance, and
 * across it, because the edges of a cone are where you are seeing least of it.
 * The cross-section is squared rather than linear — a linear edge reads as a
 * solid triangle with a soft border, and what this wants is a shaft with no
 * discernible border at all.
 */
function createShaftTexture(settings: BeamSettings): Texture {
  const length = Math.max(8, Math.round(settings.length));
  const halfWidth = Math.max(2, Math.round(Math.tan(settings.spread) * length));
  const height = halfWidth * 2;
  const mask = new Uint8Array(length * height);

  for (let x = 0; x < length; x++) {
    const along = x / (length - 1);
    // Fades to nothing by the far end, so the beam has no cut-off edge to give
    // away where the texture stops.
    const reach = (1 - along) ** 1.6;
    // The cone is a point at the lamp and its full width at the far end.
    const spread = Math.max(1, along * halfWidth);

    for (let y = 0; y < height; y++) {
      const across = Math.abs(y + 0.5 - halfWidth) / spread;
      if (across > 1) continue;

      const profile = (1 - across * across) ** 2;
      mask[y * length + x] = ditherAlpha(reach * profile, settings.levels, x, y);
    }
  }

  return maskToTexture(length, height, mask);
}

/**
 * A soft round glow, optionally flattened into an ellipse.
 *
 * Used twice: round, for the halo around the lamp; and flattened, for the pool
 * of light lying on the water — which is the same light seen at a glancing
 * angle, so squashing one shape is not a shortcut, it's the geometry.
 */
function createGlowTexture(
  radius: number,
  core: number,
  aspect: number,
  levels: number
): Texture {
  const ry = Math.max(2, Math.round(radius));
  const rx = Math.max(2, Math.round(radius * aspect));
  const width = rx * 2;
  const height = ry * 2;
  const coreRatio = clamp01(core / radius);
  const mask = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const dy = (y + 0.5 - ry) / ry;
    for (let x = 0; x < width; x++) {
      const dx = (x + 0.5 - rx) / rx;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;

      const t = d <= coreRatio ? 1 : 1 - (d - coreRatio) / (1 - coreRatio);
      mask[y * width + x] = ditherAlpha(t * t, levels, x, y);
    }
  }

  return maskToTexture(width, height, mask);
}

// --- The beam ----------------------------------------------------------------

/**
 * The rotating beam.
 *
 * # What is actually being drawn
 * The light turns in a horizontal circle at the top of the tower, and this is
 * that circle seen from the side. The far end of the beam is tracked around an
 * ellipse — swinging out to `sweep` pixels either side, and running from the
 * horizon when the light points out to sea to the near water when it points
 * back at the viewer. The shaft is then simply a wedge stretched from the lamp
 * to wherever that end currently is.
 *
 * Three things fall out of that one ellipse for free: the beam foreshortens as
 * it turns end-on, it sweeps *along* the water rather than across the screen,
 * and it lays its light nearer the shore as it comes around to face you.
 *
 * # Why it changes brightness
 * A beam is most visible side-on, where the light is crossing the most air
 * between the lamp and the eye, and nearly invisible end-on — so the shaft
 * follows `|sin|` of its own rotation. The lamp does the opposite: it flares as
 * it comes around to point at you, which is the flash a lighthouse is *for*.
 * Neither is a keyframe or a curve someone drew; both are the same angle read
 * two ways, which is why the rhythm feels like a machine turning.
 *
 * # Front and back
 * The shaft is drawn twice, once behind the tower and once in front, and the two
 * are cross-faded by how far the light is pointing away from the viewer. So the
 * beam passes behind its own tower and comes back out the other side, which
 * costs one extra sprite and is most of what sells the rotation as rotation.
 *
 * # Where the light goes
 * Everything here is additive and mounts in front of the sea, so the water
 * genuinely brightens where the beam crosses it rather than having a lighter
 * shape drawn over it. Nothing in the ocean system knows this exists.
 */
export class LighthouseBeam {
  /** Mounts *behind* the tower. */
  readonly back = new Container();
  /** Mounts *in front of* the tower. */
  readonly front = new Container();

  private readonly settings: BeamSettings;
  private readonly motionScale: number;

  private readonly shaftBack: Sprite;
  private readonly shaftFront: Sprite;
  private readonly halo: Sprite;
  private readonly flare: Sprite;
  private readonly pool: Sprite;

  private readonly shaftTexture: Texture;
  private readonly glowTexture: Texture;
  private readonly poolTexture: Texture;

  private geometry: BeamGeometry = { lampX: 0, lampY: 0, horizonY: 0, shorelineY: 0 };
  private angleValue: number;
  /** 0 by day, 1 at night. Everything drawn here is multiplied by it. */
  private activation = 0;

  constructor(settings: Partial<BeamSettings> = {}, motionScale = 1) {
    this.settings = { ...BEAM_SETTINGS, ...settings };
    this.motionScale = Math.max(0, motionScale);
    this.angleValue = this.settings.startAngle;

    this.back.label = "lighthouse:beam-back";
    this.front.label = "lighthouse:beam-front";

    this.shaftTexture = createShaftTexture(this.settings);
    this.glowTexture = createGlowTexture(
      this.settings.glowRadius,
      this.settings.glowCore,
      1,
      this.settings.levels
    );
    this.poolTexture = createGlowTexture(
      this.settings.poolRadius,
      this.settings.poolRadius * 0.15,
      this.settings.poolAspect,
      this.settings.levels
    );

    this.shaftBack = this.makeShaft();
    this.shaftFront = this.makeShaft();
    this.halo = this.makeSprite(this.glowTexture, EMISSIVE.lamp);
    this.flare = this.makeSprite(this.glowTexture, EMISSIVE.lamp);
    this.pool = this.makeSprite(this.poolTexture, EMISSIVE.lamp);

    // The pool lies on the water behind the tower — the tower stands between the
    // viewer and the sea, so light landing on water it happens to cover must not
    // be drawn over it.
    //
    // The lamp's halo goes behind for the same reason and a better one: a glow
    // wide enough to be worth having is wide enough to swallow the dome and the
    // gallery, and the silhouette is most of why the building is worth drawing.
    // Behind the tower it haloes the shape instead of dissolving it.
    this.back.addChild(this.halo, this.pool, this.shaftBack);
    // Only the flare is allowed in front, and only for the moment the light is
    // pointing at you — which is when it really would be shining past the glass
    // and into your eyes.
    this.front.addChild(this.shaftFront, this.flare);

    this.apply();
  }

  // --- Queries ---------------------------------------------------------------

  /** Where the light is pointing, in radians. 0 is straight at the viewer. */
  get angle(): number {
    return this.angleValue;
  }

  /** How lit the beam currently is, 0–1. */
  get intensity(): number {
    return this.activation;
  }

  // --- Commands --------------------------------------------------------------

  /** Tell the beam where the lamp is and what it is sweeping over. */
  setGeometry(geometry: BeamGeometry): void {
    this.geometry = geometry;
    this.apply();
  }

  /**
   * How lit the beam is, 0–1.
   *
   * Feed this from the lighting system's `localLightMultiplier` and the beam
   * puts itself out over the course of the morning and comes back at dusk with
   * nothing here having an opinion about what time it is.
   */
  setActivation(activation: number): void {
    this.activation = clamp01(activation);
    this.apply();
  }

  /** Turn the light. `delta` is in seconds. */
  update(delta: number): void {
    const step = delta * this.motionScale;
    if (step > 0) {
      // Constant rate, unconditionally — a lighthouse does not ease.
      this.angleValue = (this.angleValue + (TAU * step) / this.settings.periodSeconds) % TAU;
    }
    this.apply();
  }

  destroy(): void {
    this.back.destroy({ children: true });
    this.front.destroy({ children: true });
    this.shaftTexture.destroy(true);
    this.glowTexture.destroy(true);
    this.poolTexture.destroy(true);
  }

  // --- Internal --------------------------------------------------------------

  private makeShaft(): Sprite {
    const sprite = this.makeSprite(this.shaftTexture, EMISSIVE.lamp);
    // Apex at the lamp, so rotation happens about the source of the light.
    sprite.anchor.set(0, 0.5);
    return sprite;
  }

  private makeSprite(texture: Texture, tint: number): Sprite {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.tint = tint;
    // Light adds to what is behind it. This is what brightens the sea rather
    // than covering it, and it is why nothing here needs the ocean's palette.
    sprite.blendMode = "add";
    sprite.eventMode = "none";
    return sprite;
  }

  /** Place every piece from the current angle, geometry and activation. */
  private apply(): void {
    const { lampX, lampY, horizonY, shorelineY } = this.geometry;
    const s = this.settings;

    const sin = Math.sin(this.angleValue);
    const cos = Math.cos(this.angleValue);
    /** 1 when the light points straight at the viewer, 0 when it points out to sea. */
    const facing = (1 + cos) / 2;
    /** How side-on the beam is — 1 when it lies straight across the view. */
    const broadside = Math.abs(sin);

    // The far end of the beam, tracked around its ellipse on the water.
    const nearY = lerp(horizonY, shorelineY, s.nearWater);
    const tipX = lampX + s.sweep * sin;
    const tipY = lerp(horizonY, nearY, facing);

    const dx = tipX - lampX;
    const dy = tipY - lampY;
    const length = Math.hypot(dx, dy);
    const rotation = Math.atan2(dy, dx);
    // Uniform, so the cone keeps its angular width however far it reaches.
    const scale = length / s.length;

    for (const shaft of [this.shaftBack, this.shaftFront]) {
      shaft.position.set(lampX, lampY);
      shaft.rotation = rotation;
      shaft.scale.set(scale);
    }

    const shaftAlpha =
      this.activation * s.shaftAlpha * (s.shaftMin + (1 - s.shaftMin) * broadside);

    // Cross-fade the two copies rather than reparenting: the same total light,
    // but how much of it the tower is allowed to hide changes smoothly.
    this.shaftBack.alpha = shaftAlpha * (1 - facing);
    this.shaftFront.alpha = shaftAlpha * facing;

    this.halo.position.set(lampX, lampY);
    this.halo.alpha = this.activation * s.glowAlpha;

    this.flare.position.set(lampX, lampY);
    this.flare.alpha = this.activation * s.glowFlare * facing ** s.flarePower;

    // The pool sits where the beam lands, and is strongest when the beam is
    // both bright and striking the water at a glancing angle.
    this.pool.position.set(tipX, tipY);
    this.pool.alpha = this.activation * s.poolAlpha * (0.35 + 0.65 * broadside);
  }
}
