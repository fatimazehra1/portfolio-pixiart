import { BuildingRenderer, type LayerMaterial } from "../BuildingRenderer";
import { createRandom } from "../../shared/random";

/**
 * The Workshop, in pixels.
 *
 * # One lit corner in a dark room
 * This building has exactly one job, and it is a contrast: three zones of it
 * are cold, dusty and finished with, and the fourth is warm, humming and still
 * being used. Left to right, as a cross-section through an open-fronted shed:
 *
 *   1. a shelf with a half-glazed donut on it, under cobwebs — Blender
 *   2. an old terminal, screen dead, cobwebbed — Three.js, and honestly dark
 *   3. an easel with a wireframe sketch on it — Figma, dim
 *   4. a server rack, lights blinking, warm light spilling out — the AI corner
 *
 * The first three are drawn in one cold, desaturated palette; the fourth
 * carries every emissive layer in the file. Nothing else in the composition is
 * allowed to *glow*, because the moment a second thing glows the story stops
 * being one corner still in use.
 *
 * # Dim is not dark
 * The dead bays are lit only by the ambient the scene gives them, and the
 * workshop's own climate is fog, haze and a local light of 0.45 — so a palette
 * chosen to read on a neutral background disappeared entirely under it. Every
 * tone in the dead half is now a long step lighter than it looks like it should
 * be, which is what it takes for the donut, the terminal and the easel to be
 * legible through the murk. The contrast still lands: they are lit by *nothing*
 * and the rack corner is lit by itself, and no amount of ambient closes that
 * gap.
 *
 * That reading is the same one the scene itself makes: `workshop` is a
 * `dormant` scene with a single `active` zone sitting over its right-hand end
 * (SceneRegistry §workshop). This is that zone, in architecture.
 *
 * # Open-fronted on purpose
 * A shed with a wall on it is a shed with a secret. The front is open, the
 * interior is a cross-section, and the four zones are simply *visible* — which
 * is the only way a building can tell you what is inside it without a label.
 *
 * TODO(assets): plotted in code because `public/assets/buildings/` is empty.
 * Authored art replaces `plot()` alone.
 */

// --- Dimensions --------------------------------------------------------------

const W = 132;
const H = 68;

const BASE = H - 2;

/** The shed: a wide, low box with its front cut away. */
const SHED = { x: 6, width: 120, top: 14 };
/** The floor of the room, and the roof over it. */
const FLOOR = BASE - 3;
const ROOF_H = 7;

/** The four zones, left to right. Each is a bay between two posts. */
const BAY_W = 29;
const BAY_0 = SHED.x + 3;
const BAY_1 = BAY_0 + BAY_W;
const BAY_2 = BAY_1 + BAY_W;
/** The one that is still in use. Deliberately the narrowest and the brightest. */
const BAY_3 = BAY_2 + BAY_W;

// --- Animation ---------------------------------------------------------------

/** The rack's lights. Four frames, fast enough to read as traffic. */
const RACK_FRAMES = 4;
const RACK_SECONDS = 0.32;

/** The glow the rack throws into the room, breathing very slightly. */
const GLOW_RATE = 0.8;
const GLOW_DEPTH = 0.12;

/** The fan in the rack. Two frames is all a fan at this size can be. */
const FAN_FRAMES = 2;
const FAN_SECONDS = 0.18;

/** Dust drifting through the dead half. Slow — nothing disturbs it. */
const DUST_FRAMES = 4;
const DUST_SECONDS = 1.15;

/**
 * The shimmer over the dead bays.
 *
 * Deliberately out of step with the drift: the frames move a mote across the
 * room every 1.15s and this fades the whole layer on a 2.6s cycle, so no mote
 * ever brightens in the same place twice and the air reads as *moving* rather
 * than as a texture being cross-faded.
 */
const SHIMMER_RATE = (Math.PI * 2) / 2.6;
const SHIMMER_DEPTH = 0.45;

// --- Materials ---------------------------------------------------------------

