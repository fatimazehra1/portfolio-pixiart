import { BuildingRenderer, type LayerMaterial } from "../BuildingRenderer";

/**
 * The BBIT Spire, in pixels.
 *
 * # One window
 * Everything in this building exists to make a single detail unmissable: the
 * second window from the top, on the right, is warmly lit at **every hour of
 * the day and night**, and every other window on the tower is dark. A degree
 * taken alongside full-time work is somebody at a desk when the rest of the
 * building has gone home, and that is the only way a tower can say so.
 *
 * The lit window is the one emissive layer here whose `dayAlpha` equals its
 * `nightAlpha` — see `MATERIALS.lateWindow`. It does not respond to the clock
 * at all, which is deliberate and is the same exemption the lighthouse beam
 * gets, for the same kind of reason.
 *
 * # Slim, not big
 * Narrow, tall, plain stone, with a stepped parapet, a small clock face and a
 * crest below it. Aptech is wide, Planet01 is a slab, Vaultsys is a block; this
 * is the only vertical, and it is vertical by proportion rather than by height
 * — it is not the tallest thing on the shore and should not try to be.
 *
 * TODO(assets): plotted in code because `public/assets/buildings/` is empty.
 * Authored art replaces `plot()` alone.
 */

// --- Dimensions --------------------------------------------------------------

/**
 * A tower five and a bit times taller than it is wide.
 *
 * The proportion is the design. At three times it reads as a block with an
 * ambitious roof; past six it reads as a chimney.
 */
const W = 46;
const H = 158;

const BASE = H - 2;

/** The shaft: the tower proper, between its plinth and its parapet. */
const SHAFT = { x: 12, width: 22, top: 26 };
/** The plinth it stands on, wider than the shaft by two pixels a side. */
const PLINTH = { top: BASE - 14 };
/** The parapet and the short pitched cap over it. */
const PARAPET = { top: 18, height: 8 };
const SPIRE_TOP = 4;

/** Where the clock face and the crest sit on the shaft. */
const CLOCK = { cy: 40, radius: 6 };
/**
 * The crest hangs on the *left* of the shaft, not on its axis.
 *
 * Centred, it collided with the lit window — and on a shaft twenty-two pixels
 * wide there is only room for one of them per storey. The window wins that
 * argument every time, so the crest steps aside.
 */
const CREST = { top: 48, cx: 18, halfWidth: 4 };

/** Five storeys of windows up the shaft, plus the lit one. */
const WINDOW_W = 5;
const WINDOW_H = 9;
const FIRST_WINDOW = 66;
const WINDOW_PITCH = 17;
const WINDOW_ROWS = 5;

// --- Animation ---------------------------------------------------------------

/**
 * The lit window's own unsteadiness.
 *
 * Very shallow, and never near zero: this window is never *off*. It is a desk
 * lamp with somebody moving in front of it, and once in a while the shadow of
 * a head crosses it.
 */
const LAMP_RATE = 0.42;
const LAMP_DEPTH = 0.08;
const SHADOW_PERIOD = 17.3;
const SHADOW_LENGTH = 1.1;

/** The clock's hands. Twelve frames — one an hour, which is fast enough. */
const CLOCK_FRAMES = 12;
const CLOCK_SECONDS = 4.5;

// --- Materials ---------------------------------------------------------------

/**
 * Grey-brown ashlar and a copper cap. Understated on purpose.
 *
 * This is a modest civic building, not a cathedral: no gilding, no colour above
 * the crest, and a palette that sits a step cooler than everything around it so
 * the one warm window has nothing to compete with.
 */
const MATERIALS: Record<string, LayerMaterial> = {
  stone: { color: 0x9a9184 },
  stoneLight: { color: 0xb5ab9c },
  stoneDark: { color: 0x6f6659 },
  /** The coursing lines, and the shadow under every string course. */
  course: { color: 0x5d554a },
  /** The plinth and the steps, a shade browner than the shaft. */
  base: { color: 0x8c8171 },
  baseDark: { color: 0x635a4d },

  /** The cap: oxidised copper, the only colour on the building. */
  copper: { color: 0x6f9585 },
  copperDark: { color: 0x4c6c60 },

  /** Window reveals, the door, and the clock's frame. */
  frame: { color: 0x51483d },
  /** Unlit glass: cold, and darker than the stone around it. */
  glass: { color: 0x474f59 },

  /**
   * The one window that is always on.
   *
   * `dayAlpha` and `nightAlpha` are equal on purpose. Every other lit window in
   * this world fades out with the hour; this one cannot, because "still lit at
   * every hour" is the entire content of the building.
   */
  lateWindow: { color: 0xffd692, emissive: true, dayAlpha: 1, nightAlpha: 1 },
  /** The sill and reveal it washes, and the faint halo on the stone around it. */
  lateSpill: { color: 0xf0b775, emissive: true, dayAlpha: 0.55, nightAlpha: 0.95 },

  /** The clock face, and its two hands. */
  face: { color: 0xd8d0bd },
  hands: { color: 0x3f382f },
};

