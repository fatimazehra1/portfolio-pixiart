import { BuildingRenderer, type LayerMaterial } from "../BuildingRenderer";
import { createRandom } from "../../shared/random";

/**
 * Planet01 Tower, in pixels.
 *
 * # Why it is the shape it is
 * Four storeys, and each one is a project. Read bottom to top it is a career
 * getting faster: a warm little restaurant site at street level, a blue trading
 * screen above it, then the floor that takes up more of the building than any
 * other because it took up more of the years than any other, then delivery, then
 * a room on the roof with two people being taught in it.
 *
 * The third floor is deliberately the tallest band and the only one split into
 * wings, because CTAWORLD is the part with three faces talking to each other —
 * and the pulses crossing between them are the only motion on the building fast
 * enough to notice. Everything else breathes.
 *
 * # Scale
 * Two and a half times the campus and half again the lighthouse, so it reads as
 * the centrepiece from most of the shore (ART_DIRECTION.md §World Scale). The
 * lighthouse still wins the horizon, because it stands at the end of the world
 * and this stands in the middle of it.
 *
 * TODO(assets): plotted in code because `public/assets/buildings/` is empty.
 * Authored art replaces `plot()` alone.
 */

// --- Dimensions --------------------------------------------------------------

const W = 108;
const H = 168;
const CX = 54;

/** Vertical bands, top to bottom. Each floor is a chapter. */
const MAST = { top: 0, bottom: 18 };
const ROOF = { top: 19, bottom: 46 };
/** Dominos rider dashboard. */
const F4 = { top: 47, bottom: 76 };
/** CTAWORLD. The tallest band, and the heart of the building. */
const F3 = { top: 77, bottom: 122 };
/** The Bitcoin frontend. */
const F2 = { top: 123, bottom: 146 };
/** The Laravel catering site, at street level where a restaurant belongs. */
const PODIUM = { top: 147, bottom: 161 };
const APRON = { top: 162, bottom: 167 };

/** The shaft, and the wider floors that step out of it. */
const SHAFT = { x: 25, width: 58 };
const PODIUM_BOX = { x: 14, width: 80 };

/**
 * CTAWORLD: one continuous floor, articulated into three bays.
 *
 * Not three towers. Three *wings* — the floor runs unbroken from end to end and
 * is read as three by the recessed joints between the bays, which is how a
 * building actually expresses a division and how anyone would draw one at this
 * size. Free-standing slabs with gaps between them would say the opposite of
 * what this floor is for.
 */
const FLOOR3 = { x: 18, width: 72 };
const WINGS = [
  { x: 19, width: 22, name: "super admin" },
  { x: 43, width: 22, name: "partners" },
  { x: 67, width: 22, name: "subscribers" },
] as const;
/** The recessed joints, and the channel the traffic crosses them on. */
const LINKS = [
  { x: 41, width: 3 },
  { x: 65, width: 3 },
] as const;
/** How far either side of a joint the traffic is visible. */
const PULSE_REACH = 7;

// --- Animation ---------------------------------------------------------------

/** Frames, and how long each is held. */
const TICKER_FRAMES = 8;
const TICKER_SECONDS = 0.11;
const PULSE_FRAMES = 10;
const PULSE_SECONDS = 0.1;
const FAN_FRAMES = 4;
const FAN_SECONDS = 0.07;
const FIGURE_FRAMES = 2;
const FIGURE_SECONDS = 4.1;

/**
 * How the office lights behave.
 *
 * Windows are dealt into four groups at bake time and each group is switched by
 * its own slow, out-of-phase cycle. Four independent squares beat against each
 * other for long enough that the pattern never visibly repeats, which is what a
 * single looping animation of "random" lights can never manage.
 */
const OFFICE_GROUPS = 4;
const OFFICE_CYCLES = [11.3, 17.9, 23.7, 31.1];
const OFFICE_DUTY = [0.62, 0.55, 0.7, 0.48];

