import { BuildingRenderer, Pixels, type LayerMaterial } from "../BuildingRenderer";
import { createRandom } from "../../shared/random";

/**
 * Vaultsys Financial Center, in pixels.
 *
 * # How it argues with Planet01
 * Everything here is the opposite decision, on purpose. Planet01 is tall,
 * asymmetric, glazed wall to wall and busy with six moving things; this is
 * broad, rigorously symmetrical, built of *mass* with windows punched into it,
 * and only four things on it move. A curtain wall says "we are new and we are
 * growing". A stone base, deep banding, a heavy cornice and a colonnade of
 * pilasters say "your money is safe here", which is the only thing a bank has
 * ever tried to say with a facade.
 *
 * The symmetry is load-bearing. Nothing on this building is off-centre, and the
 * one moment of ornament — the vault disc over the doors — sits exactly on the
 * axis. That discipline is what makes it feel calm next to its neighbour.
 *
 * # What the chapter is, without a single logo
 * Java, Oracle, payments, KYC, deployments, production. None of that can be
 * drawn, and putting a logo on a wall would be both a lie and a trademark. What
 * *can* be drawn is the shape of the place that work happens in: a server room
 * behind armoured glass with its lights still blinking, a few windows warm at an
 * hour when the rest are dark, someone still sitting at one of them, and the
 * whole thing lit blue and quiet from below.
 *
 * TODO(assets): plotted in code because `public/assets/buildings/` is empty.
 * Authored art replaces `plot()` alone.
 */

// --- Dimensions --------------------------------------------------------------

const W = 156;
const H = 88;
const CX = 78;

/** Horizontal bands, top to bottom. Deep and heavy, never thin. */
const ROOF = { top: 0, bottom: 11 };
const PARAPET = { top: 12, bottom: 16 };
const CORNICE = { top: 17, bottom: 19 };
const F3 = { top: 20, bottom: 37 };
const BAND_A = { top: 38, bottom: 41 };
const F2 = { top: 42, bottom: 59 };
const BAND_B = { top: 60, bottom: 63 };
const GROUND = { top: 64, bottom: 81 };
const PLINTH = { top: 82, bottom: 84 };
const APRON = { top: 85, bottom: 87 };

const BLOCK = { x: 6, width: 144 };
/** The entrance pavilion, projecting from the facade and dead on the axis. */
const ENTRANCE = { x: 62, width: 32 };

/** The vault disc: the building's one ornament. */
const VAULT = { cx: CX, cy: 50, radius: 9 };

/** The server room, behind armoured glass on the left wing. */
const SERVER = { x: 20, y: 70, width: 20, height: 8 };
/** Its mirror on the right: a plant intake, so the facade stays symmetrical. */
const VENT = { x: W - 20 - SERVER.width, y: SERVER.y, width: SERVER.width, height: SERVER.height };

// --- Animation ---------------------------------------------------------------

/** Server LEDs: the one lively thing on a deliberately still building. */
const LED_FRAMES = 6;
const LED_SECONDS = 0.19;

/**
 * Office lights.
 *
 * Three groups against Planet01's four, on cycles twice as long. Fewer windows
 * change, and they change more slowly — the difference between a floor still
 * working and a floor still awake.
 */
const OFFICE_GROUPS = 3;
/**
 * Seconds per cycle, or 0 for a group that never switches at all.
 *
 * The first group is deliberately permanent. Three slow groups left to
 * themselves will eventually all be off at the same moment, and a bank
 * headquarters with every single window dark reads as abandoned rather than as
 * quiet — there is always one floor that never turns its lights off.
 */
const OFFICE_CYCLES = [0, 51.3, 67.1];
const OFFICE_DUTY = [1, 0.46, 0.4];

/** A monitor somewhere behind the glass, changing what it is showing. */
const MONITOR_RATE = 0.31;
const MONITOR_DEPTH = 0.45;

/** The mast light. Slow, dim, and never insistent. */
const BEACON_PERIOD = 4.4;
const BEACON_FLASH = 0.5;

// --- Materials ---------------------------------------------------------------

/**
 * Concrete, stone, steel and dark glass.
 *
 * The palette of a building that wants to look like it was expensive and will
 * still be here in forty years. Nothing warm in the structure at all — every
 * warm thing on this facade is a person working late.
 */
