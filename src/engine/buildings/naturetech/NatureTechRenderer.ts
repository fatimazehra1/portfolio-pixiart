import { BuildingRenderer, type LayerMaterial } from "../BuildingRenderer";
import { createRandom } from "../../shared/random";

/**
 * NatureTech Foundry, in pixels.
 *
 * # The only unfinished building on the shore
 * Every other landmark is a chapter that closed. This one is still open, and the
 * whole design follows from that: the bottom two floors are finished and
 * occupied, the top two are bare frame with the sky showing through them, glass
 * panels are stacked on the ground waiting to go in, and there is a crane over
 * it with the hook still hanging.
 *
 * The line between the two halves is horizontal and unmissable — warm windows
 * below it, red-oxide steel above. That single edge is the story: this is where
 * the finished work stops and the work still being done starts.
 *
 * # Alive, not abandoned
 * The difference is entirely in what moves. An abandoned site is still; this one
 * has a crane slewing, a hook swaying, an arc going somewhere on the third
 * floor, floodlights on the unfinished floors and dust drifting through them.
 * It is the busiest building in the world, which is the point — Vaulsys went
 * quiet at night and this one does not.
 *
 * TODO(assets): plotted in code because `public/assets/buildings/` is empty.
 * Authored art replaces `plot()` alone.
 */

// --- Dimensions --------------------------------------------------------------

const W = 180;
const H = 152;

/** The block itself. The crane and the yard stand beside it. */
const BLOCK = { x: 6, width: 110 };

/**
 * Floors, top to bottom.
 *
 * The top two are open frame, the third is half glazed, the bottom two are
 * finished. Read upward it is a building being built; read downward it is a
 * career catching up with itself.
 */
const FRAME_TOP = { top: 34, bottom: 56 };
const FRAME_MID = { top: 57, bottom: 79 };
const F3 = { top: 80, bottom: 102 };
const F2 = { top: 103, bottom: 124 };
const F1 = { top: 125, bottom: 146 };
const APRON = { top: 147, bottom: 151 };

/** Scaffolding, hugging the right-hand face and standing a little proud of it. */
const SCAFFOLD = { x: 106, width: 20, top: 34, bottom: 146 };

/** The tower crane, at the east end of the site. */
const CRANE = {
  mastX: 166,
  mastWidth: 7,
  mastTop: 6,
  jibY: 11,
  jibHeight: 4,
  /** How far left the jib reaches — out over the building. */
  jibReach: 30,
  /** Where the trolley sits along the jib, and how far the hook hangs below. */
  trolleyX: 68,
  hookDrop: 46,
};

/** The yard: a site office and a generator, between the block and the crane. */
const CABIN = { x: 130, y: 126, width: 24, height: 20 };
const GENERATOR = { x: 157, y: 136, width: 10, height: 10 };

// --- Animation ---------------------------------------------------------------

const CRANE_FRAMES = 3;
/** Seconds per slew step. A tower crane moves slowly enough to watch. */
const CRANE_SECONDS = 2.9;

const HOOK_FRAMES = 4;
const HOOK_SECONDS = 0.9;

const DUST_FRAMES = 4;
const DUST_SECONDS = 0.55;

/** Welding: a short burst of arc, then a long wait. */
const WELD_FRAMES = 4;
const WELD_PERIOD = 6.7;
const WELD_BURST = 0.9;
const WELD_FLICKER = 0.055;

/** Two groups of finished offices, and a lot of unfinished dark. */
const OFFICE_GROUPS = 2;
const OFFICE_CYCLES = [0, 29.3];
const OFFICE_DUTY = [1, 0.55];

const MONITOR_RATE = 0.44;
const MONITOR_DEPTH = 0.4;

const CRANE_LIGHT_PERIOD = 2.2;
const CRANE_LIGHT_FLASH = 0.3;

/** Floodlights breathe very slightly, the way a real work lamp does. */
const FLOOD_RATE = 1.3;
const FLOOD_DEPTH = 0.07;

// --- Materials ---------------------------------------------------------------

/**
 * Two palettes on one building: what is finished and what is not.
 *
 * The finished half is clad in a soft green-grey — this is a company whose name
 * is half nature — and the unfinished half is red-oxide primer and raw concrete.
 * Primer is the single most legible "not done yet" colour there is, and it is
 * warm, so the building reads as active rather than derelict.
 */
