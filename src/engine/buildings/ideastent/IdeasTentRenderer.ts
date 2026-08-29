import { BuildingRenderer, type LayerMaterial } from "../BuildingRenderer";
import { createRandom } from "../../shared/random";

/**
 * The Ideas Tent, in pixels.
 *
 * # Not a building
 * Everything else on this shore is architecture. This is canvas on poles, and
 * it is the only structure here you could take down in an afternoon — which is
 * the point. Ideas do not get foundations. They get a tarpaulin, a bench, a
 * bulb on a wire, and a sign somebody painted crooked and never straightened.
 *
 * The silhouette is deliberately the opposite of every other landmark: no
 * horizontal roofline, no window grid, no symmetry. A sagging ridge between two
 * leaning poles, guy-ropes going off at angles, and a bench with more paper on
 * it than surface.
 *
 * # Read against the lightning
 * This scene already carries intermittent flashes over its clear active climate
 * (SceneRegistry §ideastent: "ideas striking, not neglect"). So the canvas is
 * pale and the openings under it are dark: when the sky flares, the tent turns
 * into a bright shape with a black interior, and the one warm thing in it is
 * the bulb. The composition is built to be lit from outside twice a minute.
 *
 * TODO(assets): plotted in code because `public/assets/buildings/` is empty.
 * Authored art replaces `plot()` alone.
 */

// --- Dimensions --------------------------------------------------------------

const W = 108;
const H = 76;

const BASE = H - 2;

/** The two poles the ridge hangs between, and how far apart they lean. */
const LEFT_POLE = { x: 16, top: 18, lean: -2 };
const RIGHT_POLE = { x: 84, top: 22, lean: 2 };

/** How far the ridge sags between the two poles holding it up. */
const RIDGE_SAG = 4;

/** The bench under it. */
const BENCH = { x: 30, y: BASE - 20, width: 44, height: 3 };

/** The bulb, hanging off the ridge on a wire, a little left of centre. */
const BULB = { x: 46, drop: 16 };

// --- Animation ---------------------------------------------------------------

/**
 * The bulb's flicker.
 *
 * A cycle of steady light with two short stutters in it, rather than random
 * noise — a bulb on a bad connection flickers in a *pattern*, and a random one
 * reads as a rendering fault (ART_DIRECTION.md §Animation: nothing snaps
 * without a reason).
 */
const FLICKER_PERIOD = 5.6;
const FLICKER_STUTTERS: readonly [number, number][] = [
  [3.1, 3.22],
  [3.34, 3.4],
  [4.75, 4.83],
];

/** Loose paper on the bench, lifting in the draught. */
const PAPER_FRAMES = 3;
const PAPER_SECONDS = 1.4;

/** The canvas itself, breathing. Two frames, very slow. */
const CANVAS_FRAMES = 2;
const CANVAS_SECONDS = 2.3;

// --- Materials ---------------------------------------------------------------

/**
 * Canvas, rope, scrap timber and paint.
 *
 * The canvas is the palest thing in the scene on purpose — it has to catch the
 * lightning. Everything under it is a step or two darker than it would be
 * anywhere else on the shore, so the space beneath the awning reads as shade
 * even at noon.
 */
const MATERIALS: Record<string, LayerMaterial> = {
  /** The awning, sun-bleached and patched. */
  canvas: { color: 0xd9cdb4 },
  canvasLight: { color: 0xefe6d2 },
  canvasDark: { color: 0xa89c86 },
  /** The stripe down the middle panel, and the tape holding one seam together. */
  stripe: { color: 0xb0755a },
  patch: { color: 0x9c9781 },

  /** Poles, pegs, and the bench: whatever timber was to hand. */
  timber: { color: 0x8a6a4a },
  timberLight: { color: 0xa98a68 },
  timberDark: { color: 0x5c452f },
  rope: { color: 0xb3a184 },

  /** The shade under the awning. Never black — see CLAUDE.md §Pixel Art Rules. */
  shade: { color: 0x4a4438 },

  /** Sketches: loose sheets, pinned notes, and one rolled-up plan. */
  paper: { color: 0xe4dcc6 },
  paperDark: { color: 0xb0a68d },
  ink: { color: 0x6b6353 },

  /** The sign, hand-painted on a board that was something else first. */
  board: { color: 0xa07d4f },
  boardDark: { color: 0x6e5333 },
  paint: { color: 0xe8dfc4 },

  /** The bulb, its wire, and the pool of light it makes. */
  wire: { color: 0x50483d },
  bulb: { color: 0xffe2a6, emissive: true, dayAlpha: 0.35, nightAlpha: 1 },
  bulbGlow: { color: 0xffc478, emissive: true, dayAlpha: 0.18, nightAlpha: 0.9 },
};