/** The beacon on the mast: a long wait, a short flash. */
const BEACON_PERIOD = 2.6;
const BEACON_FLASH = 0.35;

/** How far the neon breathes either side of full, and how slowly. */
const NEON_DEPTH = 0.14;
const NEON_RATE = 0.7;

// --- Materials ---------------------------------------------------------------

/**
 * Glass, steel and concrete — and nothing warm in the structure itself.
 *
 * The building is cool and the *life* in it is warm, which is the whole reason
 * it reads as occupied after dark. Muted throughout; a modern tower on this
 * shore still has to look sun-faded (ART_DIRECTION.md §Color Philosophy).
 */
const MATERIALS: Record<string, LayerMaterial> = {
  /**
   * Curtain wall.
   *
   * Light rather than dark, which is the whole difference between glass and a
   * hole. Glazing reads by what it *reflects* — the sky above it and the sea in
   * front of it — so the base colour has to sit near the bright end and let the
   * ambient carry it down at night, not start there.
   */
  glass: { color: 0x8298ab },
  /** The head of each band, where a pane catches most of the sky. */
  glassSky: { color: 0xaec4d6 },

  steel: { color: 0x8b97a3 },
  steelLight: { color: 0xaab5bf },
  steelDark: { color: 0x5e6874 },

  concrete: { color: 0xa9a59c },
  concreteDark: { color: 0x7b7870 },
  concreteLight: { color: 0xc3bfb5 },

  /** Ground floor: the catering site. Restaurant light, not office light. */
  warm: { color: 0xf5b878, emissive: true, dayAlpha: 0.14, nightAlpha: 1 },
  awning: { color: 0xa8564a },
  awningLight: { color: 0xc47164 },

  /** Second floor: the Bitcoin frontend. */
  neon: { color: 0x5fd0ff, emissive: true, dayAlpha: 0.06, nightAlpha: 1 },
  ticker: { color: 0x8ee3ff, emissive: true, dayAlpha: 0.1, nightAlpha: 1 },

  /** Third floor: CTAWORLD. Four groups of ordinary office light. */
  office0: { color: 0xf6e2b0, emissive: true, dayAlpha: 0.05, nightAlpha: 1 },
  office1: { color: 0xf6e2b0, emissive: true, dayAlpha: 0.05, nightAlpha: 1 },
  office2: { color: 0xf1dcb4, emissive: true, dayAlpha: 0.05, nightAlpha: 1 },
  office3: { color: 0xf1dcb4, emissive: true, dayAlpha: 0.05, nightAlpha: 1 },
  /** Traffic crossing the bridges between the wings. */
  pulse: { color: 0x8ff0cf, emissive: true, dayAlpha: 0.25, nightAlpha: 1 },
  /** Abstract payment marks by the entrance to the floor. Never a real logo. */
  payment: { color: 0xcfd8e0 },

  /** Fourth floor: the rider dashboard. */
  rider: { color: 0xe8705c, emissive: true, dayAlpha: 0.12, nightAlpha: 1 },
  riderInk: { color: 0xdfe6ec },

  /** The roof: a classroom, its two occupants, and the plant around it. */
  classroom: { color: 0xf7dca6, emissive: true, dayAlpha: 0.1, nightAlpha: 1 },
  figures: { color: 0x3a3630 },
  beacon: { color: 0xff6b5a, emissive: true, dayAlpha: 0.4, nightAlpha: 1 },
};

/** Back to front. Glass first, then what is behind it, then the frame over both. */
const ORDER = [
  "concrete",
  "concreteLight",
  "concreteDark",
  "glass",
  "glassSky",
  "warm",
  "neon",
  "ticker",
  "office0",
  "office1",
  "office2",
  "office3",
  "rider",
  "classroom",
  "figures",
  "steel",
  "steelLight",
  "steelDark",
  // After the joints, not before them: traffic crossing between the wings has
  // to be drawn on top of the recess it is crossing, or the building swallows it.
  "pulse",
  "payment",
  "riderInk",
  "awning",
  "awningLight",
  "beacon",
];