const MATERIALS: Record<string, LayerMaterial> = {
  /** Finished cladding. */
  clad: { color: 0x9aaa9c },
  cladLight: { color: 0xb6c4b6 },
  cladDark: { color: 0x6e7c70 },

  /** Structure: raw concrete slabs and cores. */
  concrete: { color: 0xa09c94 },
  concreteLight: { color: 0xbdb9b0 },
  concreteDark: { color: 0x73706a },

  /** Exposed steel, still in primer. */
  steelRaw: { color: 0xa8624a },
  steelRawLight: { color: 0xc27d63 },
  steelRawDark: { color: 0x7a4433 },

  /** Finished steel, scaffolding tube and site metalwork. */
  steel: { color: 0x8d949b },
  steelLight: { color: 0xa9b0b6 },
  steelDark: { color: 0x606770 },

  glass: { color: 0x6f8a9c },
  glassSky: { color: 0x8fa8b8 },

  /** Debris netting over the scaffold. */
  mesh: { color: 0x6f8f5a },

  /** Site kit: hoarding, barriers, cones, timber, the cabin, the generator. */
  hoarding: { color: 0x8a8f95 },
  barrier: { color: 0xb3afa5 },
  cone: { color: 0xd97a3f },
  coneLight: { color: 0xefa06a },
  timber: { color: 0x9a7850 },
  timberDark: { color: 0x6e5537 },
  cabin: { color: 0x7f8c94 },
  cabinDark: { color: 0x5a666e },

  /** The crane. Construction yellow, which belongs to nobody. */
  crane: { color: 0xd9a83f },
  craneLight: { color: 0xefc563 },
  craneDark: { color: 0x9c7726 },

  /** Finished offices, already occupied. */
  office0: { color: 0xf3dda8, emissive: true, dayAlpha: 0.05, nightAlpha: 1 },
  office1: { color: 0xf3dda8, emissive: true, dayAlpha: 0.05, nightAlpha: 1 },
  monitor: { color: 0x9fd4e8, emissive: true, dayAlpha: 0.05, nightAlpha: 1 },
  figures: { color: 0x33302b },

  /** Work lamps on the unfinished floors, and the pools they throw. */
  flood: { color: 0xfff2d0, emissive: true, dayAlpha: 0.08, nightAlpha: 1 },
  /** The arc itself. Blue-white, and far brighter than anything else here. */
  weld: { color: 0xdff2ff, emissive: true, dayAlpha: 0.75, nightAlpha: 1 },
  /** Dust hanging in the light. */
  dust: { color: 0xe8dcc4, emissive: true, dayAlpha: 0.12, nightAlpha: 0.5 },
  warning: { color: 0xff6b5a, emissive: true, dayAlpha: 0.35, nightAlpha: 1 },
};

const ORDER = [
  "concrete",
  "concreteLight",
  "concreteDark",
  // The wall goes on before the openings are cut in it. Glass drawn *under* the
  // cladding is glass nobody can see.
  "clad",
  "cladLight",
  "cladDark",
  "glass",
  "glassSky",
  "office0",
  "office1",
  "monitor",
  "figures",
  "steelRaw",
  "steelRawLight",
  "steelRawDark",
  "flood",
  "weld",
  "steel",
  "steelLight",
  "steelDark",
  "mesh",
  "hoarding",
  "barrier",
  "timber",
  "timberDark",
  "cabin",
  "cabinDark",
  "cone",
  "coneLight",
  "crane",
  "craneLight",
  "craneDark",
  "hook",
  "dust",
  "warning",
];

export class NatureTechRenderer extends BuildingRenderer {
  private readonly rand = createRandom(0x4e17);

  private craneFrame = -1;
  private hookFrame = -1;
  private dustFrame = -1;
  private weldFrame = -1;

  constructor(private readonly motionScale = 1) {
    super(W, H);
  }

  protected get order(): readonly string[] {
    return ORDER;
  }

  protected get materials(): Record<string, LayerMaterial> {
    return { ...MATERIALS, hook: { color: 0x8d949b } };
  }

  /** Above the crane, which is the tallest thing on the site. */
  override get promptTop(): number {
    return H + 2;
  }

  // --- Plotting --------------------------------------------------------------

  protected plot(): void {
    this.plotApron();
    this.plotFinishedFloors();
    this.plotTransitionFloor();
    this.plotUnfinishedFloors();
    this.plotScaffold();
    this.plotYard();
    this.plotCrane();
    this.plotDust();

    /**
     * Three, reading the building the way it was drawn: finished at the
     * bottom, being built at the top.
     *
     * The two finished floors are the ledger — accounting, the part that has to
     * be right before anything else can be. The half-glazed third is
     * operations, the floor the work moves through. The open frame above is the
     * platform: permissions, migrations, the parts still going in. The crane
     * and the yard are scenery and stay unmarked.
     */
    this.setHotspots([
      {
        id: "accounting",
        section: "Accounting",
        label: "Accounting and banking",
        x: BLOCK.x,
        y: F2.top,
        width: BLOCK.width,
        height: F1.bottom - F2.top + 1,
      },
      {
        id: "operations",
        section: "Operations",
        label: "Inventory, purchasing, sales",
        x: BLOCK.x,
        y: F3.top,
        width: BLOCK.width,
        height: F3.bottom - F3.top + 1,
      },
      {
        id: "platform",
        section: "Platform",
        label: "Permissions and versions",
        x: BLOCK.x,
        y: FRAME_TOP.top,
        width: BLOCK.width,
        height: FRAME_MID.bottom - FRAME_TOP.top + 1,
      },
    ]);
  }