const MATERIALS: Record<string, LayerMaterial> = {
  concrete: { color: 0xa8a49b },
  concreteLight: { color: 0xc4c0b6 },
  concreteDark: { color: 0x767369 },

  /** The base and the plinth: darker, heavier stone. */
  stone: { color: 0x8a877f },
  stoneLight: { color: 0xa4a199 },
  stoneDark: { color: 0x5f5d57 },

  /** Dark glass, as asked. A bank does not want you seeing in. */
  glass: { color: 0x3f4a58 },
  glassSky: { color: 0x556272 },

  steel: { color: 0x7e8892 },
  steelLight: { color: 0x9ba4ad },
  steelDark: { color: 0x555d66 },

  /** The formal planting: clipped, not coastal. */
  hedge: { color: 0x5c7a52 },
  hedgeLight: { color: 0x76946a },

  /** Office windows, in three slow groups. */
  office0: { color: 0xf3dda8, emissive: true, dayAlpha: 0.04, nightAlpha: 1 },
  office1: { color: 0xf3dda8, emissive: true, dayAlpha: 0.04, nightAlpha: 1 },
  office2: { color: 0xeed9ab, emissive: true, dayAlpha: 0.04, nightAlpha: 1 },
  /** People still at their desks. Drawn over the light, never lit themselves. */
  figures: { color: 0x2f2c28 },

  /**
   * The architectural lighting: soft blue, thrown up the wall from the plinth
   * and out from under the cornice. This is what makes the building beautiful
   * after sunset, and it is the only colour on it that isn't someone's lamp.
   */
  accent: { color: 0x5f93da, emissive: true, dayAlpha: 0, nightAlpha: 1 },

  /** Racks, still working. */
  led: { color: 0x7fe0a0, emissive: true, dayAlpha: 0.2, nightAlpha: 1 },
  /** A screen somewhere behind the glass. */
  monitor: { color: 0x9fd4e8, emissive: true, dayAlpha: 0.05, nightAlpha: 1 },
  beacon: { color: 0xe8604f, emissive: true, dayAlpha: 0.3, nightAlpha: 1 },
};

/** Back to front. Mass first, then what is set into it, then what is lit. */
const ORDER = [
  "stone",
  "stoneLight",
  "stoneDark",
  "concrete",
  "concreteLight",
  "concreteDark",
  "glass",
  "glassSky",
  "office0",
  "office1",
  "office2",
  "monitor",
  "led",
  "figures",
  "steel",
  "steelLight",
  "steelDark",
  "hedge",
  "hedgeLight",
  "accent",
  "beacon",
];

// --- Local drawing helpers ---------------------------------------------------

/** A filled circle. */
function disc(px: Pixels, cx: number, cy: number, r: number, alpha = 255): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) px.set(x, y, alpha);
    }
  }
}

/** A one-pixel circle outline. */
function ring(px: Pixels, cx: number, cy: number, r: number, alpha = 255): void {
  for (let y = cy - r - 1; y <= cy + r + 1; y++) {
    for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(d - r) < 0.55) px.set(x, y, alpha);
    }
  }
}

export class VaultsysRenderer extends BuildingRenderer {
  private readonly rand = createRandom(0x7a17);
  private ledFrame = -1;

  constructor(private readonly motionScale = 1) {
    super(W, H);
  }

  protected get order(): readonly string[] {
    return ORDER;
  }

  protected get materials(): Record<string, LayerMaterial> {
    return MATERIALS;
  }

  /** Just clear of the mast, which stands on the axis like everything else. */
  override get promptTop(): number {
    return H + 2;
  }

  // --- Plotting --------------------------------------------------------------

  protected plot(): void {
    this.plotApron();
    this.plotMass();
    this.plotUpperFloor(F3, 3);
    this.plotUpperFloor(F2, 2);
    this.plotGroundFloor();
    this.plotEntrance();
    this.plotRoof();
    this.plotAccentLighting();
  }