const ORDER = [
  "base",
  "baseDark",
  "stone",
  "stoneLight",
  "stoneDark",
  "course",
  "glass",
  "lateSpill",
  "lateWindow",
  "frame",
  "face",
  "hands",
  "copper",
  "copperDark",
];

export class BbitRenderer extends BuildingRenderer {
  private clockFrame = -1;

  constructor(private readonly motionScale = 1) {
    super(W, H);
  }

  protected get order(): readonly string[] {
    return ORDER;
  }

  protected get materials(): Record<string, LayerMaterial> {
    return MATERIALS;
  }

  /** The cap. On a tower this narrow the prompt belongs over the spire. */
  override get promptTop(): number {
    return H;
  }

  // --- Plotting --------------------------------------------------------------

  protected plot(): void {
    this.plotPlinth();
    this.plotShaft();
    this.plotWindows();
    this.plotLateWindow();
    this.plotClock();
    this.plotCrest();
    this.plotParapet();
  }

  /** A stepped plinth and a small arched door. Where you go in. */
  private plotPlinth(): void {
    const base = this.pixels("base");
    const dark = this.pixels("baseDark");
    const frame = this.pixels("frame");

    base.rect(SHAFT.x - 4, PLINTH.top, SHAFT.width + 8, BASE - PLINTH.top);
    dark.hLine(BASE - 1, SHAFT.x - 4, SHAFT.x + SHAFT.width + 3);
    dark.vLine(SHAFT.x + SHAFT.width + 3, PLINTH.top, BASE - 1);
    this.pixels("stoneLight").vLine(SHAFT.x - 4, PLINTH.top, BASE - 2);

    // Two steps out to the ground, so the door is above the grass.
    base.rect(SHAFT.x - 6, BASE - 3, SHAFT.width + 12, 2);
    dark.hLine(BASE - 1, SHAFT.x - 6, SHAFT.x + SHAFT.width + 5);

    // The door: a round-headed opening, dark inside.
    const cx = SHAFT.x + (SHAFT.width >> 1);
    const half = 3;
    const top = PLINTH.top + 3;
    for (let y = top; y < BASE - 3; y++) {
      const t = (y - top) / 3;
      const w = t >= 1 ? half : Math.round(half * Math.sqrt(Math.max(0, t)));
      if (w <= 0) continue;
      frame.hLine(y, cx - w, cx + w - 1);
    }
    // A step light over the door, unlit — this building closes.
    this.pixels("stoneDark").hLine(top - 1, cx - 4, cx + 3);
  }

  /** The shaft: ashlar with a string course every few storeys. */
  private plotShaft(): void {
    const stone = this.pixels("stone");
    const light = this.pixels("stoneLight");
    const dark = this.pixels("stoneDark");
    const course = this.pixels("course");

    const right = SHAFT.x + SHAFT.width - 1;
    stone.rect(SHAFT.x, SHAFT.top, SHAFT.width, PLINTH.top - SHAFT.top);

    // Lit down the left, shadowed down the right, like everything on this shore.
    light.vLine(SHAFT.x, SHAFT.top, PLINTH.top - 1);
    light.vLine(SHAFT.x + 1, SHAFT.top, PLINTH.top - 1, 130);
    dark.vLine(right, SHAFT.top, PLINTH.top - 1);
    dark.vLine(right - 1, SHAFT.top, PLINTH.top - 1, 130);

    // Ashlar coursing: a faint line every four rows, with the joints staggered.
    // At this width it is the only thing keeping the shaft from reading as a
    // painted stripe.
    for (let y = SHAFT.top + 3; y < PLINTH.top; y += 4) {
      course.hLine(y, SHAFT.x + 1, right - 1, 55);
      const joint = SHAFT.x + 5 + ((y / 4) % 3) * 6;
      course.vLine(joint, y - 3, y - 1, 45);
    }

    // Two string courses, standing proud, which give the tower its storeys.
    for (const y of [FIRST_WINDOW + WINDOW_PITCH * 2 + 12, PLINTH.top - 22]) {
      stone.rect(SHAFT.x - 1, y, SHAFT.width + 2, 2);
      dark.hLine(y + 2, SHAFT.x - 1, right + 1);
      light.hLine(y, SHAFT.x - 1, right + 1, 150);
    }
  }