/**
 * Two palettes, and the whole design lives in the gap between them.
 *
 * Everything structural and everything in bays 0–2 is cold grey-brown, a full
 * step darker than any other building on the shore. The rack corner is warm
 * amber and cyan. Put side by side at this size, that difference reads before
 * any of the objects do — which is what makes the story legible from across
 * the water rather than only when you walk up to it.
 */
const MATERIALS: Record<string, LayerMaterial> = {
  /** The shed itself: weathered board and old steel. */
  board: { color: 0x8a8172 },
  boardLight: { color: 0xa39a89 },
  boardDark: { color: 0x5f594e },
  post: { color: 0x6d6558 },
  roof: { color: 0x77706a },
  roofLight: { color: 0x938b83 },
  roofDark: { color: 0x4f4a45 },

  /** The dead half's interior. Still the darkest thing here, but a *room*. */
  gloom: { color: 0x4f4843 },
  shelf: { color: 0x8a7358 },
  shelfDark: { color: 0x5d4d3c },
  /** Objects in the dead half: the donut, the terminal, the easel. */
  cold: { color: 0x938a7e },
  coldLight: { color: 0xb2a99b },
  coldDark: { color: 0x625b52 },
  /** The donut's half-finished glaze — the one colour left in the dead half. */
  glaze: { color: 0xc9819a },
  /** The wireframe on the easel, drawn rather than rendered. */
  wire: { color: 0xc2ccd2 },
  paper: { color: 0xded6c3 },
  /** Cobwebs, and the dust hanging in the still air. */
  web: { color: 0xc0b9ae },
  /**
   * Dust in the dead bays.
   *
   * Emissive, but only just: motes catch what little light there is rather than
   * making any of their own, so this is set high by day and low at night — the
   * opposite way round from the rack's glow, and the reason the two never read
   * as the same kind of light.
   */
  dust: { color: 0xd8d2c6, emissive: true, dayAlpha: 0.55, nightAlpha: 0.22 },

  /** The live corner: rack, cage, cabling. */
  rack: { color: 0x4b5058 },
  rackLight: { color: 0x666d76 },
  rackDark: { color: 0x33373d },
  cable: { color: 0x3f4348 },

  /** Everything that glows is in this corner, and nowhere else. */
  leds: { color: 0xa9ffd9, emissive: true, dayAlpha: 0.75, nightAlpha: 1 },
  fan: { color: 0x7fd6ef, emissive: true, dayAlpha: 0.35, nightAlpha: 0.9 },
  /** The warm wash it throws across the floor, the posts and the bay behind. */
  glow: { color: 0xffa851, emissive: true, dayAlpha: 0.45, nightAlpha: 1 },
  /** The hardest, brightest core of it, right at the rack's own face. */
  glowCore: { color: 0xffe0ab, emissive: true, dayAlpha: 0.6, nightAlpha: 1 },
};

const ORDER = [
  "gloom",
  "board",
  "boardLight",
  "boardDark",
  "shelf",
  "shelfDark",
  "cold",
  "coldLight",
  "coldDark",
  "glaze",
  "paper",
  "wire",
  "rack",
  "rackLight",
  "rackDark",
  "cable",
  "fan",
  "leds",
  // The wash goes on *over* the room, not behind it. Behind the gloom it was
  // invisible, which left the lit corner glowing at nothing.
  "glow",
  "glowCore",
  "post",
  "web",
  "roof",
  "roofLight",
  "roofDark",
  "dust",
];

export class WorkshopRenderer extends BuildingRenderer {
  private readonly rand = createRandom(0x7f21);

  private rackFrame = -1;
  private fanFrame = -1;
  private dustFrame = -1;

  constructor(private readonly motionScale = 1) {
    super(W, H);
  }

  protected get order(): readonly string[] {
    return ORDER;
  }

  protected get materials(): Record<string, LayerMaterial> {
    return MATERIALS;
  }

  /** The ridge, which is over the middle of a very wide, very low building. */
  override get promptTop(): number {
    return H - SHED.top + ROOF_H;
  }

  // --- Plotting --------------------------------------------------------------