export class Planet01Renderer extends BuildingRenderer {
  private readonly rand = createRandom(0x9107);

  private tickerFrame = -1;
  private pulseFrame = -1;
  private fanFrame = -1;
  private figureFrame = -1;

  constructor(private readonly motionScale = 1) {
    super(W, H);
  }

  protected get order(): readonly string[] {
    // The fan layers are made per frame, so they are named rather than listed.
    return [...ORDER, "fan"];
  }

  protected get materials(): Record<string, LayerMaterial> {
    return { ...MATERIALS, fan: { color: 0x9aa5b0 } };
  }

  /**
   * Clear of the mast.
   *
   * Unlike the campus's flagpole, the mast is on the centre line and part of the
   * silhouette, so the prompt belongs above the whole thing rather than beside
   * it. Anything lower and the panel gets a spike through it.
   */
  override get promptTop(): number {
    return H + 2;
  }

  // --- Plotting --------------------------------------------------------------

  protected plot(): void {
    this.plotApron();
    this.plotPodium();
    this.plotFloorTwo();
    this.plotFloorThree();
    this.plotFloorFour();
    this.plotRoof();
  }

  /**
   * The forecourt: concrete, a kerb, two modern lamps and a small parking bay.
   *
   * Restrained on purpose. A tower this size wants a *setting*, not a car park —
   * enough paving to say the building has a front door and a place to leave a
   * car, and then the shore's own planting takes over at the edges.
   */
  private plotApron(): void {
    const concrete = this.pixels("concrete");
    const light = this.pixels("concreteLight");
    const dark = this.pixels("concreteDark");
    const steel = this.pixels("steel");
    const steelLight = this.pixels("steelLight");

    const top = APRON.top;
    const bottom = APRON.bottom;

    concrete.rect(4, top, W - 8, bottom - top + 1);
    light.hLine(top, 4, W - 5);
    dark.hLine(bottom, 4, W - 5);
    // Slab joints. Concrete is poured in bays, and the joints are what stop a
    // large flat area reading as a grey rectangle.
    for (let x = 12; x < W - 8; x += 14) dark.vLine(x, top + 1, bottom - 1, 110);

    // Parking bays, marked out on the right where the tower isn't.
    for (let i = 0; i < 3; i++) {
      const x = 84 + i * 8;
      light.vLine(x, top + 1, top + 4, 160);
    }

    // Two cars, small enough to read as parked rather than as characters.
    for (const x of [86, 94]) {
      dark.rect(x, top + 1, 7, 3);
      steel.rect(x + 1, top, 5, 2);
      steelLight.hLine(top, x + 1, x + 5);
      dark.set(x, top + 4);
      dark.set(x + 6, top + 4);
    }

    // Two slim modern lamps flanking the entrance. Nothing like the shore's
    // lanterns — this building is from a different decade.
    for (const x of [14, W - 15]) {
      steel.vLine(x, PODIUM.bottom - 16, bottom - 1);
      steel.hLine(PODIUM.bottom - 16, x, x + (x < CX ? 4 : -4));
      steelLight.set(x, PODIUM.bottom - 16);
      this.pixels("warm").rect(x + (x < CX ? 3 : -4), PODIUM.bottom - 15, 2, 2);
    }
  }