  /**
   * The site: hoarding, barriers, cones, stacked material and the glass waiting
   * to go in.
   *
   * A working site is *organised clutter* — everything is somewhere on purpose,
   * stacked and squared, because it is all going to be used tomorrow. That is
   * the difference between this and a ruin.
   */
  private plotApron(): void {
    const concrete = this.pixels("concrete");
    const light = this.pixels("concreteLight");
    const dark = this.pixels("concreteDark");
    const hoarding = this.pixels("hoarding");
    const barrier = this.pixels("barrier");
    const cone = this.pixels("cone");
    const coneLight = this.pixels("coneLight");
    const timber = this.pixels("timber");
    const timberDark = this.pixels("timberDark");
    const steel = this.pixels("steel");
    const steelDark = this.pixels("steelDark");
    const glass = this.pixels("glass");
    const glassSky = this.pixels("glassSky");

    concrete.rect(0, APRON.top, W, APRON.bottom - APRON.top + 1);
    light.hLine(APRON.top, 0, W - 1);
    dark.hLine(APRON.bottom, 0, W - 1);

    // Jersey barriers along the front of the working half.
    for (let x = 118; x < W - 6; x += 14) {
      barrier.rect(x, APRON.top - 4, 12, 4);
      dark.hLine(APRON.top - 1, x, x + 11);
      light.hLine(APRON.top - 4, x, x + 11);
      steelDark.vLine(x + 11, APRON.top - 4, APRON.top - 1, 120);
    }

    // Mesh hoarding across the front of the unfinished end.
    for (let x = 120; x < W - 2; x += 4) hoarding.vLine(x, APRON.top - 11, APRON.top - 5);
    hoarding.hLine(APRON.top - 11, 120, W - 3);
    hoarding.hLine(APRON.top - 5, 120, W - 3);

    // Cones, in a line where the site meets the road.
    for (const x of [110, 122, 134, 146, 158]) {
      cone.set(x, APRON.top - 1);
      cone.rect(x - 1, APRON.top, 3, 1);
      coneLight.set(x, APRON.top - 2);
    }

    // Stacked timber pallets, squared up.
    for (let i = 0; i < 3; i++) {
      const y = APRON.top - 3 - i * 3;
      timber.rect(70, y, 16, 2);
      timberDark.hLine(y + 2, 70, 85);
      for (let x = 71; x < 86; x += 4) timberDark.vLine(x, y, y + 1, 130);
    }

    // Steel pipe, bundled and racked.
    for (let i = 0; i < 3; i++) {
      steel.rect(92, APRON.top - 2 - i * 2, 14, 1);
      steelDark.hLine(APRON.top - 1 - i * 2, 92, 105, 120);
    }

    // Glass panels waiting to be installed, leaning against the hoarding. The
    // most literal object on the site: the building's own skin, not yet on it.
    for (let i = 0; i < 3; i++) {
      const x = 42 + i * 8;
      for (let dy = 0; dy < 14; dy++) {
        const lean = Math.round(dy * 0.25);
        glass.set(x + lean, APRON.top - 1 - dy);
        glass.set(x + lean + 1, APRON.top - 1 - dy);
      }
      glassSky.set(x + 3, APRON.top - 14);
      steelDark.set(x, APRON.top - 1);
    }
  }

