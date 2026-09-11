import { BuildingRenderer, type LayerMaterial } from "../BuildingRenderer";
import { createRandom } from "../../shared/random";

/**
 * The Freelance Cottage, in pixels.
 *
 * # A roof made of clients
 * The one idea this building is built around: the roof is *patchwork*. Every
 * shingle is a different tone, mismatched course by course, because every one
 * of them was a different job — a site here, a fix there, and the roof over
 * your head is whatever they added up to. Two shingles are missing outright,
 * which is the honest version of that arrangement.
 *
 * Everything else is deliberately modest. This chapter was scrappy: one room,
 * one warm window, one chimney with a thin line of smoke, a mailbox out front
 * stuffed with more work than the box was built for. It is the smallest
 * landmark on the shore and it should stay that way — the tower next door is
 * four storeys, and the difference between the two *is* the timeline.
 *
 * Weathered rather than derelict. The plaster has come off in a couple of
 * places and the shutter hangs crooked, but the window is lit and the chimney
 * is going: somebody lives here, and is working tonight.
 *
 * TODO(assets): plotted in code because `public/assets/buildings/` is empty.
 * Authored art replaces `plot()` alone.
 */

// --- Dimensions --------------------------------------------------------------

const W = 92;
const H = 62;

/** The ground line. Everything stands on this. */
const BASE = H - 2;

/** The one room. */
const HOUSE = { x: 14, width: 52, top: 27 };
/** The roof, which overhangs the walls on both sides. */
const ROOF = { x: 9, width: 62, top: 11, height: 16 };

const CHIMNEY = { x: 52, width: 8, top: 4 };
const MAILBOX = { x: 74, postTop: 44, boxTop: 36 };

/** One shingle, and one course of them. */
const SHINGLE_W = 6;
const COURSE_H = 3;

// --- Animation ---------------------------------------------------------------

/** Thin smoke. Four frames, slow — a small fire, not a factory. */
const SMOKE_FRAMES = 4;
const SMOKE_SECONDS = 0.85;

/** The window's own unsteadiness: a lamp, not a screen. */
const LAMP_RATE = 0.55;
const LAMP_DEPTH = 0.12;

/** Every so often someone crosses in front of it. */
const PASS_PERIOD = 11.4;
const PASS_LENGTH = 0.7;

// --- Materials ---------------------------------------------------------------

/**
 * Lime plaster over brick, weathered timber, and four tones of second-hand
 * shingle.
 *
 * The four roof tones are the whole palette decision. They sit close enough in
 * value to read as one roof from across the shore, and far enough apart in hue
 * to read as mismatched close up — which is how a roof patched five times
 * actually looks.
 *
 * All of it is pitched a long step lighter than a swatch would suggest. This
 * house is small, it is the only thing in its frame, and under the scene's own
 * ambient the first pass read as one flat silhouette with a roof-shaped lump on
 * it — which loses the single idea the building exists to carry. Nothing here
 * is emissive except the lamp: the whole facade still darkens with the hour,
 * it just no longer bottoms out into a shape.
 */
const MATERIALS: Record<string, LayerMaterial> = {
  /** Lime-washed plaster, sun-faded. */
  wall: { color: 0xe4d5b6 },
  wallLight: { color: 0xf6ecd4 },
  wallDark: { color: 0xbba98b },
  /** Where the plaster has come away and the brick underneath shows. */
  brick: { color: 0xc08a6e },
  brickDark: { color: 0x9a6a52 },

  /** The four salvaged shingle tones — one per client, none of them matching. */
  shingle0: { color: 0xc08a63 },
  shingle1: { color: 0xd0ab77 },
  shingle2: { color: 0xa08a71 },
  shingle3: { color: 0xe3c691 },
  /** Course shadows, the ridge cap, and the two gaps where shingles are gone. */
  shingleDark: { color: 0x8a7053 },
  ridge: { color: 0xf0dcb2 },

  /** Timber: the door, the frames, the shutter, the mailbox post. */
  timber: { color: 0x9a7853 },
  timberLight: { color: 0xbe9a71 },
  timberDark: { color: 0x6e5439 },

  /** Unlit glass, and the warm room behind it. */
  glass: { color: 0x4a5563 },
  lamp: { color: 0xf6cf8c, emissive: true, dayAlpha: 0.06, nightAlpha: 1 },
  /** The spill of that lamp onto the sill and the path outside. */
  spill: { color: 0xe8b877, emissive: true, dayAlpha: 0, nightAlpha: 0.65 },

  /**
   * The mailbox, and the paper stuffed into it.
   *
   * The scrolls are the content of this chapter and they are five pixels tall,
   * so they are the palest thing on the building after the lamp — at anything
   * darker they merge with the post they are standing over.
   */
  metal: { color: 0x9ba1a8 },
  metalDark: { color: 0x74797f },
  paper: { color: 0xf4ecd8 },
  paperDark: { color: 0xc9bda1 },

  /** The path, and the stones the cottage sits on. */
  stone: { color: 0xb8ae9d },
  stoneDark: { color: 0x8d8573 },

  /** Woodsmoke. A thread, but one you can actually follow. */
  smoke: { color: 0xeae4da },
};