const ORDER = [
  "rope",
  "shade",
  "timber",
  "timberLight",
  "timberDark",
  "paper",
  "paperDark",
  "ink",
  "board",
  "boardDark",
  "paint",
  "wire",
  "bulbGlow",
  "bulb",
  "canvas",
  "canvasLight",
  "canvasDark",
  "stripe",
  "patch",
];

export class IdeasTentRenderer extends BuildingRenderer {
  private readonly rand = createRandom(0x1de1);

  private paperFrame = -1;
  private canvasFrame = -1;

  constructor(private readonly motionScale = 1) {
    super(W, H);
  }

  protected get order(): readonly string[] {
    return ORDER;
  }

  protected get materials(): Record<string, LayerMaterial> {
    return MATERIALS;
  }

  /** The ridge, which is the highest point of a structure with no roofline. */
  override get promptTop(): number {
    return H - LEFT_POLE.top + 4;
  }

  // --- Plotting --------------------------------------------------------------

  protected plot(): void {
    this.plotGuyRopes();
    this.plotPoles();
    this.plotShade();
    this.plotBench();
    this.plotSign();
    this.plotBulb();
    this.plotCanvas();
  }

  /** The two poles, each leaning its own way. Nothing here is plumb. */
  private plotPoles(): void {
    const timber = this.pixels("timber");
    const light = this.pixels("timberLight");
    const dark = this.pixels("timberDark");

    for (const pole of [LEFT_POLE, RIGHT_POLE]) {
      const height = BASE - pole.top;
      for (let i = 0; i < height; i++) {
        // The lean is applied over the whole length, so the foot is offset from
        // the head rather than the pole being bent.
        const x = pole.x + Math.round((i / height) * pole.lean);
        timber.set(x, pole.top + i);
        timber.set(x + 1, pole.top + i);
        light.set(x, pole.top + i, 150);
        dark.set(x + 1, pole.top + i, 170);
      }
      // A peg block at the foot, so the pole stands on something.
      const footX = pole.x + pole.lean;
      dark.rect(footX - 2, BASE - 2, 6, 2);
    }
  }

