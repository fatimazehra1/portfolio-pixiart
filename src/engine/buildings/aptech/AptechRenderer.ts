import {
  BuildingRenderer,
  measureText,
  plotText,
  type LayerMaterial,
} from "../BuildingRenderer";

/**
 * The Aptech Campus, in pixels.
 *
 * BUILDINGS.md gives this one four words: *beginning*, *golden hour*, *open
 * campus*, *celebration*. So it is deliberately not a tower — it is low, wide
 * and horizontal, three blocks around a gated courtyard, the shape of somewhere
 * you are let into rather than somewhere you look up at. The lighthouse at the
 * far end of the shore is the vertical landmark; this is the one that opens.
 *
 * Its silhouette is the gate: a raised centre bay with a sign over the arch,
 * flanked by a two-storey teaching block and a lower wing. That asymmetry is the
 * whole reason it reads as a campus and not as a house
 * (ART_DIRECTION.md §Buildings — unique silhouette).
 */

// --- Dimensions --------------------------------------------------------------

const W = 156;
const H = 62;

/** The three blocks, left to right. */
const LEFT = { x: 4, top: 22, width: 52 };
const GATE = { x: 56, top: 10, width: 44 };
const RIGHT = { x: 100, top: 32, width: 52 };

const ROOF_HEIGHT = 8;
const FLAG_X = 16;
const FLAG_TOP = 1;

/** Frames the flag is drawn in. Three is enough for cloth; four looks like a loop. */
const FLAG_FRAMES = 3;
/** Seconds per flag frame. Slow — ART_DIRECTION forbids anything that snaps. */
const FLAG_SECONDS = 0.42;

/** How the sign breathes, and how often a window goes dark. */
const SIGN_RATE = 0.9;
const SIGN_DEPTH = 0.18;
const BLINK_PERIOD = 7.3;
const BLINK_LENGTH = 0.55;

/**
 * Materials.
 *
 * Warm sandstone and muted red tile — the campus is the golden-hour building,
 * and it should look like it even at midnight (ART_DIRECTION.md §Time Palette,
 * §Color Philosophy: sun-faded, never saturated).
 */
const MATERIALS: Record<string, LayerMaterial> = {
  wall: { color: 0xbfa07c },
  wallLight: { color: 0xd8bd98 },
  wallDark: { color: 0x8f7458 },

  roof: { color: 0xa5644f },
  roofLight: { color: 0xc07f66 },
  roofDark: { color: 0x77452f },

  /** Stone banding, steps, parapet and the gate arch. */
  trim: { color: 0xd2c9b6 },
  trimDark: { color: 0x9a917f },

  /** Window frames and the shadowed reveals around them. */
  frame: { color: 0x5c4a3a },
  /** Unlit glass — cold, and darker than the wall around it. */
  glass: { color: 0x4d5a68 },

  /** Windows with someone still in them. */
  lit: { color: 0xf4cb85, emissive: true, dayAlpha: 0, nightAlpha: 1 },
  /** The one window that keeps thinking about it. */
  blink: { color: 0xf4cb85, emissive: true, dayAlpha: 0, nightAlpha: 1 },

  sign: { color: 0x7a5c3e },
  signInk: { color: 0xf0e2c2 },
  /** The sign's own small light, on well before the windows are. */
  signGlow: { color: 0xe0a458, emissive: true, dayAlpha: 0.1, nightAlpha: 1 },

  pole: { color: 0x6a655c },
  flag: { color: 0xd8704f },
  flagLight: { color: 0xe89a72 },
};

const ORDER = [
  "roof",
  "roofLight",
  "roofDark",
  "wall",
  "wallLight",
  "wallDark",
  "trim",
  "trimDark",
  "glass",
  "lit",
  "blink",
  "frame",
  "sign",
  // Under the lettering, not over it. A sign is lit *at*; a glow drawn on top
  // of the word is a glow that erases the word after dark.
  "signGlow",
  "signInk",
  "pole",
  "flag",
  "flagLight",
];