  /**
   * The setting: a stone walkway, bollards, clipped hedges and two lamps.
   *
   * Everything on a strict pitch. The shore outside this plot is deliberately
   * unruly — the whole point of a formal forecourt is that it isn't.
   */
  private plotApron(): void {
    const stone = this.pixels("stone");
    const light = this.pixels("stoneLight");
    const dark = this.pixels("stoneDark");
    const steel = this.pixels("steel");
    const steelLight = this.pixels("steelLight");
    const hedge = this.pixels("hedge");
    const hedgeLight = this.pixels("hedgeLight");

    stone.rect(2, APRON.top, W - 4, APRON.bottom - APRON.top + 1);
    light.hLine(APRON.top, 2, W - 3);
    dark.hLine(APRON.bottom, 2, W - 3);
    // Paving joints, evenly spaced. A bank's forecourt is set out, not poured.
    for (let x = 8; x < W - 4; x += 10) dark.vLine(x, APRON.top + 1, APRON.bottom, 110);

    // Security bollards, in a line, at a regular pitch.
    for (let x = 12; x < W - 10; x += 16) {
      steel.vLine(x, APRON.top - 3, APRON.top);
      steelLight.set(x, APRON.top - 3);
      steel.set(x + 1, APRON.top - 1, 130);
    }

    // Clipped hedges either side of the walk. Rectangles on purpose — nothing
    // on this plot is allowed to be picturesque.
    for (const box of [
      { x: 12, width: 30 },
      { x: W - 42, width: 30 },
    ]) {
      hedge.rect(box.x, PLINTH.bottom - 3, box.width, 4);
      hedgeLight.hLine(PLINTH.bottom - 3, box.x, box.x + box.width - 1);
      for (let x = box.x + 3; x < box.x + box.width; x += 6) {
        this.pixels("hedge").vLine(x, PLINTH.bottom - 2, PLINTH.bottom, 150);
      }
    }

    // Two lamps flanking the approach, on the axis of the bollards.
    for (const x of [ENTRANCE.x - 18, ENTRANCE.x + ENTRANCE.width + 17]) {
      steel.vLine(x, GROUND.bottom - 12, APRON.top - 1);
      steelLight.vLine(x, GROUND.bottom - 12, GROUND.bottom - 8, 130);
      steel.hLine(GROUND.bottom - 13, x - 2, x + 2);
      this.pixels("accent").rect(x - 2, GROUND.bottom - 12, 5, 1);
    }
  }

  /** The block itself: plinth, wall, banding and cornice. */
  private plotMass(): void {
    const concrete = this.pixels("concrete");
    const light = this.pixels("concreteLight");
    const dark = this.pixels("concreteDark");
    const stone = this.pixels("stone");
    const stoneLight = this.pixels("stoneLight");
    const stoneDark = this.pixels("stoneDark");

    // Plinth: darker stone, stepped out past the wall above it.
    stone.rect(BLOCK.x - 2, PLINTH.top, BLOCK.width + 4, PLINTH.bottom - PLINTH.top + 1);
    stoneLight.hLine(PLINTH.top, BLOCK.x - 2, BLOCK.x + BLOCK.width + 1);
    stoneDark.hLine(PLINTH.bottom, BLOCK.x - 2, BLOCK.x + BLOCK.width + 1);

    // The wall, from the plinth to the cornice.
    concrete.rect(BLOCK.x, CORNICE.top, BLOCK.width, PLINTH.top - CORNICE.top);
    light.vLine(BLOCK.x, CORNICE.top, PLINTH.top - 1);
    light.vLine(BLOCK.x + 1, CORNICE.top, PLINTH.top - 1, 140);
    dark.vLine(BLOCK.x + BLOCK.width - 1, CORNICE.top, PLINTH.top - 1);
    dark.vLine(BLOCK.x + BLOCK.width - 2, CORNICE.top, PLINTH.top - 1, 140);

    // The two banding courses. Deep, projecting, and the main reason the
    // building reads horizontal.
    for (const band of [BAND_A, BAND_B]) {
      stone.rect(BLOCK.x - 1, band.top, BLOCK.width + 2, band.bottom - band.top + 1);
      stoneLight.hLine(band.top, BLOCK.x - 1, BLOCK.x + BLOCK.width);
      stoneDark.hLine(band.bottom, BLOCK.x - 1, BLOCK.x + BLOCK.width);
    }

    // The cornice, projecting further than anything below it.
    stone.rect(BLOCK.x - 3, CORNICE.top, BLOCK.width + 6, CORNICE.bottom - CORNICE.top + 1);
    stoneLight.hLine(CORNICE.top, BLOCK.x - 3, BLOCK.x + BLOCK.width + 2);
    stoneDark.hLine(CORNICE.bottom, BLOCK.x - 3, BLOCK.x + BLOCK.width + 2);

    // Parapet above it, hiding the plant.
    concrete.rect(BLOCK.x, PARAPET.top, BLOCK.width, PARAPET.bottom - PARAPET.top + 1);
    light.hLine(PARAPET.top, BLOCK.x, BLOCK.x + BLOCK.width - 1);
    dark.hLine(PARAPET.bottom, BLOCK.x, BLOCK.x + BLOCK.width - 1);
  }