  /**
   * The finished half: two floors of clad wall and warm, occupied offices.
   *
   * Ordinary and complete, so the frame above it has something to be unfinished
   * *against*.
   */
  private plotFinishedFloors(): void {
    const clad = this.pixels("clad");
    const light = this.pixels("cladLight");
    const dark = this.pixels("cladDark");
    const concrete = this.pixels("concrete");
    const concreteLight = this.pixels("concreteLight");
    const concreteDark = this.pixels("concreteDark");

    // The base, from the ground to the top of the finished cladding.
    clad.rect(BLOCK.x, F2.top, BLOCK.width, F1.bottom - F2.top + 1);
    light.vLine(BLOCK.x, F2.top, F1.bottom);
    light.vLine(BLOCK.x + 1, F2.top, F1.bottom, 140);
    dark.vLine(BLOCK.x + BLOCK.width - 1, F2.top, F1.bottom);

    // Slab edges between the floors, left raw.
    for (const band of [F2, F1]) {
      concrete.rect(BLOCK.x - 1, band.top - 2, BLOCK.width + 2, 3);
      concreteLight.hLine(band.top - 2, BLOCK.x - 1, BLOCK.x + BLOCK.width);
      concreteDark.hLine(band.top, BLOCK.x - 1, BLOCK.x + BLOCK.width);
    }

    this.plotOfficeRow(F2, true);
    this.plotOfficeRow(F1, false);

    // The entrance: a glazed bay under a concrete canopy, on the finished end.
    const doorX = BLOCK.x + 14;
    this.pixels("glass").rect(doorX, F1.top + 6, 20, F1.bottom - F1.top - 6);
    this.pixels("steelDark").frame(doorX - 1, F1.top + 5, 22, F1.bottom - F1.top - 4);
    this.pixels("steelDark").vLine(doorX + 10, F1.top + 6, F1.bottom - 1);
    concrete.rect(doorX - 4, F1.top + 2, 28, 3);
    concreteDark.hLine(F1.top + 4, doorX - 4, doorX + 23);

    // The glazed bay is the door.
    this.setDoorway({
      x: doorX,
      y: F1.top + 6,
      width: 20,
      height: F1.bottom - F1.top - 6,
      swing: "double",
      interior: 0x1d2622,
      glow: 0xffe6b4,
    });
  }

  /** A row of windows in the finished cladding. */
  private plotOfficeRow(band: { top: number; bottom: number }, upper: boolean): void {
    const glass = this.pixels("glass");
    const sky = this.pixels("glassSky");
    const dark = this.pixels("cladDark");
    const figures = this.pixels("figures");
    const monitor = this.pixels("monitor");

    const windowWidth = 7;
    const windowHeight = band.bottom - band.top - 8;
    const pitch = 12;
    const start = BLOCK.x + 6;
    const count = Math.floor((BLOCK.width - 12) / pitch);
    const top = band.top + 4;

    for (let i = 0; i < count; i++) {
      const x = start + i * pitch;
      // The ground floor's middle is the entrance.
      if (!upper && x > BLOCK.x + 8 && x < BLOCK.x + 40) continue;

      glass.rect(x, top, windowWidth, windowHeight);
      sky.rect(x, top, windowWidth, 2);
      dark.vLine(x - 1, top - 1, top + windowHeight);
      dark.hLine(top - 1, x - 1, x + windowWidth);

      // The finished floors are largely occupied — this end of the building is
      // already working, which is what makes the frame above it read as *next*
      // rather than as ruin.
      if (this.rand() < 0.28) continue;

      const group = Math.floor(this.rand() * OFFICE_GROUPS);
      this.pixels(`office${group}`).rect(x, top, windowWidth, windowHeight);

      if (this.rand() < 0.22) {
        const base = top + windowHeight - 1;
        figures.rect(x + 2, base - 5, 2, 2);
        figures.rect(x + 1, base - 3, 4, 4);
      } else if (this.rand() < 0.3) {
        monitor.rect(x + 1, top + 2, windowWidth - 2, 3);
      }
    }
  }