  /**
   * The ground floor: the catering site.
   *
   * A restaurant frontage rather than an office lobby — a deep awning, glazing
   * warm all the way down, and light spilling onto the paving. It is the one
   * part of the building that is trying to look welcoming.
   */
  private plotPodium(): void {
    const concrete = this.pixels("concrete");
    const dark = this.pixels("concreteDark");
    const light = this.pixels("concreteLight");
    const glass = this.pixels("glass");
    const warm = this.pixels("warm");
    const steel = this.pixels("steel");
    const steelDark = this.pixels("steelDark");
    const awning = this.pixels("awning");
    const awningLight = this.pixels("awningLight");

    const { top, bottom } = PODIUM;
    const { x, width } = PODIUM_BOX;

    concrete.rect(x, top, width, bottom - top + 1);
    light.vLine(x, top, bottom);
    dark.vLine(x + width - 1, top, bottom);
    dark.hLine(bottom, x, x + width - 1);

    // Full-height glazing, warm behind every pane.
    const glazeTop = top + 4;
    for (let gx = x + 3; gx < x + width - 4; gx += 7) {
      glass.rect(gx, glazeTop, 5, bottom - glazeTop - 1);
      warm.rect(gx, glazeTop, 5, bottom - glazeTop - 1);
      steelDark.vLine(gx - 1, glazeTop, bottom - 1);
    }
    steel.hLine(glazeTop - 1, x + 1, x + width - 2);
    steel.hLine(bottom - 1, x + 1, x + width - 2);

    // The entrance: a taller opening under the awning, on the centre line.
    const doorWidth = 12;
    warm.rect(CX - (doorWidth >> 1), glazeTop, doorWidth, bottom - glazeTop);
    glass.rect(CX - (doorWidth >> 1), glazeTop, doorWidth, bottom - glazeTop);
    steelDark.vLine(CX, glazeTop, bottom - 1);
    steelDark.vLine(CX - (doorWidth >> 1) - 1, glazeTop - 1, bottom - 1);
    steelDark.vLine(CX + (doorWidth >> 1), glazeTop - 1, bottom - 1);

    // The awning. Scalloped, because a straight one would read as a shelf.
    const awningY = glazeTop - 3;
    awning.rect(CX - 14, awningY, 28, 3);
    awningLight.hLine(awningY, CX - 14, CX + 13);
    for (let i = 0; i < 28; i += 4) {
      awning.set(CX - 14 + i + 1, awningY + 3);
      awning.set(CX - 14 + i + 2, awningY + 3);
    }
    // Light thrown down onto the paving from inside.
    warm.rect(CX - 10, APRON.top, 20, 1, 90);
  }

  /**
   * The second floor: the Bitcoin frontend.
   *
   * Cold blue against a warm building, one continuous band of screen rather than
   * separate windows, and a ticker crawling across it. Minimal movement, as
   * asked — the ticker is the only thing on this floor that does anything.
   */
  private plotFloorTwo(): void {
    const { top, bottom } = F2;
    const glass = this.pixels("glass");
    const sky = this.pixels("glassSky");
    const neon = this.pixels("neon");
    const steel = this.pixels("steel");
    const steelDark = this.pixels("steelDark");

    this.plotSlab(SHAFT.x - 2, top - 1, SHAFT.width + 4);

    glass.rect(SHAFT.x, top + 2, SHAFT.width, bottom - top - 2);
    sky.rect(SHAFT.x, top + 2, SHAFT.width, 3);

    // Mullions every four pixels — a trading floor is one long window.
    for (let x = SHAFT.x + 4; x < SHAFT.x + SHAFT.width; x += 4) {
      steelDark.vLine(x, top + 2, bottom - 1);
    }
    steel.vLine(SHAFT.x - 1, top, bottom);
    steel.vLine(SHAFT.x + SHAFT.width, top, bottom);

    // The screen glow behind the glass, brightest in the middle of the band.
    neon.rect(SHAFT.x + 1, top + 4, SHAFT.width - 2, bottom - top - 6, 120);
    neon.rect(SHAFT.x + 1, top + 6, SHAFT.width - 2, 3, 200);

    // The ticker rail, and the crawl along it. Eight frames stepping one pixel,
    // with a pattern that repeats every eight — so the loop is seamless.
    const railY = bottom - 6;
    steelDark.hLine(railY - 1, SHAFT.x, SHAFT.x + SHAFT.width - 1);
    steelDark.hLine(railY + 4, SHAFT.x, SHAFT.x + SHAFT.width - 1);

    for (let f = 0; f < TICKER_FRAMES; f++) {
      const band = this.pixels("ticker", f);
      for (let i = 0; i < SHAFT.width + 8; i++) {
        const x = SHAFT.x + i - f;
        if (x < SHAFT.x || x >= SHAFT.x + SHAFT.width) continue;
        // A repeating run of marks that reads as figures scrolling past.
        const cell = i % 8;
        if (cell === 0 || cell === 1 || cell === 4) {
          band.vLine(x, railY, railY + 2);
        } else if (cell === 6) {
          band.set(x, railY + 1);
          band.set(x, railY + 2);
        }
      }
    }
  }