export class AptechRenderer extends BuildingRenderer {
  private flagFrame = -1;

  constructor(private readonly motionScale = 1) {
    super(W, H);
  }

  protected get order(): readonly string[] {
    return ORDER;
  }

  protected get materials(): Record<string, LayerMaterial> {
    return MATERIALS;
  }

  /**
   * Over the gate, not over the flagpole.
   *
   * The pole is the tallest thing in the bitmap but it stands off to the left,
   * so hanging the prompt from the bitmap's top would leave it floating in open
   * sky. The ridge of the centre bay is what the eye reads as the top of this
   * building.
   */
  override get promptTop(): number {
    return H - GATE.top;
  }

  // --- Plotting --------------------------------------------------------------

  protected plot(): void {
    this.plotGround();
    this.plotBlock(LEFT, 2);
    this.plotBlock(RIGHT, 1);
    this.plotGate();
    this.plotFlag();
  }

  /** The plinth every block stands on, so the campus meets the grass on stone. */
  private plotGround(): void {
    const trim = this.pixels("trim");
    const dark = this.pixels("trimDark");

    trim.rect(LEFT.x - 2, H - 3, RIGHT.x + RIGHT.width - LEFT.x + 4, 3);
    dark.hLine(H - 1, LEFT.x - 2, RIGHT.x + RIGHT.width + 1);

    // Steps up to the gate. Three, shallow, centred on the arch.
    const cx = GATE.x + (GATE.width >> 1);
    for (let i = 0; i < 3; i++) {
      const half = 7 + i * 2;
      trim.rect(cx - half, H - 3 - (3 - i), half * 2, 1);
      dark.hLine(H - 3 - (3 - i), cx - half, cx - half);
      dark.hLine(H - 3 - (3 - i), cx + half - 1, cx + half - 1);
    }
  }

  /**
   * A teaching block: walls, a course band, a pitched tile roof and a row of
   * windows per storey.
   */
  private plotBlock(block: { x: number; top: number; width: number }, storeys: number): void {
    const wall = this.pixels("wall");
    const light = this.pixels("wallLight");
    const dark = this.pixels("wallDark");
    const trim = this.pixels("trim");

    const bottom = H - 3;
    const bodyTop = block.top + ROOF_HEIGHT;

    wall.rect(block.x, bodyTop, block.width, bottom - bodyTop);
    // Lit down the left flank, shadowed down the right — the light falls from
    // the upper left everywhere on this shore.
    light.vLine(block.x, bodyTop, bottom - 1);
    light.vLine(block.x + 1, bodyTop, bottom - 1, 150);
    dark.vLine(block.x + block.width - 1, bodyTop, bottom - 1);
    dark.vLine(block.x + block.width - 2, bodyTop, bottom - 1, 150);

    this.plotRoof(block.x - 2, block.top, block.width + 4);

    // A stone band under the eaves and another at the floor line.
    trim.hLine(bodyTop, block.x, block.x + block.width - 1);
    trim.hLine(bottom - 1, block.x, block.x + block.width - 1);

    const storeyHeight = Math.floor((bottom - bodyTop - 2) / storeys);
    for (let s = 0; s < storeys; s++) {
      const y = bodyTop + 3 + s * storeyHeight;
      if (s > 0) trim.hLine(y - 2, block.x, block.x + block.width - 1);
      this.plotWindowRow(block.x + 4, y, block.width - 8, s === 0 && storeys === 2);
    }
  }