  /**
   * The floor being finished right now.
   *
   * The seam of the whole building, and the only storey where both halves of it
   * are true at once: cladding and glazed offices at the west end, running out
   * partway across into bare frame and a work lamp at the east. The join is
   * ragged on purpose — it stops exactly where the fixers got to.
   */
  private plotTransitionFloor(): void {
    const clad = this.pixels("clad");
    const cladLight = this.pixels("cladLight");
    const cladDark = this.pixels("cladDark");
    const concrete = this.pixels("concrete");
    const concreteLight = this.pixels("concreteLight");
    const concreteDark = this.pixels("concreteDark");
    const raw = this.pixels("steelRaw");
    const rawLight = this.pixels("steelRawLight");
    const rawDark = this.pixels("steelRawDark");
    const glass = this.pixels("glass");
    const flood = this.pixels("flood");

    // The slab under it, and the one it hangs from.
    for (const y of [F3.top - 2, F3.bottom - 2]) {
      concrete.rect(BLOCK.x - 1, y, BLOCK.width + 2, 3);
      concreteLight.hLine(y, BLOCK.x - 1, BLOCK.x + BLOCK.width);
      concreteDark.hLine(y + 2, BLOCK.x - 1, BLOCK.x + BLOCK.width);
    }

    // How far along the cladding has got.
    const finishedTo = BLOCK.x + 62;

    clad.rect(BLOCK.x, F3.top + 1, finishedTo - BLOCK.x, F3.bottom - F3.top - 3);
    cladLight.vLine(BLOCK.x, F3.top + 1, F3.bottom - 3);
    // The open edge of the cladding, mid-run.
    cladDark.vLine(finishedTo - 1, F3.top + 1, F3.bottom - 3);

    // Glazed bays in the finished stretch.
    for (let x = BLOCK.x + 6; x < finishedTo - 10; x += 12) {
      glass.rect(x, F3.top + 5, 7, F3.bottom - F3.top - 11);
      cladDark.hLine(F3.top + 4, x - 1, x + 7);
      const group = Math.floor(this.rand() * OFFICE_GROUPS);
      if (this.rand() < 0.7) {
        this.pixels(`office${group}`).rect(x, F3.top + 5, 7, F3.bottom - F3.top - 11);
      }
    }

    // Bare frame from there to the east end.
    for (let x = finishedTo + 2; x < BLOCK.x + BLOCK.width - 2; x += 14) {
      raw.rect(x, F3.top + 1, 3, F3.bottom - F3.top - 3);
      rawLight.vLine(x, F3.top + 1, F3.bottom - 3);
      rawDark.vLine(x + 2, F3.top + 1, F3.bottom - 3);
    }
    raw.rect(finishedTo, F3.top + 1, BLOCK.x + BLOCK.width - finishedTo, 2);

    // One lamp on the open stretch, so the seam is lit from the working side.
    const lampX = finishedTo + 20;
    this.pixels("steelDark").vLine(lampX, F3.top + 3, F3.top + 5);
    flood.rect(lampX - 1, F3.top + 5, 3, 2);
    for (let i = 0; i < 7; i++) {
      flood.hLine(F3.top + 7 + i, lampX - 2 - i, lampX + 2 + i, Math.round(100 * (1 - i / 7)));
    }
  }

  /**
   * The unfinished half: two floors of bare frame with the sky showing through.
   *
   * Nothing is drawn between the columns except the slab you can see the
   * underside of. Leaving actual holes in the silhouette is the only honest way
   * to draw an unfinished building — a dark fill would just look like tinted
   * glass, and the whole point is that there is nothing there yet.
   */
  private plotUnfinishedFloors(): void {
    const raw = this.pixels("steelRaw");
    const rawLight = this.pixels("steelRawLight");
    const rawDark = this.pixels("steelRawDark");
    const concrete = this.pixels("concrete");
    const concreteLight = this.pixels("concreteLight");
    const concreteDark = this.pixels("concreteDark");
    const glass = this.pixels("glass");
    const glassSky = this.pixels("glassSky");
    const flood = this.pixels("flood");

    for (const band of [FRAME_TOP, FRAME_MID]) {
      // The floor slab: the one solid thing on these storeys.
      concrete.rect(BLOCK.x - 1, band.bottom - 2, BLOCK.width + 2, 3);
      concreteLight.hLine(band.bottom - 2, BLOCK.x - 1, BLOCK.x + BLOCK.width);
      concreteDark.hLine(band.bottom, BLOCK.x - 1, BLOCK.x + BLOCK.width);

      // Columns on a regular grid, in primer.
      for (let x = BLOCK.x + 2; x < BLOCK.x + BLOCK.width - 2; x += 14) {
        raw.rect(x, band.top, 3, band.bottom - band.top - 2);
        rawLight.vLine(x, band.top, band.bottom - 3);
        rawDark.vLine(x + 2, band.top, band.bottom - 3);
      }

      // A beam across the heads of the columns, and cross-bracing in two bays.
      raw.rect(BLOCK.x, band.top, BLOCK.width, 2);
      rawDark.hLine(band.top + 1, BLOCK.x, BLOCK.x + BLOCK.width - 1);

      for (const bay of [1, 4]) {
        const x0 = BLOCK.x + 2 + bay * 14;
        const x1 = x0 + 14;
        const steps = band.bottom - band.top - 4;
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          raw.set(Math.round(x0 + t * (x1 - x0)), band.top + 2 + i, 200);
          raw.set(Math.round(x1 - t * (x1 - x0)), band.top + 2 + i, 200);
        }
      }
    }

    // The middle frame floor has had some of its glass hung already — the join
    // between the two halves, mid-installation.
    for (let i = 0; i < 3; i++) {
      const x = BLOCK.x + 4 + i * 14;
      glass.rect(x, FRAME_MID.top + 3, 11, FRAME_MID.bottom - FRAME_MID.top - 7);
      glassSky.rect(x, FRAME_MID.top + 3, 11, 2);
    }