  protected plot(): void {
    this.plotShell();
    this.plotDonutBay(BAY_0);
    this.plotTerminalBay(BAY_1);
    this.plotEaselBay(BAY_2);
    this.plotServerBay(BAY_3);
    this.plotCobwebs();
    this.plotDust();

    /**
     * Three of the four bays, and pointedly not the fourth.
     *
     * The whole building is an argument about which experiments are still
     * running: three bays dark, one lit. Marking the three dead ones and the
     * live one equally would flatten that. The donut bay is left alone — it is
     * the abandoned one, and the visitor finding three markers and one
     * unmarked corner is being told something true.
     */
    this.setHotspots([
      {
        id: "terminal",
        section: "Highlights",
        label: "Three.js and the web",
        x: BAY_1,
        y: SHED.top + ROOF_H,
        width: BAY_W,
        height: FLOOR - SHED.top - ROOF_H,
      },
      {
        id: "easel",
        section: "Highlights",
        label: "Interface and product design",
        x: BAY_2,
        y: SHED.top + ROOF_H,
        width: BAY_W,
        height: FLOOR - SHED.top - ROOF_H,
      },
      {
        id: "rack",
        section: "Highlights",
        label: "The bench still in use",
        x: BAY_3,
        y: SHED.top + ROOF_H,
        width: BAY_W,
        height: FLOOR - SHED.top - ROOF_H,
      },
    ]);
  }

  /**
   * The shed: back wall, floor, roof, and the four posts holding up the open
   * front.
   *
   * The interior is plotted as `gloom` first and everything else stands in
   * front of it, so every bay starts from dark and only the last one is lifted
   * out of it.
   */
  private plotShell(): void {
    const board = this.pixels("board");
    const light = this.pixels("boardLight");
    const dark = this.pixels("boardDark");
    const gloom = this.pixels("gloom");
    const post = this.pixels("post");

    const bodyTop = SHED.top + ROOF_H;

    // The room behind the opening.
    gloom.rect(SHED.x + 2, bodyTop, SHED.width - 4, FLOOR - bodyTop);
    // Board siding, but only as a frame around the opening — the front is cut
    // away, which is the whole reason you can see any of this.
    board.rect(SHED.x, bodyTop, 3, FLOOR - bodyTop);
    board.rect(SHED.x + SHED.width - 3, bodyTop, 3, FLOOR - bodyTop);
    board.rect(SHED.x, FLOOR, SHED.width, 3);
    light.hLine(FLOOR, SHED.x, SHED.x + SHED.width - 1);
    dark.hLine(FLOOR + 2, SHED.x, SHED.x + SHED.width - 1);
    dark.hLine(BASE, SHED.x - 1, SHED.x + SHED.width);

    // Horizontal boards across the back wall, just visible in the gloom.
    for (let y = bodyTop + 3; y < FLOOR - 1; y += 5) {
      dark.hLine(y, SHED.x + 3, SHED.x + SHED.width - 4, 70);
    }

    // Four posts. They divide the front into the four bays, which is what makes
    // the cross-section read as rooms rather than as one long shelf.
    for (const x of [BAY_1 - 2, BAY_2 - 2, BAY_3 - 2]) {
      post.rect(x, bodyTop, 2, FLOOR - bodyTop);
    }
    post.rect(SHED.x + 1, bodyTop, 2, FLOOR - bodyTop);
    post.rect(SHED.x + SHED.width - 3, bodyTop, 2, FLOOR - bodyTop);

    this.plotRoof();
  }