  /**
   * The third floor: CTAWORLD.
   *
   * The tallest band, stepped out wider than the shaft, and split into three
   * wings joined by bridges — Super Admin, Partners, Subscribers. Pulses cross
   * the bridges continuously, which is the only literal thing on the building:
   * three systems talking to each other in real time.
   */
  private plotFloorThree(): void {
    const { top, bottom } = F3;
    const steel = this.pixels("steel");
    const steelLight = this.pixels("steelLight");
    const steelDark = this.pixels("steelDark");
    const glass = this.pixels("glass");
    const sky = this.pixels("glassSky");
    const payment = this.pixels("payment");

    // One continuous floor, stepped out past the shaft on both sides.
    this.plotSlab(FLOOR3.x - 2, top - 1, FLOOR3.width + 4);
    this.plotSlab(FLOOR3.x - 2, bottom - 1, FLOOR3.width + 4);

    glass.rect(FLOOR3.x, top + 2, FLOOR3.width, bottom - top - 3);
    sky.rect(FLOOR3.x, top + 2, FLOOR3.width, 3);
    steel.vLine(FLOOR3.x - 1, top, bottom);
    steel.vLine(FLOOR3.x + FLOOR3.width, top, bottom);
    steelLight.vLine(FLOOR3.x, top + 2, bottom - 2);
    steelDark.vLine(FLOOR3.x + FLOOR3.width - 1, top + 2, bottom - 2);

    for (const wing of WINGS) {
      this.plotOfficeWindows(wing.x, top + 5, wing.width, bottom - top - 12);
    }

    // The joints. Recessed and shadowed, so the eye reads three bays in one
    // building rather than one bay repeated three times.
    for (const link of LINKS) {
      steelDark.rect(link.x, top + 2, link.width, bottom - top - 3);
      steel.vLine(link.x - 1, top + 2, bottom - 2, 170);
      steel.vLine(link.x + link.width, top + 2, bottom - 2, 170);
    }

    this.plotPulses();

    // Abstract payment marks beside the floor's entrance bay: a card, a set of
    // bars, a pair of chevrons. Evocative of what this floor moved around, and
    // deliberately nobody's actual logo (CLAUDE.md §Do Not Guess, §Assets).
    const markY = bottom - 10;
    const markX = WINGS[1].x + 2;

    payment.frame(markX, markY, 8, 6);
    payment.hLine(markY + 2, markX + 1, markX + 6);

    for (let i = 0; i < 3; i++) payment.hLine(markY + i * 2, markX + 11, markX + 11 + 5 - i);

    for (let i = 0; i < 3; i++) {
      payment.set(markX + 21 + i, markY + i);
      payment.set(markX + 21 + i, markY + 5 - i);
      payment.set(markX + 24 + i, markY + i);
      payment.set(markX + 24 + i, markY + 5 - i);
    }
  }