  /**
   * The dark windows: five storeys of them, one per floor, all cold.
   *
   * Deliberately unlit, at every hour. A tower with four lit windows and one
   * *slightly brighter* window says nothing; a tower with one lit window and
   * nine dark ones says exactly one thing.
   */
  private plotWindows(): void {
    const glass = this.pixels("glass");
    const frame = this.pixels("frame");
    const stone = this.pixels("stone");
    const cx = SHAFT.x + (SHAFT.width >> 1);

    for (let row = 0; row < WINDOW_ROWS; row++) {
      const y = FIRST_WINDOW + row * WINDOW_PITCH;
      // Alternating: a single centred light on one floor, a pair on the next.
      const columns = row % 2 === 0 ? [cx - 2] : [cx - 7, cx + 3];
      for (const x of columns) {
        stone.rect(x, y, WINDOW_W, WINDOW_H, 0);
        glass.rect(x, y, WINDOW_W, WINDOW_H);
        frame.frame(x - 1, y - 1, WINDOW_W + 2, WINDOW_H + 2);
        // A transom, so each opening reads as a window and not a slot.
        frame.hLine(y + 3, x, x + WINDOW_W - 1);
      }
    }
  }

  /**
   * The lit one: second opening from the top, on the right.
   *
   * Given a deeper reveal and a sill than any other window on the building, and
   * a halo washed onto the stone around it, so it reads as a source rather than
   * as a yellow rectangle. It is placed high because that is where the small
   * rooms are, and to the right so it sits off the tower's axis — dead centre
   * would read as decoration.
   */
  private plotLateWindow(): void {
    const lit = this.pixels("lateWindow");
    const spill = this.pixels("lateSpill");
    const frame = this.pixels("frame");
    const stone = this.pixels("stone");

    const x = SHAFT.x + SHAFT.width - 9;
    const y = FIRST_WINDOW - WINDOW_PITCH + 4;

    stone.rect(x, y, WINDOW_W + 1, WINDOW_H, 0);
    lit.rect(x, y, WINDOW_W + 1, WINDOW_H);
    // Glazing bars cut back through the glow, so it is a window with somebody
    // behind it rather than a lamp set into a wall.
    lit.hLine(y + 4, x, x + WINDOW_W, 0);
    lit.vLine(x + 2, y, y + WINDOW_H - 1, 0);
    frame.frame(x - 1, y - 1, WINDOW_W + 3, WINDOW_H + 2);
    frame.hLine(y + 4, x, x + WINDOW_W);
    frame.vLine(x + 2, y, y + WINDOW_H - 1);

    // The sill it stands on, and the light lying along it.
    this.pixels("stoneDark").hLine(y + WINDOW_H + 1, x - 2, x + WINDOW_W + 2);
    spill.hLine(y + WINDOW_H + 2, x - 2, x + WINDOW_W + 2, 180);

    // A halo on the stone: brightest at the reveal, gone within four pixels.
    for (let ring = 1; ring <= 4; ring++) {
      const alpha = Math.round(120 / (ring + 0.6));
      spill.frame(x - 1 - ring, y - 1 - ring, WINDOW_W + 3 + ring * 2, WINDOW_H + 2 + ring * 2, alpha);
    }
  }