  /** A shallow corrugated roof with a deep eave over the open front. */
  private plotRoof(): void {
    const roof = this.pixels("roof");
    const light = this.pixels("roofLight");
    const dark = this.pixels("roofDark");

    for (let i = 0; i < ROOF_H; i++) {
      const y = SHED.top + i;
      const inset = Math.round((i / ROOF_H) * 4);
      roof.hLine(y, SHED.x - 3 + inset, SHED.x + SHED.width + 2 - inset);
    }
    light.hLine(SHED.top, SHED.x - 3, SHED.x + SHED.width + 2);
    dark.hLine(SHED.top + ROOF_H - 1, SHED.x - 3, SHED.x + SHED.width + 2);
    // Corrugation, which at this scale is a stripe every four pixels.
    for (let x = SHED.x - 2; x < SHED.x + SHED.width + 2; x += 4) {
      dark.vLine(x, SHED.top + 1, SHED.top + ROOF_H - 2, 60);
    }
    // The eave line under it, and a sag in the middle of a roof nobody has
    // fixed in a while.
    dark.hLine(SHED.top + ROOF_H, SHED.x - 3, SHED.x + SHED.width + 2);
    dark.hLine(SHED.top + ROOF_H + 1, SHED.x + 40, SHED.x + 74, 120);
  }

  /**
   * Bay one: the Blender donut, half-glazed, on a dusty shelf.
   *
   * Everybody's first 3D model, left exactly where it was finished — which is
   * to say half finished. The glaze is the only saturated colour in the dead
   * half of the building, so it reads as the one thing here somebody cared
   * about.
   */
  private plotDonutBay(x: number): void {
    const shelf = this.pixels("shelf");
    const shelfDark = this.pixels("shelfDark");
    const cold = this.pixels("cold");
    const dark = this.pixels("coldDark");
    const glaze = this.pixels("glaze");

    // Two shelves, the lower one holding junk, the upper one holding the donut.
    for (const y of [FLOOR - 22, FLOOR - 10]) {
      shelf.rect(x + 1, y, BAY_W - 6, 2);
      shelfDark.hLine(y + 2, x + 1, x + BAY_W - 6);
      shelf.vLine(x + 1, y, y + 2);
      shelf.vLine(x + BAY_W - 6, y, y + 2);
    }

    // The donut: a squat torus, which at eleven pixels across is a ring with a
    // flat top and a hole two pixels wide.
    const cx = x + 11;
    const cy = FLOOR - 26;
    cold.rect(cx - 5, cy + 1, 11, 3);
    cold.rect(cx - 4, cy, 9, 1);
    cold.rect(cx - 4, cy + 4, 9, 1);
    dark.rect(cx - 1, cy + 1, 3, 2);
    // Glaze over the left half only. Half done, and it stayed that way.
    glaze.rect(cx - 5, cy, 6, 2);
    glaze.set(cx - 5, cy + 2);
    glaze.set(cx - 4, cy + 2);
    // Sprinkles, because a donut without them is a bagel.
    dark.set(cx - 4, cy);
    dark.set(cx - 2, cy + 1);

    // Junk on the lower shelf: a couple of boxes, stacked badly.
    cold.rect(x + 3, FLOOR - 17, 7, 7);
    dark.frame(x + 3, FLOOR - 17, 7, 7);
    cold.rect(x + 12, FLOOR - 14, 9, 4);
    dark.frame(x + 12, FLOOR - 14, 9, 4);
  }

  /**
   * Bay two: the terminal, screen off.
   *
   * The honest one. Three.js was tried and put down, and a dead CRT with dust
   * on it says that better than a screen showing a spinning cube would — a lit
   * screen here would be a second glowing thing, and there is only allowed to
   * be one.
   */
  private plotTerminalBay(x: number): void {
    const cold = this.pixels("cold");
    const light = this.pixels("coldLight");
    const dark = this.pixels("coldDark");
    const shelf = this.pixels("shelf");
    const shelfDark = this.pixels("shelfDark");

    // The desk it stands on.
    const deskY = FLOOR - 12;
    shelf.rect(x + 1, deskY, BAY_W - 5, 2);
    shelfDark.hLine(deskY + 2, x + 1, x + BAY_W - 5);
    shelf.vLine(x + 3, deskY + 2, FLOOR - 1);
    shelf.vLine(x + BAY_W - 7, deskY + 2, FLOOR - 1);

    // The monitor: a deep box with a dead screen sunk into its face.
    const mx = x + 6;
    const my = deskY - 16;
    cold.rect(mx, my, 17, 15);
    light.hLine(my, mx, mx + 16);
    light.vLine(mx, my, my + 14);
    dark.vLine(mx + 16, my, my + 14);
    dark.hLine(my + 14, mx, mx + 16);
    // The screen. Unlit `gloom`, not black — nothing on this shore is black.
    this.pixels("gloom").rect(mx + 2, my + 2, 13, 10);
    dark.frame(mx + 2, my + 2, 13, 10);
    // One dead highlight across the glass, so it reads as glass and not a hole.
    light.hLine(my + 4, mx + 4, mx + 8, 60);

    // A keyboard, pushed back and left at an angle nobody straightened.
    cold.rect(x + 5, deskY - 1, 13, 2);
    dark.hLine(deskY, x + 5, x + 17, 150);
  }