  /**
   * Traffic crossing the joints between the wings, one frame per step.
   *
   * Each comet runs from inside one wing, through the recess, and into the next
   * — so what you see is a wing *handing something over*, which is the only
   * thing this floor is trying to say. The two joints run opposite ways, so it
   * reads as a conversation and not as a conveyor.
   */
  private plotPulses(): void {
    const upper = F3.top + 16;
    const lower = F3.bottom - 18;

    for (let f = 0; f < PULSE_FRAMES; f++) {
      const pulse = this.pixels("pulse", f);

      for (let l = 0; l < LINKS.length; l++) {
        const link = LINKS[l];
        const from = link.x - PULSE_REACH;
        const span = link.width + PULSE_REACH * 2;
        const t = l === 0 ? f / PULSE_FRAMES : 1 - f / PULSE_FRAMES;
        const head = from + t * span;
        const y = l === 0 ? upper : lower;

        // A short comet: bright head, fading tail behind it.
        for (let d = 0; d < 4; d++) {
          const px = Math.round(head - (l === 0 ? d : -d));
          if (px < from || px >= from + span) continue;
          pulse.set(px, y, [255, 170, 100, 55][d]);
        }
      }
    }
  }

  /**
   * The fourth floor: the rider dashboard.
   *
   * Simple and recognisable, as asked — a band of screens with a route running
   * across them and a delivery mark on the spandrel. It sits directly under the
   * roof, which is where the last job before teaching belongs.
   */
  private plotFloorFour(): void {
    const { top, bottom } = F4;
    const glass = this.pixels("glass");
    const sky = this.pixels("glassSky");
    const steel = this.pixels("steel");
    const steelDark = this.pixels("steelDark");
    const rider = this.pixels("rider");
    const ink = this.pixels("riderInk");

    this.plotSlab(SHAFT.x - 2, top - 1, SHAFT.width + 4);

    glass.rect(SHAFT.x, top + 2, SHAFT.width, bottom - top - 3);
    sky.rect(SHAFT.x, top + 2, SHAFT.width, 3);
    steel.vLine(SHAFT.x - 1, top, bottom);
    steel.vLine(SHAFT.x + SHAFT.width, top, bottom);

    this.plotOfficeWindows(SHAFT.x + 2, top + 5, SHAFT.width - 4, bottom - top - 9);

    // The route: a dashed line stepping across the floor with a marker at the
    // end of it. A delivery is a path and a destination, and at this size that
    // is the whole of what will read.
    const routeY = bottom - 5;
    for (let i = 0; i < SHAFT.width - 12; i += 3) {
      const x = SHAFT.x + 5 + i;
      const lift = i > 12 && i < 26 ? -1 : 0;
      rider.set(x, routeY + lift);
      rider.set(x + 1, routeY + lift, 150);
    }
    // The pin at the end.
    const pinX = SHAFT.x + SHAFT.width - 8;
    rider.rect(pinX, routeY - 5, 3, 3);
    rider.set(pinX + 1, routeY - 2);
    ink.set(pinX + 1, routeY - 4);

    steelDark.hLine(routeY + 3, SHAFT.x, SHAFT.x + SHAFT.width - 1);
  }