  /** Guy-ropes to four pegs, slack rather than taut. */
  private plotGuyRopes(): void {
    const rope = this.pixels("rope");
    const dark = this.pixels("timberDark");

    const runs = [
      { from: { x: LEFT_POLE.x, y: LEFT_POLE.top + 2 }, to: { x: 2, y: BASE - 1 } },
      { from: { x: LEFT_POLE.x, y: LEFT_POLE.top + 6 }, to: { x: 9, y: BASE - 1 } },
      { from: { x: RIGHT_POLE.x + 1, y: RIGHT_POLE.top + 2 }, to: { x: W - 3, y: BASE - 1 } },
      { from: { x: RIGHT_POLE.x + 1, y: RIGHT_POLE.top + 7 }, to: { x: W - 11, y: BASE - 1 } },
    ];

    for (const run of runs) {
      const dx = run.to.x - run.from.x;
      const dy = run.to.y - run.from.y;
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // A shallow catenary. A dead straight rope is a rope under tension, and
        // nothing about this structure is under tension.
        const sag = Math.sin(t * Math.PI) * 2;
        rope.set(
          Math.round(run.from.x + dx * t),
          Math.round(run.from.y + dy * t + sag),
          i % 4 === 3 ? 120 : 200
        );
      }
      // The peg it is tied to.
      dark.rect(run.to.x - 1, BASE - 2, 2, 3);
    }
  }

  /**
   * The shade under the awning.
   *
   * Plotted as a solid mass first so everything beneath the canvas sits against
   * dark. It is what makes the lightning read: a flash lights the canvas and
   * leaves this untouched, and for one frame the tent is a bright shape with a
   * hole in it.
   */
  private plotShade(): void {
    const shade = this.pixels("shade");

    for (let x = LEFT_POLE.x - 6; x <= RIGHT_POLE.x + 6; x++) {
      const top = this.canvasY(x) + 2;
      if (top >= BASE) continue;
      // Deeper in the middle, where the awning is lowest and the bench is.
      const depth = BASE - top;
      for (let i = 0; i < depth; i++) {
        const alpha = i < 4 ? 190 : i < 10 ? 130 : 80;
        shade.set(x, top + i, alpha);
      }
    }
  }

  /**
   * The ridge line of the canvas at a given x.
   *
   * One function, used by the canvas, the shade and the bulb's wire, so the
   * three cannot disagree about where the roof is — which they did in the first
   * pass, and a bulb hanging through the awning is hard to unsee.
   */
  private canvasY(x: number): number {
    const left = LEFT_POLE.x;
    const right = RIGHT_POLE.x;
    if (x < left) {
      // The overhang past the left pole, falling away.
      const t = (left - x) / 10;
      return LEFT_POLE.top + Math.round(t * t * 8);
    }
    if (x > right) {
      const t = (x - right) / 10;
      return RIGHT_POLE.top + Math.round(t * t * 8);
    }
    const t = (x - left) / (right - left);
    const ridge = LEFT_POLE.top + (RIGHT_POLE.top - LEFT_POLE.top) * t;
    // The sag between the poles: a rope-supported ridge is a curve, not a line.
    return Math.round(ridge + Math.sin(t * Math.PI) * RIDGE_SAG);
  }

  /**
   * The canvas itself: two frames, one panel struck by a breeze.
   *
   * The second frame lifts the middle of the sheet by a pixel and drops the
   * fly-edge by one, which is the whole of the motion. Anything more and it
   * stops being canvas and starts being a flag.
   */
  private plotCanvas(): void {
    for (let f = 0; f < CANVAS_FRAMES; f++) {
      const canvas = this.pixels("canvas", f);
      const light = this.pixels("canvasLight", f);
      const dark = this.pixels("canvasDark", f);
      const stripe = this.pixels("stripe", f);
      const patch = this.pixels("patch", f);

      for (let x = LEFT_POLE.x - 12; x <= RIGHT_POLE.x + 12; x++) {
        const breeze = f === 0 ? 0 : Math.round(Math.sin((x - LEFT_POLE.x) * 0.16) * 1.2);
        const y = this.canvasY(x) + breeze;

        // Four pixels of thickness, lit along the top edge and shaded beneath.
        canvas.set(x, y);
        canvas.set(x, y + 1);
        canvas.set(x, y + 2);
        light.set(x, y);
        dark.set(x, y + 2);

        // A stripe down the middle panel, following the same curve.
        if (x > 44 && x < 56) stripe.set(x, y + 1);
        // One taped patch, off to the right, where the canvas tore.
        if (x > 66 && x < 74) patch.set(x, y + (x % 2));
      }

      // The two edges hang down, fraying, rather than stopping in mid-air.
      for (const edge of [LEFT_POLE.x - 12, RIGHT_POLE.x + 12]) {
        const y = this.canvasY(edge);
        const drop = 4 + Math.round(this.rand() * 3);
        for (let i = 0; i < drop; i++) {
          canvas.set(edge, y + i, 220 - i * 25);
          dark.set(edge, y + i, 120);
        }
      }

      // And the front lip, hanging off the fly-edge in scallops.
      for (let x = LEFT_POLE.x - 12; x <= RIGHT_POLE.x + 12; x += 6) {
        const y = this.canvasY(x) + 3;
        canvas.set(x, y);
        canvas.set(x + 1, y);
        canvas.set(x + 1, y + 1);
        dark.set(x + 1, y + 1, 160);
      }
    }
  }

  /**
   * The workbench, and the mess on it.
   *
   * Three frames of loose paper: two sheets lift and settle while the rest stay
   * put. That is the only motion under the awning, and it is what says the
   * place is open to the weather.
   */
  private plotBench(): void {
    const timber = this.pixels("timber");
    const light = this.pixels("timberLight");
    const dark = this.pixels("timberDark");
    const ink = this.pixels("ink");

    // The top, and two trestle legs splayed under it.
    timber.rect(BENCH.x, BENCH.y, BENCH.width, BENCH.height);
    light.hLine(BENCH.y, BENCH.x, BENCH.x + BENCH.width - 1);
    dark.hLine(BENCH.y + BENCH.height - 1, BENCH.x, BENCH.x + BENCH.width - 1);

    for (const legX of [BENCH.x + 5, BENCH.x + BENCH.width - 7]) {
      for (let i = 0; i < BASE - BENCH.y - BENCH.height; i++) {
        const spread = Math.round(i * 0.3);
        timber.set(legX - spread, BENCH.y + BENCH.height + i);
        timber.set(legX + 2 + spread, BENCH.y + BENCH.height + i);
      }
      dark.hLine(BASE - 6, legX - 3, legX + 5, 150);
    }

    // A jar of pens, and a rolled plan leaning against the bench leg.
    dark.rect(BENCH.x + 30, BENCH.y - 5, 5, 5);
    for (let i = 0; i < 4; i++) ink.set(BENCH.x + 31 + i, BENCH.y - 7 - (i % 2));
    for (let i = 0; i < 9; i++) {
      this.pixels("paper").set(BENCH.x - 3 + Math.round(i * 0.4), BASE - 2 - i);
      this.pixels("paperDark").set(BENCH.x - 2 + Math.round(i * 0.4), BASE - 2 - i);
    }

    // The sheets themselves. Frame 0 is the settled state; the others lift two
    // of them by a pixel each, out of phase.
    const sheets = [
      { x: BENCH.x + 2, w: 9, lift: [0, 1, 1] },
      { x: BENCH.x + 12, w: 7, lift: [0, 0, 0] },
      { x: BENCH.x + 20, w: 8, lift: [0, 0, 1] },
      { x: BENCH.x + 36, w: 6, lift: [0, 1, 0] },
    ];

    for (let f = 0; f < PAPER_FRAMES; f++) {
      const paper = this.pixels("paper", f);
      const dim = this.pixels("paperDark", f);
      const lines = this.pixels("ink", f);

      for (const sheet of sheets) {
        const y = BENCH.y - 1 - sheet.lift[f];
        paper.rect(sheet.x, y - 3, sheet.w, 4);
        dim.hLine(y, sheet.x, sheet.x + sheet.w - 1);
        // A couple of scribbled rules on each, which is what makes them
        // sketches rather than napkins.
        lines.hLine(y - 2, sheet.x + 1, sheet.x + sheet.w - 3, 170);
        lines.hLine(y - 1, sheet.x + 1, sheet.x + Math.max(1, sheet.w - 5), 130);
      }
    }
  }

  /**
   * The sign: "IDEAS", hand-painted, hung off one rope and swinging crooked.
   *
   * Deliberately not the bitmap font every other sign on the shore uses. This
   * one was painted by hand on a board that used to be something else, and
   * five clean glyphs would be somebody's brand rather than somebody's tent.
   */
  private plotSign(): void {
    const board = this.pixels("board");
    const dark = this.pixels("boardDark");
    const paint = this.pixels("paint");
    const rope = this.pixels("rope");

    const x = 66;
    const y = 40;
    const w = 26;
    const h = 12;

    // Hung off the right pole by a short rope, and tilted three pixels.
    rope.set(x + w - 4, y - 3);
    rope.set(x + w - 3, y - 4);
    rope.set(x + w - 2, y - 5);

    for (let dy = 0; dy < h; dy++) {
      const tilt = Math.round((dy / h) * 2);
      board.rect(x + tilt, y + dy, w, 1);
      dark.set(x + tilt, y + dy, 150);
      dark.set(x + tilt + w - 1, y + dy);
    }

    // "UNDER CONSTRUCTION" is too many letters at this size, so the sign says
    // the shape of the phrase: three rough painted words, a stroke each.
    paint.hLine(y + 3, x + 3, x + 12, 220);
    paint.hLine(y + 3, x + 14, x + 21, 180);
    paint.hLine(y + 6, x + 4, x + 10, 200);
    paint.hLine(y + 6, x + 12, x + 22, 210);
    paint.hLine(y + 9, x + 5, x + 15, 190);
    // A drip, because it was painted fast.
    paint.set(x + 9, y + 4, 140);
    paint.set(x + 9, y + 5, 90);
  }

  /**
   * The bulb: a wire down from the ridge, a filament, and the pool it throws.
   *
   * The only warm thing under the canvas, and the only emissive layer in the
   * building. Everything else here is lit by the sky.
   */
  private plotBulb(): void {
    const wire = this.pixels("wire");
    const bulb = this.pixels("bulb");
    const glow = this.pixels("bulbGlow");

    const top = this.canvasY(BULB.x) + 3;
    const bottom = top + BULB.drop;

    // The flex, with a kink in it where it was knotted over the ridge.
    for (let y = top; y < bottom; y++) {
      wire.set(BULB.x + (y - top > 6 && y - top < 9 ? 1 : 0), y);
    }

    // The bulb itself: a four-pixel envelope under a two-pixel cap.
    wire.rect(BULB.x - 1, bottom, 3, 2);
    bulb.rect(BULB.x - 2, bottom + 2, 5, 4);
    bulb.set(BULB.x - 1, bottom + 6);
    bulb.set(BULB.x, bottom + 6);
    bulb.set(BULB.x + 1, bottom + 6);

    // The pool. Round, soft-edged, and reaching the bench top but not the
    // ground — a bare bulb under canvas lights the table, not the field.
    const cx = BULB.x;
    const cy = bottom + 4;
    const radius = 17;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy) / radius;
        if (d > 1) continue;
        const alpha = Math.round((1 - d) ** 2 * 190);
        if (alpha <= 6) continue;
        glow.set(cx + dx, cy + dy, alpha);
      }
    }
  }

  // --- Idle animation --------------------------------------------------------

  /**
   * A flickering bulb, paper lifting, and canvas breathing.
   *
   * Three unhurried things, none of them synchronised — which is what makes a
   * place look occupied rather than animated. The flicker is the loudest, and
   * it is loud on purpose: it is the only thing here that ever changes fast,
   * and it echoes the lightning the scene is already carrying.
   */
  tick(elapsed: number): void {
    if (this.motionScale <= 0) return;

    const paper = Math.floor(elapsed / PAPER_SECONDS) % PAPER_FRAMES;
    if (paper !== this.paperFrame) {
      this.paperFrame = paper;
      this.setFrame("paper", paper);
      this.setFrame("paperDark", paper);
      this.setFrame("ink", paper);
    }

    const canvas = Math.floor(elapsed / CANVAS_SECONDS) % CANVAS_FRAMES;
    if (canvas !== this.canvasFrame) {
      this.canvasFrame = canvas;
      for (const layer of ["canvas", "canvasLight", "canvasDark", "stripe", "patch"]) {
        this.setFrame(layer, canvas);
      }
    }

    const into = elapsed % FLICKER_PERIOD;
    const stuttering = FLICKER_STUTTERS.some(([from, to]) => into >= from && into < to);
    const level = stuttering ? 0.2 : 1;
    this.setEmissiveScale("bulb", level);
    this.setEmissiveScale("bulbGlow", level);
  }
}