  /**
   * Bay three: an easel with a wireframe on it.
   *
   * The interface work. A frame, a couple of boxes and the connecting lines —
   * a wireframe drawn as an actual wireframe, which is the joke and also the
   * clearest possible way to say "design" in twenty pixels.
   */
  private plotEaselBay(x: number): void {
    const cold = this.pixels("cold");
    const dark = this.pixels("coldDark");
    const paper = this.pixels("paper");
    const wire = this.pixels("wire");

    const boardX = x + 5;
    const boardY = FLOOR - 30;
    const boardW = 18;
    const boardH = 20;

    // The easel legs, splayed, with the board resting on the crossbar.
    for (let i = 0; i < 14; i++) {
      cold.set(boardX + 2 - Math.round(i * 0.35), boardY + boardH + i);
      cold.set(boardX + boardW - 3 + Math.round(i * 0.35), boardY + boardH + i);
    }
    cold.hLine(boardY + boardH + 5, boardX - 1, boardX + boardW);
    cold.hLine(boardY + boardH, boardX - 1, boardX + boardW);

    paper.rect(boardX, boardY, boardW, boardH);
    dark.frame(boardX, boardY, boardW, boardH);

    // The sketch: a header bar, two columns and a caption rule. Wireframe
    // furniture, in the order anybody actually draws it.
    wire.frame(boardX + 2, boardY + 2, boardW - 4, 4);
    wire.frame(boardX + 2, boardY + 7, 6, 7);
    wire.frame(boardX + 10, boardY + 7, 6, 7);
    wire.hLine(boardY + 16, boardX + 2, boardX + boardW - 3);
    wire.hLine(boardY + 18, boardX + 2, boardX + 10);
  }

  /**
   * Bay four: the one corner still in use.
   *
   * A server rack in a cage, a fan, a column of blinking lights, and a warm
   * wash spilling left across the floor and up the posts. Every emissive layer
   * in this file is here. It is the smallest bay and by far the loudest, which
   * is precisely the relationship between this corner and the rest of the
   * building.
   */
  private plotServerBay(x: number): void {
    const rack = this.pixels("rack");
    const light = this.pixels("rackLight");
    const dark = this.pixels("rackDark");
    const cable = this.pixels("cable");
    const core = this.pixels("glowCore");

    const rx = x + 4;
    const top = FLOOR - 34;
    const rw = 18;
    const rh = 34;

    rack.rect(rx, top, rw, rh);
    light.vLine(rx, top, top + rh - 1);
    light.hLine(top, rx, rx + rw - 1);
    dark.vLine(rx + rw - 1, top, top + rh - 1);
    dark.hLine(top + rh - 1, rx, rx + rw - 1);

    // Eight units in the rack, each a slot with a vent and a status light.
    for (let unit = 0; unit < 8; unit++) {
      const y = top + 2 + unit * 4;
      dark.hLine(y + 3, rx + 1, rx + rw - 2, 170);
      // Vents, cut as a dotted line so the face is not a flat panel.
      for (let vx = rx + 3; vx < rx + 11; vx += 2) light.set(vx, y + 1, 90);
    }

    // Cabling down the right-hand side, looping out and back in.
    for (let i = 0; i < rh - 6; i++) {
      const sway = Math.round(Math.sin(i * 0.4) * 1.6);
      cable.set(rx + rw + 1 + sway, top + 3 + i);
      if (i % 3 === 0) cable.set(rx + rw + 2 + sway, top + 3 + i, 150);
    }

    // The fan, in the top unit. Two frames, plotted below.
    this.plotFan(rx + rw - 8, top + 3);

    // The blinking lights: four frames of a column of LEDs, each frame a
    // different set lit, so the traffic looks like traffic and not a metronome.
    for (let f = 0; f < RACK_FRAMES; f++) {
      const leds = this.pixels("leds", f);
      for (let unit = 0; unit < 8; unit++) {
        const y = top + 3 + unit * 4;
        // Two lights per unit: a steady one and one that actually blinks.
        leds.set(rx + rw - 4, y);
        if (this.rand() < 0.55) leds.set(rx + rw - 6, y);
      }
    }

    // The hard core of the glow: a halo *around* the rack, not a wash over
    // it. Filling the face was hiding the one machine in the building that is
    // still running, which is the opposite of the point.
    core.frame(rx - 2, top - 1, rw + 4, rh + 2, 190);
    core.frame(rx - 3, top - 2, rw + 6, rh + 4, 110);
    core.frame(rx - 4, top - 3, rw + 8, rh + 6, 55);

    this.plotSpill(rx, top, rw, rh);
  }