    // Work lamps clamped to the columns, and the pools they throw across the
    // slabs. This is what makes an unfinished floor read as *staffed*.
    for (const band of [FRAME_TOP, FRAME_MID]) {
      for (const x of [BLOCK.x + 18, BLOCK.x + 60, BLOCK.x + 92]) {
        this.pixels("steelDark").vLine(x, band.top + 2, band.top + 4);
        flood.rect(x - 1, band.top + 4, 3, 2);
        // The cone of light on the slab below it.
        for (let i = 0; i < 8; i++) {
          const spread = 2 + i;
          flood.hLine(
            band.top + 6 + i,
            x - spread,
            x + spread,
            Math.round(110 * (1 - i / 8))
          );
        }
        flood.hLine(band.bottom - 3, x - 9, x + 9, 90);
      }
    }

    this.plotWelding();
  }

  /**
   * The arc.
   *
   * One worker, on the middle frame floor, and four frames of spatter. It fires
   * for under a second every seven, which is roughly the rhythm of someone
   * actually running a bead — long enough to catch your eye, rare enough that
   * you are never waiting for it.
   */
  private plotWelding(): void {
    const wx = BLOCK.x + 74;
    const wy = FRAME_MID.bottom - 6;

    // The welder, in silhouette, crouched over the work.
    const figures = this.pixels("figures");
    figures.rect(wx + 2, wy - 5, 3, 3);
    figures.rect(wx + 1, wy - 2, 5, 3);

    for (let f = 0; f < WELD_FRAMES; f++) {
      const weld = this.pixels("weld", f);

      // The arc itself, at the tip.
      weld.set(wx, wy);
      weld.set(wx - 1, wy, 180);
      weld.set(wx, wy - 1, 180);

      // Spatter, thrown further on later frames.
      const reach = 2 + f * 2;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI + Math.PI * 0.55 + f * 0.3;
        const r = 1 + ((i + f) % reach);
        weld.set(
          wx + Math.round(Math.cos(a) * r),
          wy + Math.round(Math.abs(Math.sin(a)) * r * 0.7),
          160 - i * 20
        );
      }
      // The glow it throws on the slab under it.
      weld.hLine(wy + 3, wx - 5, wx + 5, 70);
    }
  }

  /**
   * Scaffolding up the working face, with debris netting over it.
   *
   * Standards, ledgers and boards on a strict grid — scaffolding is the most
   * regular thing on any site, and drawing it loosely is what would make the
   * building look damaged instead of in progress.
   */
  private plotScaffold(): void {
    const steel = this.pixels("steel");
    const steelLight = this.pixels("steelLight");
    const steelDark = this.pixels("steelDark");
    const timber = this.pixels("timber");
    const mesh = this.pixels("mesh");

    // Standards: the verticals.
    for (let i = 0; i < 3; i++) {
      const x = SCAFFOLD.x + i * 9;
      steel.vLine(x, SCAFFOLD.top, SCAFFOLD.bottom);
      steelLight.vLine(x, SCAFFOLD.top, SCAFFOLD.top + 20, 140);
    }

    // Lifts: ledgers and boarded platforms, every twelve pixels.
    for (let y = SCAFFOLD.top + 6; y < SCAFFOLD.bottom; y += 12) {
      steel.hLine(y, SCAFFOLD.x, SCAFFOLD.x + SCAFFOLD.width - 2);
      timber.hLine(y - 1, SCAFFOLD.x + 1, SCAFFOLD.x + SCAFFOLD.width - 3);
      steelDark.hLine(y + 1, SCAFFOLD.x, SCAFFOLD.x + SCAFFOLD.width - 2, 130);
      // A diagonal brace every other lift.
      if (((y - SCAFFOLD.top) / 12) % 2 === 0) {
        for (let i = 0; i < 12; i++) {
          steel.set(SCAFFOLD.x + Math.round((i / 12) * 18), y + i, 150);
        }
      }
    }

    // Debris netting, hung over the outer face and slightly translucent.
    for (let y = SCAFFOLD.top; y <= SCAFFOLD.bottom; y++) {
      for (let x = SCAFFOLD.x; x < SCAFFOLD.x + SCAFFOLD.width; x++) {
        // A woven pattern rather than a flat wash, so it reads as netting.
        if ((x + y) % 2 === 0) mesh.set(x, y, 70);
      }
    }
  }

  /** The yard: a site office with its light on, and a generator running. */
  private plotYard(): void {
    const cabin = this.pixels("cabin");
    const cabinDark = this.pixels("cabinDark");
    const steel = this.pixels("steel");
    const steelDark = this.pixels("steelDark");
    const glass = this.pixels("glass");
    const office = this.pixels("office0");

    // The cabin: a stacked portacabin on blocks.
    cabin.rect(CABIN.x, CABIN.y, CABIN.width, CABIN.height);
    this.pixels("cabinDark").hLine(CABIN.y + CABIN.height - 1, CABIN.x, CABIN.x + CABIN.width - 1);
    steel.hLine(CABIN.y, CABIN.x - 1, CABIN.x + CABIN.width);
    for (let y = CABIN.y + 3; y < CABIN.y + CABIN.height - 2; y += 4) {
      cabinDark.hLine(y, CABIN.x, CABIN.x + CABIN.width - 1, 110);
    }
    // Its window, lit — somebody is doing paperwork.
    glass.rect(CABIN.x + 3, CABIN.y + 4, 8, 6);
    office.rect(CABIN.x + 3, CABIN.y + 4, 8, 6);
    steelDark.frame(CABIN.x + 2, CABIN.y + 3, 10, 8);
    // The door.
    cabinDark.rect(CABIN.x + 15, CABIN.y + 6, 6, CABIN.height - 7);

    // The generator, with its exhaust and a cable run to the cabin.
    steel.rect(GENERATOR.x, GENERATOR.y, GENERATOR.width, GENERATOR.height);
    steelDark.hLine(GENERATOR.y + GENERATOR.height - 1, GENERATOR.x, GENERATOR.x + GENERATOR.width - 1);
    for (let y = GENERATOR.y + 2; y < GENERATOR.y + GENERATOR.height - 2; y += 2) {
      steelDark.hLine(y, GENERATOR.x + 1, GENERATOR.x + GENERATOR.width - 2, 140);
    }
    steelDark.vLine(GENERATOR.x + 2, GENERATOR.y - 3, GENERATOR.y - 1);
    steelDark.hLine(GENERATOR.y + GENERATOR.height - 1, CABIN.x + CABIN.width, GENERATOR.x, 120);
  }

  /**
   * The tower crane.
   *
   * Mast, jib, counter-jib, trolley and hook. The jib is baked at three slightly
   * different angles and cycled every few seconds, which reads as a slow slew;
   * the hook block swings on its own slower cycle underneath. Neither is fast —
   * a crane that whipped round would turn the site into a fairground.
   */
  private plotCrane(): void {
    const steel = this.pixels("steel");
    const steelDark = this.pixels("steelDark");
    const warning = this.pixels("warning");

    const { mastX, mastWidth, mastTop, jibY, jibHeight } = CRANE;

    // The mast: a lattice, not a pole.
    for (const x of [mastX, mastX + mastWidth - 1]) {
      this.pixels("crane").vLine(x, mastTop, APRON.top - 1);
    }
    this.pixels("craneLight").vLine(mastX, mastTop, APRON.top - 1, 150);
    this.pixels("craneDark").vLine(mastX + mastWidth - 1, mastTop, APRON.top - 1, 150);
    for (let y = mastTop + 4; y < APRON.top - 2; y += 6) {
      this.pixels("crane").hLine(y, mastX, mastX + mastWidth - 1, 190);
      for (let i = 0; i < 6; i++) {
        this.pixels("crane").set(mastX + Math.round((i / 6) * (mastWidth - 1)), y + i, 150);
      }
    }
    // Its base, cast into a concrete pad.
    this.pixels("concrete").rect(mastX - 3, APRON.top - 3, mastWidth + 6, 3);
    this.pixels("concreteDark").hLine(APRON.top - 1, mastX - 3, mastX + mastWidth + 2);

    // The cab, at the head of the mast.
    steel.rect(mastX - 5, jibY + jibHeight, 5, 5);
    this.pixels("glass").rect(mastX - 4, jibY + jibHeight + 1, 3, 3);
    steelDark.hLine(jibY + jibHeight + 4, mastX - 5, mastX - 1);

    // The jib, at three angles. A tower crane slews in plan, so from the side
    // what you actually see is the jib shortening and lifting a little as it
    // comes round — which is what these three frames do.
    for (let f = 0; f < CRANE_FRAMES; f++) {
      const jib = this.pixels("crane", f);
      const jibDark = this.pixels("craneDark", f);
      const lift = f - 1;
      const reach = CRANE.jibReach + f * 6;

      for (let x = reach; x < mastX; x++) {
        const t = (mastX - x) / (mastX - reach);
        const y = jibY + Math.round(lift * t * 2);
        jib.hLine(y, x, x, 255);
        jib.set(x, y + jibHeight - 1, 210);
        // The lattice between the chords.
        if (x % 5 === 0) jibDark.vLine(x, y, y + jibHeight - 1, 170);
      }

      // Counter-jib and its ballast.
      jib.rect(mastX + mastWidth, jibY + 1, 9, 2);
      jibDark.rect(mastX + mastWidth + 5, jibY, 5, 5);
    }

    // The hook block, swinging under the trolley on its own cycle.
    for (let f = 0; f < HOOK_FRAMES; f++) {
      const hook = this.pixels("hook", f);
      // A pendulum: furthest out at the ends of its travel, quickest through
      // the middle. Whole pixels only.
      const swing = Math.round(Math.sin((f / HOOK_FRAMES) * Math.PI * 2) * 2);
      const x = CRANE.trolleyX + swing;

      hook.rect(CRANE.trolleyX - 2, jibY + jibHeight, 5, 2);
      for (let i = 0; i < CRANE.hookDrop; i++) {
        const t = i / CRANE.hookDrop;
        hook.set(Math.round(CRANE.trolleyX + swing * t), jibY + jibHeight + 2 + i, 200);
      }
      const hy = jibY + jibHeight + 2 + CRANE.hookDrop;
      hook.rect(x - 2, hy, 5, 3);
      hook.set(x, hy + 3);
      hook.set(x - 1, hy + 4);
      hook.set(x, hy + 5);
    }

    // The warning light at the very top.
    warning.set(mastX + 3, mastTop - 1);
    warning.set(mastX + 2, mastTop, 150);
    warning.set(mastX + 4, mastTop, 150);
  }

  /**
   * Dust drifting through the site.
   *
   * A handful of motes on four frames, hanging in the light rather than falling
   * through it. Barely visible by day and just there at night, which is what
   * dust in a floodlight actually looks like.
   */
  private plotDust(): void {
    const seeds = createRandom(0x0d05);
    const motes: { x: number; y: number; drift: number }[] = [];
    for (let i = 0; i < 14; i++) {
      motes.push({
        x: 10 + seeds() * (W - 30),
        y: FRAME_MID.top + seeds() * (APRON.top - FRAME_MID.top),
        drift: 0.6 + seeds() * 1.4,
      });
    }

    for (let f = 0; f < DUST_FRAMES; f++) {
      const dust = this.pixels("dust", f);
      for (const mote of motes) {
        const t = f / DUST_FRAMES;
        dust.set(
          Math.round(mote.x + t * mote.drift * 4),
          Math.round(mote.y - t * mote.drift * 2),
          150
        );
      }
    }
  }

  // --- Idle animation --------------------------------------------------------

  /**
   * The busiest building on the shore, and every bit of it slow.
   *
   * A crane slewing every three seconds, a hook swinging under it, dust
   * drifting, an arc that fires for under a second every seven, two groups of
   * office lights, a monitor and a warning lamp. Nothing here is fast — what
   * makes it read as *work* is that several unhurried things are happening at
   * once, which is exactly what a site looks like from the road.
   */
  tick(elapsed: number): void {
    if (this.motionScale <= 0) return;

    const crane = Math.floor(elapsed / CRANE_SECONDS) % CRANE_FRAMES;
    if (crane !== this.craneFrame) {
      this.craneFrame = crane;
      this.setFrame("crane", crane);
      this.setFrame("craneDark", crane);
    }

    const hook = Math.floor(elapsed / HOOK_SECONDS) % HOOK_FRAMES;
    if (hook !== this.hookFrame) {
      this.hookFrame = hook;
      this.setFrame("hook", hook);
    }

    const dust = Math.floor(elapsed / DUST_SECONDS) % DUST_FRAMES;
    if (dust !== this.dustFrame) {
      this.dustFrame = dust;
      this.setFrame("dust", dust);
    }

    // Welding: dark most of the time, then a short burst of flickering arc.
    const into = elapsed % WELD_PERIOD;
    if (into < WELD_BURST) {
      const frame = Math.floor(into / WELD_FLICKER) % WELD_FRAMES;
      if (frame !== this.weldFrame) {
        this.weldFrame = frame;
        this.setFrame("weld", frame);
      }
      // The arc stutters rather than holding steady.
      this.setEmissiveScale("weld", frame % 2 === 0 ? 1 : 0.55);
    } else {
      this.setEmissiveScale("weld", 0);
    }

    for (let g = 0; g < OFFICE_GROUPS; g++) {
      const cycle = OFFICE_CYCLES[g];
      if (cycle <= 0) continue;
      const phase = (elapsed % cycle) / cycle;
      const lit = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5 < OFFICE_DUTY[g];
      this.setEmissiveScale(`office${g}`, lit ? 1 : 0);
    }

    this.setEmissiveScale(
      "monitor",
      1 - MONITOR_DEPTH * (0.5 + 0.5 * Math.sin(elapsed * MONITOR_RATE))
    );

    // Work lamps are mains-fed off a generator, so they waver very slightly.
    this.setEmissiveScale("flood", 1 - FLOOD_DEPTH * (0.5 + 0.5 * Math.sin(elapsed * FLOOD_RATE)));

    const warn = elapsed % CRANE_LIGHT_PERIOD;
    this.setEmissiveScale("warning", warn < CRANE_LIGHT_FLASH ? 1 : 0.1);
  }
}