const ORDER = [
  "stone",
  "stoneDark",
  "spill",
  "wall",
  "wallLight",
  "wallDark",
  "brick",
  "brickDark",
  "glass",
  "lamp",
  "timber",
  "timberLight",
  "timberDark",
  "shingle0",
  "shingle1",
  "shingle2",
  "shingle3",
  "shingleDark",
  "ridge",
  "metal",
  "metalDark",
  "paper",
  "paperDark",
  "smoke",
];

export class CottageRenderer extends BuildingRenderer {
  /** Seeded, so the patchwork is the same patchwork every time it is baked. */
  private readonly rand = createRandom(0x5c07);

  private smokeFrame = -1;

  constructor(private readonly motionScale = 1) {
    super(W, H);
  }

  protected get order(): readonly string[] {
    return ORDER;
  }

  protected get materials(): Record<string, LayerMaterial> {
    return MATERIALS;
  }

  /** The chimney, which is the tallest thing here and sits near the middle. */
  override get promptTop(): number {
    return H - CHIMNEY.top + 2;
  }

  // --- Plotting --------------------------------------------------------------

  protected plot(): void {
    this.plotGround();
    this.plotWalls();
    this.plotDoor();
    this.plotWindow();
    this.plotChimney();
    this.plotRoof();
    this.plotMailbox();
    this.plotSmoke();

    /**
     * The lit room, the chimney, the mailbox: working, living here, and the
     * clients who found the place.
     *
     * Freelance years have no named products to hang rows on, so the three
     * open the one group of highlights. What they carry is the reading of the
     * house — that this was work done from where somebody lived.
     */
    this.setHotspots([
      {
        id: "desk",
        section: "Highlights",
        label: "The desk it was built from",
        x: HOUSE.x,
        y: HOUSE.top,
        width: HOUSE.width,
        height: BASE - HOUSE.top,
      },
      {
        id: "chimney",
        section: "Highlights",
        label: "Still going",
        x: CHIMNEY.x - 2,
        y: CHIMNEY.top,
        width: CHIMNEY.width + 4,
        height: ROOF.top - CHIMNEY.top + 6,
      },
      {
        id: "mailbox",
        section: "Highlights",
        label: "Where the clients came from",
        x: MAILBOX.x - 5,
        y: MAILBOX.boxTop - 2,
        width: 14,
        height: BASE - MAILBOX.boxTop + 2,
      },
    ]);
  }

  /** A stone footing and a short path, so the cottage meets the grass on stone. */
  private plotGround(): void {
    const stone = this.pixels("stone");
    const dark = this.pixels("stoneDark");

    stone.rect(HOUSE.x - 2, BASE - 1, HOUSE.width + 4, 2);
    dark.hLine(BASE + 1, HOUSE.x - 2, HOUSE.x + HOUSE.width + 1);

    // A few loose flags leading off towards the mailbox. Uneven on purpose:
    // nobody laid this path, it wore in.
    for (let i = 0; i < 5; i++) {
      const x = HOUSE.x + 30 + i * 5;
      const y = BASE - (i % 2);
      stone.rect(x, y, 4, 1);
      dark.set(x + 3, y);
    }
  }

  /** Plaster walls, a course band, and the two patches where it has come off. */
  private plotWalls(): void {
    const wall = this.pixels("wall");
    const light = this.pixels("wallLight");
    const dark = this.pixels("wallDark");
    const brick = this.pixels("brick");
    const brickDark = this.pixels("brickDark");

    const right = HOUSE.x + HOUSE.width - 1;
    wall.rect(HOUSE.x, HOUSE.top, HOUSE.width, BASE - HOUSE.top);

    // Lit down the left flank, shadowed down the right — the sun falls from the
    // upper left everywhere on this shore.
    light.vLine(HOUSE.x, HOUSE.top, BASE - 1);
    light.vLine(HOUSE.x + 1, HOUSE.top, BASE - 1, 140);
    dark.vLine(right, HOUSE.top, BASE - 1);
    dark.vLine(right - 1, HOUSE.top, BASE - 1, 140);
    dark.hLine(BASE - 1, HOUSE.x, right, 120);

    // Two bare patches. Placed by hand rather than scattered — weathering that
    // is evenly distributed reads as a texture, and weathering in two specific
    // places reads as damage.
    this.plotBarePatch(brick, brickDark, HOUSE.x + 3, HOUSE.top + 14, 7, 6);
    this.plotBarePatch(brick, brickDark, right - 12, BASE - 9, 9, 5);
  }