  /** The fan: two frames of a four-blade cross, half a turn apart. */
  private plotFan(x: number, y: number): void {
    for (let f = 0; f < FAN_FRAMES; f++) {
      const fan = this.pixels("fan", f);
      if (f === 0) {
        fan.hLine(y + 2, x, x + 4);
        fan.vLine(x + 2, y, y + 4);
      } else {
        for (let i = 0; i < 5; i++) {
          fan.set(x + i, y + i);
          fan.set(x + 4 - i, y + i);
        }
      }
    }
  }

  /**
   * The wash the rack throws into the room.
   *
   * It falls left, because that is where the rest of the building is, and it
   * dies out about two bays along — far enough to make the point that this
   * corner lights the room, short enough that the easel stays in the dark.
   */
  private plotSpill(rx: number, top: number, rw: number, rh: number): void {
    const glow = this.pixels("glow");

    // A cone opening leftward from the rack's face, thinning as it goes.
    const reach = 46;
    for (let i = 0; i < reach; i++) {
      const x = rx - 4 - i;
      if (x < SHED.x + 2) break;
      const fade = 1 - i / reach;
      const half = Math.round(6 + i * 0.55);
      const cy = top + rh - 8;
      const alpha = Math.round(205 * fade * fade);
      if (alpha <= 4) continue;
      for (let dy = -half; dy <= half; dy++) {
        const y = cy + dy;
        if (y < top || y > FLOOR - 1) continue;
        // Softer at the edges of the cone than in the middle of it.
        const edge = 1 - Math.abs(dy) / (half + 1);
        glow.set(x, y, Math.round(alpha * (0.35 + 0.65 * edge)));
      }
    }

    // And a pool of it on the floor directly under the rack, which is the part
    // that actually reads at a glance.
    glow.rect(rx - 14, FLOOR - 2, rw + 24, 2, 225);
    glow.rect(rx - 6, top + rh, rw + 10, 2, 245);
    // And up the post beside it, so the light is landing on something solid
    // rather than hanging in the air.
    glow.vLine(rx - 6, top + 4, FLOOR - 2, 150);
    glow.vLine(rx - 7, top + 8, FLOOR - 2, 90);
  }