  /**
   * The roof: a small classroom, the plant around it, and the mast.
   *
   * Two silhouettes sitting in a lit box on top of everything else. It is the
   * smallest thing on the building and the reason the building is here.
   */
  private plotRoof(): void {
    const { top, bottom } = ROOF;
    const concrete = this.pixels("concrete");
    const dark = this.pixels("concreteDark");
    const light = this.pixels("concreteLight");
    const steel = this.pixels("steel");
    const steelDark = this.pixels("steelDark");
    const glass = this.pixels("glass");
    const classroom = this.pixels("classroom");
    const beacon = this.pixels("beacon");

    // The deck and its parapet.
    concrete.rect(SHAFT.x - 3, bottom - 3, SHAFT.width + 6, 4);
    light.hLine(bottom - 3, SHAFT.x - 3, SHAFT.x + SHAFT.width + 2);
    dark.hLine(bottom, SHAFT.x - 3, SHAFT.x + SHAFT.width + 2);
    concrete.rect(SHAFT.x - 3, bottom - 7, 2, 5);
    concrete.rect(SHAFT.x + SHAFT.width + 1, bottom - 7, 2, 5);

    // The classroom: a glazed box, warm inside, sitting left of centre so the
    // plant and the mast have the other half of the roof.
    const room = { x: SHAFT.x + 2, y: bottom - 20, width: 24, height: 14 };
    concrete.rect(room.x - 1, room.y + room.height - 1, room.width + 2, 2);
    steel.frame(room.x - 1, room.y - 1, room.width + 2, room.height + 1);
    glass.rect(room.x, room.y, room.width, room.height - 1);
    classroom.rect(room.x, room.y, room.width, room.height - 1);
    for (let x = room.x + 5; x < room.x + room.width; x += 6) {
      steelDark.vLine(x, room.y, room.y + room.height - 2);
    }
    // A flat roof on the box, so it doesn't read as a window in a wall.
    steel.hLine(room.y - 2, room.x - 2, room.x + room.width + 1);

    this.plotFigures(room.x + 5, room.y + room.height - 2);

    // Plant: two air handling units with fans in them.
    for (let i = 0; i < 2; i++) {
      const unit = { x: SHAFT.x + 30 + i * 12, y: bottom - 12, size: 10 };
      concrete.rect(unit.x, unit.y, unit.size, unit.size - 1);
      dark.hLine(unit.y + unit.size - 2, unit.x, unit.x + unit.size - 1);
      light.hLine(unit.y, unit.x, unit.x + unit.size - 1);
      steelDark.frame(unit.x + 1, unit.y + 1, unit.size - 2, unit.size - 3);
      this.plotFan(unit.x + (unit.size >> 1), unit.y + ((unit.size - 1) >> 1));
    }

    // The mast, on the centre line so the tower has a spine, with a beacon on it.
    steel.vLine(CX, MAST.top + 2, top + 6);
    steelDark.vLine(CX + 1, MAST.top + 4, top + 6);
    steel.hLine(MAST.top + 6, CX - 3, CX + 3);
    steel.hLine(MAST.top + 11, CX - 2, CX + 2);
    beacon.set(CX, MAST.top);
    beacon.set(CX, MAST.top + 1);
    beacon.set(CX - 1, MAST.top + 1, 140);
    beacon.set(CX + 1, MAST.top + 1, 140);
  }

  /** Two people sitting together, and shifting every few seconds. */
  private plotFigures(x: number, baseline: number): void {
    for (let f = 0; f < FIGURE_FRAMES; f++) {
      const figures = this.pixels("figures", f);

      for (let i = 0; i < 2; i++) {
        const fx = x + i * 8;
        // One of them leans in on the second frame. That is the whole animation,
        // and at this size it is plenty.
        const lean = f === 1 && i === 1 ? 1 : 0;
        // Head.
        figures.rect(fx + 1 + lean, baseline - 6, 2, 2);
        // Shoulders and back, seated.
        figures.rect(fx + lean, baseline - 4, 4, 3);
        figures.rect(fx - 1 + lean, baseline - 1, 5, 1);
      }
    }
  }

  /** A four-bladed fan, one frame per quarter turn of its own symmetry. */
  private plotFan(cx: number, cy: number): void {
    for (let f = 0; f < FAN_FRAMES; f++) {
      const fan = this.pixels("fan", f);
      const angle = (f / FAN_FRAMES) * (Math.PI / 2);

      fan.set(cx, cy);
      for (let blade = 0; blade < 4; blade++) {
        const a = angle + (blade * Math.PI) / 2;
        for (let r = 1; r <= 3; r++) {
          fan.set(cx + Math.round(Math.cos(a) * r), cy + Math.round(Math.sin(a) * r));
        }
      }
    }
  }

  // --- Shared plotting -------------------------------------------------------