  /** One patch of exposed brick, coursed and staggered like real brickwork. */
  private plotBarePatch(
    brick: ReturnType<CottageRenderer["pixels"]>,
    dark: ReturnType<CottageRenderer["pixels"]>,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const wall = this.pixels("wall");
    const light = this.pixels("wallLight");

    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        // A ragged edge, or the patch reads as a window someone bricked up.
        if ((dx === 0 || dx === w - 1) && this.rand() < 0.45) continue;
        if ((dy === 0 || dy === h - 1) && this.rand() < 0.5) continue;
        wall.set(x + dx, y + dy, 0);
        light.set(x + dx, y + dy, 0);
        brick.set(x + dx, y + dy);
      }
      // The mortar course between rows of brick.
      if (dy % 2 === 1) dark.hLine(y + dy, x + 1, x + w - 2, 150);
    }
  }

  /** The door: plank timber, a stone step, and a lintel over it. */
  private plotDoor(): void {
    const timber = this.pixels("timber");
    const light = this.pixels("timberLight");
    const dark = this.pixels("timberDark");
    const stone = this.pixels("stone");
    const wall = this.pixels("wall");

    const x = HOUSE.x + 6;
    const y = BASE - 17;
    const w = 10;
    const h = 17;

    wall.rect(x, y, w, h, 0);
    timber.rect(x, y, w, h);
    // Planks, cut vertically through the door.
    for (let px = x + 3; px < x + w; px += 3) dark.vLine(px, y + 1, y + h - 1, 170);
    light.vLine(x, y, y + h - 1, 160);
    dark.vLine(x + w - 1, y, y + h - 1);
    // The lintel above and the step below.
    dark.hLine(y - 1, x - 1, x + w);
    stone.rect(x - 1, BASE - 1, w + 2, 1);
    // A latch, which is the smallest possible sign the door is used.
    this.pixels("metal").rect(x + w - 3, y + 9, 2, 1);

    // One plank leaf, swinging off the hinge side.
    this.setDoorway({ x, y, width: w, height: h, swing: "single", glow: 0xffd0a0 });
  }

  /**
   * The window: four panes, a warm room behind them, and a shutter hanging off
   * its top hinge.
   *
   * The lamp is plotted as its own emissive layer *and* as a spill on the sill
   * and the ground, because a lit window that lights nothing outside it reads
   * as a sticker rather than as a room (ART_DIRECTION.md §Windows).
   */
  private plotWindow(): void {
    const glass = this.pixels("glass");
    const lamp = this.pixels("lamp");
    const spill = this.pixels("spill");
    const timber = this.pixels("timber");
    const light = this.pixels("timberLight");
    const dark = this.pixels("timberDark");
    const wall = this.pixels("wall");

    const x = HOUSE.x + 26;
    const y = HOUSE.top + 8;
    const w = 14;
    const h = 12;

    wall.rect(x, y, w, h, 0);
    glass.rect(x, y, w, h);
    lamp.rect(x, y, w, h);

    // Glazing bars, cut through the glass and the glow alike, so a lit window
    // still reads as glazed.
    const midX = x + (w >> 1) - 1;
    const midY = y + (h >> 1) - 1;
    for (const grid of [glass, lamp]) {
      grid.vLine(midX, y, y + h - 1, 0);
      grid.hLine(midY, x, x + w - 1, 0);
    }
    timber.vLine(midX, y, y + h - 1);
    timber.hLine(midY, x, x + w - 1);
    timber.frame(x - 1, y - 1, w + 2, h + 2);
    light.hLine(y - 1, x - 1, x + w);
    dark.hLine(y + h, x - 1, x + w);

    // The sill, and the light lying on it and on the ground below.
    dark.rect(x - 2, y + h + 1, w + 4, 2);
    spill.rect(x - 3, y + h + 3, w + 6, 3, 120);
    spill.rect(x - 6, BASE - 2, w + 12, 2, 90);

    // The shutter, hanging from its top hinge and swung out of true. One
    // crooked thing is worth more than ten scattered chips of damage.
    const sx = x + w + 3;
    for (let dy = 0; dy < 11; dy++) {
      const lean = Math.round(dy * 0.35);
      timber.hLine(y + dy, sx + lean, sx + lean + 3);
      if (dy % 3 === 0) dark.hLine(y + dy, sx + lean, sx + lean + 3, 150);
    }
    this.pixels("metal").rect(sx, y - 1, 3, 1);
  }

  /** Brick chimney, leaning very slightly, with a stone cap. */
  private plotChimney(): void {
    const brick = this.pixels("brick");
    const dark = this.pixels("brickDark");
    const stone = this.pixels("stone");

    brick.rect(CHIMNEY.x, CHIMNEY.top, CHIMNEY.width, ROOF.top + 10 - CHIMNEY.top);
    for (let y = CHIMNEY.top + 2; y < ROOF.top + 10; y += 2) {
      dark.hLine(y, CHIMNEY.x, CHIMNEY.x + CHIMNEY.width - 1, 130);
    }
    dark.vLine(CHIMNEY.x + CHIMNEY.width - 1, CHIMNEY.top, ROOF.top + 9);
    // The cap, standing proud of the stack on both sides.
    stone.rect(CHIMNEY.x - 1, CHIMNEY.top - 2, CHIMNEY.width + 2, 2);
    this.pixels("stoneDark").hLine(CHIMNEY.top, CHIMNEY.x - 1, CHIMNEY.x + CHIMNEY.width);
    // The flue, so the smoke has somewhere to come from.
    this.pixels("shingleDark").rect(CHIMNEY.x + 2, CHIMNEY.top - 2, 4, 2);
  }

  /**
   * The patchwork roof.
   *
   * Plotted course by course from the ridge down, each shingle taking one of
   * four tones at random — but seeded, so it is the same roof every session,
   * and biased so neighbours rarely match, which is what makes it read as
   * patched rather than as noise.
   */
  private plotRoof(): void {
    const dark = this.pixels("shingleDark");
    const ridge = this.pixels("ridge");
    const cx = ROOF.x + (ROOF.width >> 1);

    // Two shingles are simply gone. Chosen up front so the loop can skip them.
    const missing = new Set(["2:3", "4:6"]);
    let previous = -1;

    for (let course = 0; course * COURSE_H < ROOF.height; course++) {
      const y = ROOF.top + course * COURSE_H;
      // The pitch: each course down is wider than the one above it.
      const spread = Math.round(((course * COURSE_H) / ROOF.height) * (ROOF.width / 2));
      const left = cx - spread;
      const right = cx + spread;
      if (right - left < 2) {
        ridge.hLine(y, cx - 1, cx + 1);
        continue;
      }

      // Courses are offset by half a shingle every other row, the way they are
      // laid in reality — and it stops the four tones lining up into stripes.
      const offset = course % 2 === 0 ? 0 : -(SHINGLE_W >> 1);
      for (let x = left + offset; x < right; x += SHINGLE_W) {
        const index = Math.round((x - left) / SHINGLE_W);
        let tone = Math.floor(this.rand() * 4);
        if (tone === previous) tone = (tone + 1 + Math.floor(this.rand() * 3)) % 4;
        previous = tone;

        const from = Math.max(left, x);
        const to = Math.min(right, x + SHINGLE_W - 1);
        if (to < from) continue;

        if (missing.has(`${course}:${index}`)) {
          // A gap: the batten underneath, in shadow.
          dark.rect(from, y, to - from + 1, COURSE_H);
          dark.hLine(y + 1, from, to, 90);
          continue;
        }

        const shingle = this.pixels(`shingle${tone}`);
        shingle.rect(from, y, to - from + 1, COURSE_H);
        // A hint of shadow under each course and a seam between each shingle.
        // Kept faint on purpose: at three pixels a course, a solid shadow row
        // is a third of the roof, and it swallows the tones the patchwork is
        // made of.
        dark.hLine(y + COURSE_H - 1, from, to, 115);
        dark.vLine(to, y, y + COURSE_H - 2, 130);
      }
    }

    // The ridge cap, and the eaves standing proud of the wall below.
    ridge.hLine(ROOF.top, cx - 2, cx + 2);
    ridge.hLine(ROOF.top + 1, cx - 3, cx + 3, 170);
    const eave = ROOF.top + ROOF.height;
    dark.hLine(eave, ROOF.x, ROOF.x + ROOF.width - 1);
    dark.hLine(eave + 1, ROOF.x + 1, ROOF.x + ROOF.width - 2, 120);
  }

  /**
   * The mailbox: a post, a box with its flag up, and more paper than fits.
   *
   * The scrolls sticking out of it are the actual content of this chapter —
   * "multiple client websites, delivered end to end" — and they are the one
   * thing here that is *not* modest.
   */
  private plotMailbox(): void {
    const timber = this.pixels("timber");
    const timberDark = this.pixels("timberDark");
    const metal = this.pixels("metal");
    const metalDark = this.pixels("metalDark");
    const paper = this.pixels("paper");
    const paperDark = this.pixels("paperDark");

    const x = MAILBOX.x;

    // The post, leaning a pixel: nothing here was set in concrete.
    timber.vLine(x + 2, MAILBOX.postTop, BASE - 1);
    timber.vLine(x + 3, MAILBOX.postTop + 1, BASE - 1);
    timberDark.vLine(x + 3, MAILBOX.postTop + 1, BASE - 1, 150);
    this.pixels("stoneDark").rect(x + 1, BASE - 1, 4, 1);

    // The box: a rounded lid, because a plain rectangle at this size reads as
    // a crate rather than as a mailbox.
    const by = MAILBOX.boxTop;
    metal.rect(x, by + 2, 11, 6);
    metal.hLine(by + 1, x + 1, x + 9);
    metal.hLine(by, x + 3, x + 7);
    metalDark.hLine(by + 7, x, x + 10);
    metalDark.vLine(x + 10, by + 2, by + 7);
    // The flag, up — there is always something waiting.
    metal.vLine(x + 11, by, by + 4);
    this.pixels("brick").rect(x + 11, by, 3, 3);

    // Four scrolls, at four angles, over-stuffed out of the open end.
    const scrolls = [
      { x: x + 2, y: by - 3, len: 5, lean: 0 },
      { x: x + 5, y: by - 5, len: 6, lean: 1 },
      { x: x + 7, y: by - 2, len: 4, lean: -1 },
      { x: x + 1, y: by - 1, len: 4, lean: 1 },
    ];
    for (const scroll of scrolls) {
      for (let i = 0; i < scroll.len; i++) {
        const px = scroll.x + Math.round(i * scroll.lean * 0.5);
        paper.set(px, scroll.y - i);
        paper.set(px + 1, scroll.y - i);
        if (i === scroll.len - 1) paperDark.set(px + 1, scroll.y - i);
      }
      paperDark.set(scroll.x, scroll.y + 1);
    }
  }

  /**
   * Smoke: a thread, not a plume.
   *
   * Four frames of the same rising column at four phases. Each frame drifts the
   * whole column up by one pixel and leans it a little further right, so the
   * loop reads as continuous rise rather than as four drawings.
   */
  private plotSmoke(): void {
    const originX = CHIMNEY.x + 3;
    const originY = CHIMNEY.top - 3;

    for (let f = 0; f < SMOKE_FRAMES; f++) {
      const smoke = this.pixels("smoke", f);
      const phase = (f / SMOKE_FRAMES) * Math.PI * 2;

      for (let i = 0; i < 12; i++) {
        const y = originY - i - f;
        if (y < 0) break;
        // A slow lean to the right, wandering as it climbs and thinning out.
        const lean = Math.round(Math.sin(phase + i * 0.5) * 1.4 + i * 0.22);
        // The thread thins as it climbs, but it starts opaque enough to see:
        // at the old ramp the whole column sat under the sky's own value.
        const alpha = Math.max(0, 215 - i * 12);
        smoke.set(originX + lean, y, alpha);
        // The column widens as it cools, but only above the first few pixels.
        if (i > 3 && i % 2 === 0) smoke.set(originX + lean + 1, y, Math.round(alpha * 0.7));
      }
    }
  }

  // --- Idle animation --------------------------------------------------------

  /**
   * Three small things: the smoke rises, the lamp breathes, and once in a
   * while somebody crosses the window.
   *
   * That is the whole of it. This is the quietest inhabited building on the
   * shore, and it should feel like one house with one person in it.
   */
  tick(elapsed: number): void {
    if (this.motionScale <= 0) return;

    const frame = Math.floor(elapsed / SMOKE_SECONDS) % SMOKE_FRAMES;
    if (frame !== this.smokeFrame) {
      this.smokeFrame = frame;
      this.setFrame("smoke", frame);
    }

    const breath = 1 - LAMP_DEPTH * (0.5 + 0.5 * Math.sin(elapsed * LAMP_RATE));
    // Somebody passing the lamp dims the window briefly, and the spill outside
    // with it — they are one light, and they have to move together.
    const passing = elapsed % PASS_PERIOD < PASS_LENGTH;
    this.setEmissiveScale("lamp", passing ? breath * 0.45 : breath);
    this.setEmissiveScale("spill", passing ? breath * 0.5 : breath);
  }
}