  /**
   * Cobwebs, and only in the dead half.
   *
   * Corners first — a web across the middle of a room is a decoration, and a
   * web in the angle between two beams is somewhere a spider would actually
   * build. None of them go past the third post: the live corner is used, and
   * used means swept.
   */
  private plotCobwebs(): void {
    const web = this.pixels("web");
    const bodyTop = SHED.top + ROOF_H;

    const corners: { x: number; y: number; flip: boolean }[] = [
      { x: SHED.x + 3, y: bodyTop + 1, flip: false },
      { x: BAY_1 - 3, y: bodyTop + 1, flip: true },
      { x: BAY_1 + 1, y: bodyTop + 1, flip: false },
      { x: BAY_2 - 3, y: bodyTop + 1, flip: true },
      { x: BAY_2 + 1, y: bodyTop + 1, flip: false },
    ];

    for (const corner of corners) {
      const dir = corner.flip ? -1 : 1;
      const span = 8;
      // Two radials and two arcs is enough to read as a web at this size.
      for (let i = 0; i < span; i++) {
        web.set(corner.x + dir * i, corner.y + i, 150);
        web.set(corner.x + dir * i, corner.y + Math.round(i * 0.45), 110);
        web.set(corner.x + Math.round(dir * i * 0.45), corner.y + i, 110);
      }
      for (const radius of [4, 7]) {
        for (let i = 0; i <= radius; i++) {
          web.set(corner.x + dir * i, corner.y + (radius - i), 90);
        }
      }
    }

    // One long strand hanging off the dead terminal, because a room nobody
    // enters gets vertical webs as well as corner ones.
    for (let i = 0; i < 7; i++) web.set(BAY_1 + 14, FLOOR - 30 + i, 90);
  }

  /**
   * Dust hanging in the dead half.
   *
   * Four frames, drifting sideways rather than up: there is no heat in this
   * end of the building to lift it. It stops at the third post for the same
   * reason the cobwebs do.
   */
  private plotDust(): void {
    const motes: { x: number; y: number; drift: number }[] = [];
    for (let i = 0; i < 16; i++) {
      motes.push({
        x: SHED.x + 4 + this.rand() * (BAY_3 - SHED.x - 10),
        y: SHED.top + ROOF_H + 2 + this.rand() * (FLOOR - SHED.top - ROOF_H - 6),
        drift: 0.5 + this.rand() * 1.5,
      });
    }

    for (let f = 0; f < DUST_FRAMES; f++) {
      const dust = this.pixels("dust", f);
      const t = f / DUST_FRAMES;
      for (const mote of motes) {
        dust.set(
          Math.round(mote.x + t * mote.drift * 5),
          Math.round(mote.y + Math.sin(t * Math.PI * 2 + mote.x) * 1.5),
          120
        );
      }
    }
  }

  // --- Idle animation --------------------------------------------------------

  /**
   * Everything that moves is in the last bay, except the dust — and the dust
   * moves because nothing is disturbing it.
   *
   * That split is the animation doing the same job the palette does: the room
   * is still, the corner is running.
   */
  tick(elapsed: number): void {
    if (this.motionScale <= 0) return;

    const rack = Math.floor(elapsed / RACK_SECONDS) % RACK_FRAMES;
    if (rack !== this.rackFrame) {
      this.rackFrame = rack;
      this.setFrame("leds", rack);
    }

    const fan = Math.floor(elapsed / FAN_SECONDS) % FAN_FRAMES;
    if (fan !== this.fanFrame) {
      this.fanFrame = fan;
      this.setFrame("fan", fan);
    }

    const dust = Math.floor(elapsed / DUST_SECONDS) % DUST_FRAMES;
    if (dust !== this.dustFrame) {
      this.dustFrame = dust;
      this.setFrame("dust", dust);
    }

    // The motes catch the light and lose it again. Never all the way off:
    // dust that blinks out is a rendering fault, not still air.
    this.setEmissiveScale(
      "dust",
      1 - SHIMMER_DEPTH * (0.5 + 0.5 * Math.sin(elapsed * SHIMMER_RATE))
    );

    // The wash breathes with the load on the machine. Shallow: a room lit by a
    // rack does not pulse, it hums.
    const breath = 1 - GLOW_DEPTH * (0.5 + 0.5 * Math.sin(elapsed * GLOW_RATE));
    this.setEmissiveScale("glow", breath);
    this.setEmissiveScale("glowCore", breath);
  }
}