  /**
   * A floor of punched windows.
   *
   * Punched, not glazed wall to wall — openings in a solid mass, each with a
   * reveal, separated by pilasters. That single choice is most of the
   * difference between this facade and its neighbour's.
   */
  private plotUpperFloor(band: { top: number; bottom: number }, storey: number): void {
    const glass = this.pixels("glass");
    const sky = this.pixels("glassSky");
    const dark = this.pixels("concreteDark");
    const light = this.pixels("concreteLight");
    const figures = this.pixels("figures");
    const monitor = this.pixels("monitor");

    const windowWidth = 6;
    const windowHeight = band.bottom - band.top - 5;
    const pitch = 12;
    const inset = 10;

    const usable = BLOCK.width - inset * 2;
    const count = Math.floor((usable + (pitch - windowWidth)) / pitch);
    const start = BLOCK.x + inset + Math.floor((usable - (count * pitch - (pitch - windowWidth))) / 2);
    const top = band.top + 3;

    for (let i = 0; i < count; i++) {
      const x = start + i * pitch;

      // The entrance pavilion takes the middle of the second floor.
      if (band === F2 && x + windowWidth > ENTRANCE.x - 2 && x < ENTRANCE.x + ENTRANCE.width + 2) {
        continue;
      }

      glass.rect(x, top, windowWidth, windowHeight);
      sky.rect(x, top, windowWidth, 2);
      // The reveal: a shadow down one side and a lit edge down the other, which
      // is what makes an opening look cut into a wall rather than printed on it.
      dark.vLine(x - 1, top - 1, top + windowHeight);
      dark.hLine(top - 1, x - 1, x + windowWidth);
      light.vLine(x + windowWidth, top - 1, top + windowHeight);

      // Most windows are dark. A bank at night is mostly empty, and the few
      // that are lit only read as *late* because the rest are not.
      if (this.rand() < 0.42) continue;

      const group = Math.floor(this.rand() * OFFICE_GROUPS);
      this.pixels(`office${group}`).rect(x, top, windowWidth, windowHeight);

      // Someone still at a desk, in one window in eight.
      if (this.rand() < 0.16) {
        const fx = x + 1 + Math.floor(this.rand() * 2);
        const base = top + windowHeight - 1;
        figures.rect(fx + 1, base - 5, 2, 2);
        figures.rect(fx, base - 3, 4, 4);
      } else if (storey === 3 && this.rand() < 0.14) {
        // Or a screen, left running.
        monitor.rect(x + 1, top + 2, windowWidth - 2, 3);
      }
    }
  }

  /**
   * The ground floor: pilasters, the server room and its mirrored intake.
   *
   * Heaviest storey of the three, as it should be — the building gets lighter
   * as it goes up, which is the oldest trick there is for making something look
   * like it is standing rather than balancing.
   */
  private plotGroundFloor(): void {
    const concrete = this.pixels("concrete");
    const light = this.pixels("concreteLight");
    const dark = this.pixels("concreteDark");
    const glass = this.pixels("glass");
    const steelDark = this.pixels("steelDark");

    // Pilasters, at the same pitch as the windows above.
    for (let x = BLOCK.x + 4; x < BLOCK.x + BLOCK.width - 4; x += 12) {
      if (x + 5 > ENTRANCE.x - 2 && x < ENTRANCE.x + ENTRANCE.width + 2) continue;
      concrete.rect(x, GROUND.top, 5, GROUND.bottom - GROUND.top + 1);
      light.vLine(x, GROUND.top, GROUND.bottom);
      dark.vLine(x + 4, GROUND.top, GROUND.bottom);
    }

    // Armoured glazing between them, set well back.
    for (const bay of [
      { x: BLOCK.x + 2, width: ENTRANCE.x - BLOCK.x - 6 },
      { x: ENTRANCE.x + ENTRANCE.width + 4, width: BLOCK.x + BLOCK.width - ENTRANCE.x - ENTRANCE.width - 6 },
    ]) {
      glass.rect(bay.x, GROUND.top + 3, bay.width, GROUND.bottom - GROUND.top - 6);
      steelDark.hLine(GROUND.top + 2, bay.x, bay.x + bay.width - 1);
      steelDark.hLine(GROUND.bottom - 3, bay.x, bay.x + bay.width - 1);
    }

    this.plotServerRoom();

    // The intake grille on the other side, so the facade stays symmetrical and
    // the server room doesn't read as an accident.
    for (let i = 0; i < VENT.height; i += 2) {
      steelDark.hLine(VENT.y + i, VENT.x, VENT.x + VENT.width - 1);
    }
    this.pixels("steel").frame(VENT.x - 1, VENT.y - 1, VENT.width + 2, VENT.height + 2);
  }