  /** A pitched tile roof with a lit ridge and a shadowed eave. */
  private plotRoof(x: number, top: number, width: number): void {
    const roof = this.pixels("roof");
    const light = this.pixels("roofLight");
    const dark = this.pixels("roofDark");

    for (let i = 0; i < ROOF_HEIGHT; i++) {
      // Nothing on this shore has a perfectly straight edge; the pitch steps in
      // by two a row, which at this scale is what reads as tile rather than as a
      // triangle.
      const inset = Math.round((i / ROOF_HEIGHT) * (width * 0.18));
      const y = top + i;
      roof.hLine(y, x + inset, x + width - 1 - inset);
      if (i === 0) light.hLine(y, x + inset, x + width - 1 - inset);
      if (i === ROOF_HEIGHT - 1) dark.hLine(y, x + inset, x + width - 1 - inset);
      // Tile courses.
      if (i % 3 === 1) dark.hLine(y, x + inset, x + width - 1 - inset, 90);
    }

    // The eave, standing proud of the wall below it.
    dark.hLine(top + ROOF_HEIGHT, x, x + width - 1);
  }

  /**
   * A row of windows.
   *
   * Every window is glazed, framed and lit; one of them on the ground floor is
   * plotted into its own layer so it can go dark on its own (ART_DIRECTION.md
   * §Windows — windows reveal life, never static black rectangles).
   */
  private plotWindowRow(x: number, y: number, width: number, hasBlinker: boolean): void {
    const glass = this.pixels("glass");
    const frame = this.pixels("frame");
    const lit = this.pixels("lit");
    const blink = this.pixels("blink");

    const windowWidth = 6;
    const windowHeight = 7;
    const pitch = 10;
    const count = Math.max(1, Math.floor(width / pitch));
    // Centre the run in the wall rather than starting it flush left.
    const start = x + Math.floor((width - (count * pitch - (pitch - windowWidth))) / 2);
    const blinker = hasBlinker ? count >> 1 : -1;

    for (let i = 0; i < count; i++) {
      const wx = start + i * pitch;

      frame.frame(wx - 1, y - 1, windowWidth + 2, windowHeight + 2);
      glass.rect(wx, y, windowWidth, windowHeight);
      // Glazing bars: a campus window is a grid, not a hole.
      frame.vLine(wx + (windowWidth >> 1) - 1, y, y + windowHeight - 1);
      frame.hLine(y + (windowHeight >> 1) - 1, wx, wx + windowWidth - 1);

      const target = i === blinker ? blink : lit;
      target.rect(wx, y, windowWidth, windowHeight);
      // Re-cut the bars through the glow, so a lit window still reads as glazed.
      target.vLine(wx + (windowWidth >> 1) - 1, y, y + windowHeight - 1, 0);
      target.hLine(y + (windowHeight >> 1) - 1, wx, wx + windowWidth - 1, 0);
    }
  }

  /** The centre bay: the arch you walk through, and the sign over it. */
  private plotGate(): void {
    const wall = this.pixels("wall");
    const light = this.pixels("wallLight");
    const dark = this.pixels("wallDark");
    const trim = this.pixels("trim");
    const trimDark = this.pixels("trimDark");
    const sign = this.pixels("sign");
    const ink = this.pixels("signInk");
    const glow = this.pixels("signGlow");

    const bottom = H - 3;
    const bodyTop = GATE.top + ROOF_HEIGHT;

    wall.rect(GATE.x, bodyTop, GATE.width, bottom - bodyTop);
    light.vLine(GATE.x, bodyTop, bottom - 1);
    light.vLine(GATE.x + 1, bodyTop, bottom - 1, 150);
    dark.vLine(GATE.x + GATE.width - 1, bodyTop, bottom - 1);
    dark.vLine(GATE.x + GATE.width - 2, bodyTop, bottom - 1, 150);

    this.plotRoof(GATE.x - 3, GATE.top, GATE.width + 6);

    // Pilasters either side, which is what makes a doorway an entrance.
    for (const px of [GATE.x + 3, GATE.x + GATE.width - 6]) {
      trim.rect(px, bodyTop + 2, 3, bottom - bodyTop - 2);
      trimDark.vLine(px + 2, bodyTop + 2, bottom - 1);
    }

    // The arch itself, cut out of the wall and edged in stone.
    const cx = GATE.x + (GATE.width >> 1);
    const archHalf = 7;
    const archTop = bottom - 20;

    for (let y = archTop; y < bottom; y++) {
      // A shallow curve at the head, straight jambs below it.
      const t = (y - archTop) / 6;
      const half = t >= 1 ? archHalf : Math.round(archHalf * Math.sqrt(Math.max(0, t)));
      if (half <= 0) continue;

      wall.hLine(y, cx - half, cx + half - 1, 0);
      light.hLine(y, cx - half, cx + half - 1, 0);
      dark.hLine(y, cx - half, cx + half - 1, 0);
      // The dark of the courtyard beyond, and the stone edge of the opening.
      this.pixels("frame").hLine(y, cx - half, cx + half - 1);
      trim.set(cx - half - 1, y);
      trimDark.set(cx + half, y);
    }

    // The signboard over the arch, and its little brass lamp. Sized from the
    // word rather than by eye, so renaming it can't crop it.
    const word = "APTECH";
    const wordWidth = measureText(word);
    const boardWidth = wordWidth + 6;
    const boardHeight = 11;
    const boardX = cx - (boardWidth >> 1);
    const boardY = bodyTop + 3;

    sign.rect(boardX, boardY, boardWidth, boardHeight);
    trimDark.frame(boardX - 1, boardY - 1, boardWidth + 2, boardHeight + 2);
    plotText(ink, boardX + ((boardWidth - wordWidth) >> 1), boardY + 2, word);
    // The glow washes the board rather than outlining the letters — a sign is
    // lit *at*, not made of light.
    glow.rect(boardX, boardY - 1, boardWidth, boardHeight + 2);
    glow.rect(boardX + 2, boardY + 1, boardWidth - 4, boardHeight - 2, 90);
  }