  /** The concrete band between one floor and the next. */
  private plotSlab(x: number, y: number, width: number): void {
    this.pixels("concrete").rect(x, y, width, 3);
    this.pixels("concreteLight").hLine(y, x, x + width - 1);
    this.pixels("concreteDark").hLine(y + 2, x, x + width - 1);
  }

  /**
   * A grid of office windows, dealt into the four switching groups.
   *
   * Which group a window lands in is decided once, here, from a fixed seed — so
   * the building looks the same every time it is loaded and different from
   * itself every few seconds.
   */
  private plotOfficeWindows(x: number, y: number, width: number, height: number): void {
    const steelDark = this.pixels("steelDark");
    const paneW = 4;
    const paneH = 5;
    const gapX = 2;
    const gapY = 3;

    const columns = Math.floor((width + gapX) / (paneW + gapX));
    const rows = Math.floor((height + gapY) / (paneH + gapY));
    if (columns <= 0 || rows <= 0) return;

    const startX = x + Math.floor((width - (columns * (paneW + gapX) - gapX)) / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const px = startX + c * (paneW + gapX);
        const py = y + r * (paneH + gapY);

        steelDark.frame(px - 1, py - 1, paneW + 2, paneH + 2, 120);

        // A few panes are never lit at all — a floor where every single window
        // burns reads as a render, not as a building.
        if (this.rand() < 0.12) continue;

        const group = Math.floor(this.rand() * OFFICE_GROUPS);
        this.pixels(`office${group}`).rect(px, py, paneW, paneH);
      }
    }
  }

  // --- Idle animation --------------------------------------------------------

  /**
   * What moves, and how little of it.
   *
   * Six things, none of them fast: the ticker crawls, pulses cross the bridges,
   * two roof fans turn, the office lights switch in four independent groups, one
   * of the two figures on the roof shifts, and the mast beacon flashes. Anything
   * more and a building whose point is *focus* would read as a fairground
   * (ART_DIRECTION.md §Animation Rules).
   */
  tick(elapsed: number): void {
    if (this.motionScale <= 0) return;

    const ticker = Math.floor(elapsed / TICKER_SECONDS) % TICKER_FRAMES;
    if (ticker !== this.tickerFrame) {
      this.tickerFrame = ticker;
      this.setFrame("ticker", ticker);
    }

    const pulse = Math.floor(elapsed / PULSE_SECONDS) % PULSE_FRAMES;
    if (pulse !== this.pulseFrame) {
      this.pulseFrame = pulse;
      this.setFrame("pulse", pulse);
    }

    const fan = Math.floor(elapsed / FAN_SECONDS) % FAN_FRAMES;
    if (fan !== this.fanFrame) {
      this.fanFrame = fan;
      this.setFrame("fan", fan);
    }

    const figure = Math.floor(elapsed / FIGURE_SECONDS) % FIGURE_FRAMES;
    if (figure !== this.figureFrame) {
      this.figureFrame = figure;
      this.setFrame("figures", figure);
    }

    // Four groups on four unrelated cycles. Nothing here is random at runtime —
    // it is four sine waves that will not line up again for hours.
    for (let g = 0; g < OFFICE_GROUPS; g++) {
      const phase = (elapsed % OFFICE_CYCLES[g]) / OFFICE_CYCLES[g];
      const lit = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5 < OFFICE_DUTY[g];
      this.setEmissiveScale(`office${g}`, lit ? 1 : 0);
    }

    // The neon breathes rather than pulsing — a sign that throbs is a sign that
    // is broken.
    const breath = 1 - NEON_DEPTH * (0.5 + 0.5 * Math.sin(elapsed * NEON_RATE));
    this.setEmissiveScale("neon", breath);

    const into = elapsed % BEACON_PERIOD;
    this.setEmissiveScale("beacon", into < BEACON_FLASH ? 1 : 0.08);
  }
}