  /**
   * The server room: racks behind armoured glass, still working.
   *
   * The only literal thing on the building, and the smallest. Six frames of
   * indicator lights is what a production estate looks like from the street at
   * two in the morning.
   */
  private plotServerRoom(): void {
    const glass = this.pixels("glass");
    const steel = this.pixels("steel");
    const steelDark = this.pixels("steelDark");

    glass.rect(SERVER.x, SERVER.y, SERVER.width, SERVER.height);
    steel.frame(SERVER.x - 1, SERVER.y - 1, SERVER.width + 2, SERVER.height + 2);
    // Rack uprights behind the glass.
    for (let x = SERVER.x + 2; x < SERVER.x + SERVER.width; x += 5) {
      steelDark.vLine(x, SERVER.y + 1, SERVER.y + SERVER.height - 2);
    }

    for (let f = 0; f < LED_FRAMES; f++) {
      const led = this.pixels("led", f);
      // Each lamp has its own prime-ish period, so the rack never blinks in
      // unison — which is the entire difference between a server room and a
      // string of fairy lights.
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 8; c++) {
          const period = 2 + ((r * 7 + c * 3) % 5);
          if ((f + r * 2 + c) % period === 0) continue;
          led.set(SERVER.x + 2 + c * 2, SERVER.y + 2 + r * 2);
        }
      }
    }
  }

  /**
   * The entrance: a projecting pavilion, massive steel doors, and the vault
   * disc above them.
   *
   * The one place the building raises its voice, and it does it by being
   * *bigger*, not brighter.
   */
  private plotEntrance(): void {
    const concrete = this.pixels("concrete");
    const light = this.pixels("concreteLight");
    const dark = this.pixels("concreteDark");
    const stone = this.pixels("stone");
    const stoneLight = this.pixels("stoneLight");
    const stoneDark = this.pixels("stoneDark");
    const steel = this.pixels("steel");
    const steelLight = this.pixels("steelLight");
    const steelDark = this.pixels("steelDark");

    const top = CORNICE.top - 3;

    // The pavilion, standing proud of the wall and rising through the cornice.
    concrete.rect(ENTRANCE.x, top, ENTRANCE.width, PLINTH.top - top);
    light.vLine(ENTRANCE.x, top, PLINTH.top - 1);
    light.vLine(ENTRANCE.x + 1, top, PLINTH.top - 1, 140);
    dark.vLine(ENTRANCE.x + ENTRANCE.width - 1, top, PLINTH.top - 1);
    dark.vLine(ENTRANCE.x + ENTRANCE.width - 2, top, PLINTH.top - 1, 140);

    stone.rect(ENTRANCE.x - 2, top, ENTRANCE.width + 4, 3);
    stoneLight.hLine(top, ENTRANCE.x - 2, ENTRANCE.x + ENTRANCE.width + 1);
    stoneDark.hLine(top + 2, ENTRANCE.x - 2, ENTRANCE.x + ENTRANCE.width + 1);

    this.plotVaultDisc();

    // The doors. Two leaves, deliberately oversized, with a heavy frame and a
    // threshold of steps down to the walkway.
    const doorTop = GROUND.top + 3;
    const doorBottom = PLINTH.top - 1;
    const doorWidth = 11;

    for (const dx of [CX - doorWidth - 1, CX + 1]) {
      steel.rect(dx, doorTop, doorWidth, doorBottom - doorTop + 1);
      steelLight.vLine(dx, doorTop, doorBottom);
      steelDark.vLine(dx + doorWidth - 1, doorTop, doorBottom);
      // Plate lines across each leaf.
      for (let y = doorTop + 3; y < doorBottom; y += 4) {
        steelDark.hLine(y, dx + 1, dx + doorWidth - 2, 120);
      }
      // The handle, a vertical bar at the meeting stile.
      const handleX = dx < CX ? dx + doorWidth - 3 : dx + 2;
      steelLight.vLine(handleX, doorTop + 5, doorBottom - 5);
    }
    stoneDark.frame(CX - doorWidth - 2, doorTop - 1, doorWidth * 2 + 4, doorBottom - doorTop + 3);

    // Steps, running the width of the pavilion.
    for (let i = 0; i < 3; i++) {
      const y = PLINTH.top + i;
      const half = (ENTRANCE.width >> 1) + 2 + i * 2;
      stone.rect(CX - half, y, half * 2, 1);
      stoneLight.hLine(y, CX - half, CX + half - 1, 120);
    }
  }

  /**
   * The vault disc.
   *
   * Concentric rings, eight radial spokes, a boss at the centre and bolt heads
   * around the rim — the face of a round door, rendered as relief rather than as
   * an opening. It is the only ornament on the building and it sits exactly on
   * the axis, which is the whole idea.
   */
  private plotVaultDisc(): void {
    const steel = this.pixels("steel");
    const light = this.pixels("steelLight");
    const dark = this.pixels("steelDark");
    const { cx, cy, radius } = VAULT;

    disc(steel, cx, cy, radius);
    ring(dark, cx, cy, radius);
    ring(light, cx, cy, radius - 1);
    ring(dark, cx, cy, radius - 4);
    ring(light, cx, cy, radius - 6);

    // Spokes, at eight points of the compass.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      for (let r = radius - 6; r <= radius - 2; r++) {
        dark.set(cx + Math.round(Math.cos(a) * r), cy + Math.round(Math.sin(a) * r));
      }
    }

    // Bolt heads just inside the rim.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      light.set(cx + Math.round(Math.cos(a) * (radius - 2)), cy + Math.round(Math.sin(a) * (radius - 2)));
    }

    disc(light, cx, cy, 1);
    dark.set(cx + 1, cy + 1);
  }

  /**
   * The roof: dishes, plant and a mast.
   *
   * Behind the parapet and barely showing, which is where a bank puts its
   * machinery. Nothing here is decoration.
   */
  private plotRoof(): void {
    const concrete = this.pixels("concrete");
    const light = this.pixels("concreteLight");
    const dark = this.pixels("concreteDark");
    const steel = this.pixels("steel");
    const steelDark = this.pixels("steelDark");
    const beacon = this.pixels("beacon");

    // HVAC units, symmetrically placed about the axis.
    for (const x of [CX - 44, CX - 16, CX + 8, CX + 32]) {
      const unit = { x, y: PARAPET.top - 6, w: 12, h: 6 };
      concrete.rect(unit.x, unit.y, unit.w, unit.h);
      light.hLine(unit.y, unit.x, unit.x + unit.w - 1);
      dark.hLine(unit.y + unit.h - 1, unit.x, unit.x + unit.w - 1);
      for (let i = 2; i < unit.w - 1; i += 3) {
        steelDark.vLine(unit.x + i, unit.y + 1, unit.y + unit.h - 2, 140);
      }
    }

    // Two satellite dishes, one either side of the mast, tilted up at the sky.
    for (const [i, x] of [CX - 28, CX + 22].entries()) {
      // Mirrored about the axis, because everything on this building is.
      const face = i === 0 ? 1 : -1;
      const dishY = PARAPET.top - 10;
      const cx = x + 3;
      const cy = dishY + 4;

      // The face: an ellipse, narrow because it is seen at an angle. Drawn as a
      // proper dish rather than a paddle — the rim has to be visibly deeper on
      // one side or it reads as a flag on a pole.
      for (let dy = -4; dy <= 4; dy++) {
        const halfW = Math.round(Math.sqrt(Math.max(0, 1 - (dy * dy) / 16)) * 3);
        for (let dx = -halfW; dx <= halfW; dx++) steel.set(cx + dx, cy + dy);
      }
      // The lit inside of the dish, and the shadow along the rim behind it.
      const steelLight = this.pixels("steelLight");
      for (let dy = -3; dy <= 3; dy++) {
        const halfW = Math.round(Math.sqrt(Math.max(0, 1 - (dy * dy) / 9)) * 2);
        for (let dx = -halfW; dx <= halfW; dx++) {
          steelLight.set(cx - face + dx, cy + dy);
        }
      }
      steelDark.vLine(cx + face * 3, cy - 2, cy + 2);

      // The feed arm on its boom, and the pedestal down to the roof.
      steelDark.set(cx - face * 3, cy - 1);
      steelDark.set(cx - face * 4, cy - 2);
      steel.set(cx - face * 5, cy - 3);
      steel.vLine(cx, cy + 4, PARAPET.top - 1);
      steel.hLine(PARAPET.top - 1, cx - 1, cx + 1);
    }

    // The communications mast, on the axis with everything else.
    steel.vLine(CX, ROOF.top + 1, PARAPET.top - 1);
    steelDark.vLine(CX + 1, ROOF.top + 3, PARAPET.top - 1);
    for (let y = ROOF.top + 3; y < PARAPET.top - 2; y += 4) {
      steel.hLine(y, CX - 2, CX + 3, 150);
    }
    steel.hLine(ROOF.top + 4, CX - 3, CX + 4);
    beacon.set(CX, ROOF.top);
    beacon.set(CX + 1, ROOF.top, 150);
  }

  /**
   * The blue architectural lighting.
   *
   * Thrown up the wall from behind the plinth and out from under the cornice —
   * grazing light on concrete, which is exactly how a building like this is lit
   * in real life and why it looks expensive after dark. Deliberately not on the
   * windows: this is the building being lit, not the building glowing.
   */
  private plotAccentLighting(): void {
    const accent = this.pixels("accent");

    // Uplight from the plinth, fading as it climbs the wall.
    for (let i = 0; i < 8; i++) {
      const y = PLINTH.top - 1 - i;
      accent.hLine(y, BLOCK.x + 1, BLOCK.x + BLOCK.width - 2, Math.round(150 * (1 - i / 8)));
    }

    // A grazing wash under the cornice, and a line along its face.
    for (let i = 0; i < 4; i++) {
      accent.hLine(CORNICE.bottom + 1 + i, BLOCK.x + 1, BLOCK.x + BLOCK.width - 2,
        Math.round(120 * (1 - i / 4)));
    }
    accent.hLine(CORNICE.bottom, BLOCK.x - 3, BLOCK.x + BLOCK.width + 2, 200);

    // The entrance reveal, brightest of the three, so the way in is obvious.
    accent.vLine(ENTRANCE.x - 1, CORNICE.top, PLINTH.top - 1, 220);
    accent.vLine(ENTRANCE.x + ENTRANCE.width, CORNICE.top, PLINTH.top - 1, 220);
    accent.hLine(PLINTH.top - 1, ENTRANCE.x, ENTRANCE.x + ENTRANCE.width - 1, 200);
  }

  // --- Idle animation --------------------------------------------------------

  /**
   * Four things, and three of them are slow.
   *
   * The server rack blinks, three groups of office lights turn over on cycles
   * measured in minutes, a monitor changes what it is showing, and the mast
   * light answers once every four seconds. Set against Planet01's six — with a
   * ticker and pulses among them — this reads as a building that has gone quiet
   * for the night and is still working (ART_DIRECTION.md §Animation Rules).
   */
  tick(elapsed: number): void {
    if (this.motionScale <= 0) return;

    const led = Math.floor(elapsed / LED_SECONDS) % LED_FRAMES;
    if (led !== this.ledFrame) {
      this.ledFrame = led;
      this.setFrame("led", led);
    }

    for (let g = 0; g < OFFICE_GROUPS; g++) {
      const cycle = OFFICE_CYCLES[g];
      // A zero cycle is a floor that never turns its lights off.
      if (cycle <= 0) continue;

      const phase = (elapsed % cycle) / cycle;
      const lit = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5 < OFFICE_DUTY[g];
      this.setEmissiveScale(`office${g}`, lit ? 1 : 0);
    }

    // A screen changing what it is showing, rather than flickering.
    this.setEmissiveScale(
      "monitor",
      1 - MONITOR_DEPTH * (0.5 + 0.5 * Math.sin(elapsed * MONITOR_RATE))
    );

    const into = elapsed % BEACON_PERIOD;
    this.setEmissiveScale("beacon", into < BEACON_FLASH ? 1 : 0.12);
  }
}