  /** The flagpole, and the flag on it. Celebration, per BUILDINGS.md. */
  private plotFlag(): void {
    const pole = this.pixels("pole");
    const roofTop = LEFT.top;

    pole.vLine(FLAG_X, FLAG_TOP, roofTop + 3);
    pole.set(FLAG_X - 1, FLAG_TOP);
    pole.set(FLAG_X + 1, FLAG_TOP);

    // Three frames of cloth. The wave is a travelling sine rather than three
    // drawings, so the cloth keeps its area and never pops.
    for (let f = 0; f < FLAG_FRAMES; f++) {
      const flag = this.pixels("flag", f);
      const light = this.pixels("flagLight", f);
      const phase = (f / FLAG_FRAMES) * Math.PI * 2;

      for (let dx = 0; dx < 14; dx++) {
        // Held at the pole and free at the fly, so the travel grows outward.
        const swing = Math.round(Math.sin(phase + dx * 0.55) * (dx / 14) * 2);
        const top = FLAG_TOP + 1 + swing;

        for (let dy = 0; dy < 8; dy++) {
          flag.set(FLAG_X + 1 + dx, top + dy);
        }
        light.set(FLAG_X + 1 + dx, top);
        light.set(FLAG_X + 1 + dx, top + 1, 140);
      }
    }
  }

  // --- Idle animation --------------------------------------------------------

  /**
   * What moves: the flag, one window, and the sign.
   *
   * Nothing else. DESIGN.md §Animation Philosophy asks for calm — a building
   * where three small things are happening reads as inhabited, and a building
   * where everything is happening reads as a slot machine.
   */
  tick(elapsed: number): void {
    if (this.motionScale <= 0) return;

    const frame = Math.floor(elapsed / FLAG_SECONDS) % FLAG_FRAMES;
    if (frame !== this.flagFrame) {
      this.flagFrame = frame;
      this.setFrame("flag", frame);
      this.setFrame("flagLight", frame);
    }

    // The sign breathes. Slow, shallow, and never all the way off.
    this.setEmissiveScale("signGlow", 1 - SIGN_DEPTH * (0.5 + 0.5 * Math.sin(elapsed * SIGN_RATE)));

    // One window goes out for half a second every few seconds — someone walking
    // past a lamp, or thinking better of it.
    const into = elapsed % BLINK_PERIOD;
    this.setEmissiveScale("blink", into < BLINK_LENGTH ? 0 : 1);
  }
}