  /**
   * The clock: a face near the top, with hands that actually go round.
   *
   * Twelve frames, one per hour position. It is not wired to the world clock —
   * the world's hour is a *look*, not a time of day you could read off a dial,
   * and a clock claiming to tell you the hour would be the one detail on this
   * shore making a promise the rest of it does not keep.
   */
  private plotClock(): void {
    const face = this.pixels("face");
    const frame = this.pixels("frame");
    const cx = SHAFT.x + (SHAFT.width >> 1);
    const cy = CLOCK.cy;
    const r = CLOCK.radius;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > r) continue;
        if (d > r - 1.2) frame.set(cx + dx, cy + dy);
        else face.set(cx + dx, cy + dy);
      }
    }
    // Twelve, three, six and nine, as single pixels.
    frame.set(cx, cy - r + 2);
    frame.set(cx, cy + r - 2);
    frame.set(cx - r + 2, cy);
    frame.set(cx + r - 2, cy);

    for (let f = 0; f < CLOCK_FRAMES; f++) {
      const hands = this.pixels("hands", f);
      const angle = (f / CLOCK_FRAMES) * Math.PI * 2;
      // The minute hand goes round once per revolution of the frames; the hour
      // hand crawls a twelfth as far, which is what makes it read as a clock.
      this.plotHand(hands, cx, cy, angle, r - 2);
      this.plotHand(hands, cx, cy, angle / 12 + Math.PI * 0.6, r - 4);
    }
  }

  /** One hand, from the centre outward. */
  private plotHand(
    hands: ReturnType<BbitRenderer["pixels"]>,
    cx: number,
    cy: number,
    angle: number,
    length: number
  ): void {
    for (let i = 0; i <= length; i++) {
      hands.set(cx + Math.round(Math.sin(angle) * i), cy - Math.round(Math.cos(angle) * i));
    }
  }

  /**
   * The crest: a shield under the clock, plain enough to be any faculty's.
   *
   * Three bands and a chevron. No lettering — five glyphs at this width would
   * be two pixels a letter, which is a smudge with ambitions.
   */
  private plotCrest(): void {
    const stone = this.pixels("stoneLight");
    const dark = this.pixels("stoneDark");
    const frame = this.pixels("frame");
    const cx = CREST.cx;
    const top = CREST.top;
    const w = CREST.halfWidth;

    // The shield: straight shoulders, tapering to a point.
    for (let dy = 0; dy < 10; dy++) {
      const t = dy / 9;
      const half = Math.round(w * (1 - t * t * 0.85));
      if (half <= 0) break;
      stone.hLine(top + dy, cx - half, cx + half - 1);
      dark.set(cx + half - 1, top + dy);
    }
    frame.hLine(top + 3, cx - w + 1, cx + w - 2, 170);
    // A chevron across it.
    for (let i = 0; i < 3; i++) {
      frame.set(cx - w + 1 + i, top + 7 - i, 190);
      frame.set(cx + w - 2 - i, top + 7 - i, 190);
    }
  }

  /**
   * The parapet and the cap: a stepped crown and a short copper pitch.
   *
   * Stepped rather than crenellated. Battlements on a business-school tower
   * would be a joke the building does not make.
   */
  private plotParapet(): void {
    const stone = this.pixels("stone");
    const light = this.pixels("stoneLight");
    const dark = this.pixels("stoneDark");
    const copper = this.pixels("copper");
    const copperDark = this.pixels("copperDark");

    // Three steps out, each wider than the one above.
    for (let step = 0; step < 3; step++) {
      const grow = step * 2;
      const y = PARAPET.top + step * 3;
      stone.rect(SHAFT.x - 1 - grow, y, SHAFT.width + 2 + grow * 2, 3);
      light.hLine(y, SHAFT.x - 1 - grow, SHAFT.x + SHAFT.width + grow);
      dark.hLine(y + 2, SHAFT.x - 1 - grow, SHAFT.x + SHAFT.width + grow, 140);
    }

    // The cap: a short pitch, oxidised, with a finial on the ridge.
    const capBase = PARAPET.top;
    const cx = SHAFT.x + (SHAFT.width >> 1);
    for (let i = 0; i < capBase - SPIRE_TOP; i++) {
      const y = capBase - 1 - i;
      const half = Math.max(1, Math.round(((capBase - SPIRE_TOP - i) / (capBase - SPIRE_TOP)) * 9));
      copper.hLine(y, cx - half, cx + half - 1);
      if (i % 3 === 0) copperDark.hLine(y, cx - half, cx + half - 1, 90);
      copperDark.set(cx + half - 1, y);
    }
    copper.vLine(cx, SPIRE_TOP - 3, SPIRE_TOP);
    copper.set(cx - 1, SPIRE_TOP - 1);
    copper.set(cx + 1, SPIRE_TOP - 1);
  }

  // --- Idle animation --------------------------------------------------------

  /**
   * Two things move: the clock, and whoever is behind the lit window.
   *
   * The tower is otherwise completely still — the quietest building on the
   * shore after Vaultsys, and quiet for a different reason: nothing is
   * happening here except one person working late.
   */
  tick(elapsed: number): void {
    if (this.motionScale <= 0) return;

    const frame = Math.floor(elapsed / CLOCK_SECONDS) % CLOCK_FRAMES;
    if (frame !== this.clockFrame) {
      this.clockFrame = frame;
      this.setFrame("hands", frame);
    }

    // The lamp breathes, and every so often somebody crosses in front of it.
    // It dims; it never goes out.
    const breath = 1 - LAMP_DEPTH * (0.5 + 0.5 * Math.sin(elapsed * LAMP_RATE));
    const crossing = elapsed % SHADOW_PERIOD < SHADOW_LENGTH;
    this.setEmissiveScale("lateWindow", crossing ? breath * 0.62 : breath);
    this.setEmissiveScale("lateSpill", crossing ? breath * 0.7 : breath);
  }
}
