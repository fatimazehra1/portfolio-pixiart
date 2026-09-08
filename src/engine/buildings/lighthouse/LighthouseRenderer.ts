import { BuildingRenderer, type LayerMaterial } from "../BuildingRenderer";

/**
 * The Contact lighthouse, in pixels.
 *
 * # Why a second lighthouse
 * `@/engine/lighthouse` already draws one, beautifully, and it stays where it
 * is: that tower is a *scene* object — it stands on the shore's own ground
 * band, it subscribes to the world clock, and its beam is a swept ellipse
 * tracked across the water it is standing beside. None of those three things
 * exist on the hub. What the hub needs is a `BuildingRenderer` like the other
 * eight: a fixed bitmap, plotted once, lit from the flat hub state, and
 * centred on an island's top face.
 *
 * So the geometry and the palette here are deliberately the same tower — the
 * proportions in `LighthouseConfig.TOWER` were chosen by hand and there is no
 * reason to choose them twice — rebuilt against the buildings' own plumbing.
 *
 * # The beam goes both ways
 * A beam thrown out to one side only would shift the bitmap's centre off the
 * tower, and the hub centres a building on its bitmap. Symmetric wedges fix
 * that and cost nothing in truth: a lighthouse beam sweeps, and a sweep seen
 * from a mile away is light on both sides of the lamp. `tick` alternates their
 * strength so the sweep actually turns.
 */

// --- Dimensions --------------------------------------------------------------

/**
 * Forty-eight by a hundred and fifty: a tower thirty-two wide inside it, with
 * eight pixels either side for the beam. Four and a half times as tall as it is
 * wide, which is the proportion that reads as "lighthouse" rather than as
 * "chimney" or "keep".
 */
const W = 48;
const H = 150;

const CX = W >> 1;
const BASE = H - 1;

/** Vertical structure, top down. Sums to `H`. */
const FINIAL = 2;
const DOME = 8;
const LANTERN = 16;
const RAILING = 8;
const FLOOR = 5;
const PLINTH = 18;

const DOME_TOP = FINIAL;
const DOME_BOTTOM = DOME_TOP + DOME - 1;
const LANTERN_TOP = DOME_BOTTOM + 1;
const LANTERN_BOTTOM = LANTERN_TOP + LANTERN - 1;
const RAIL_TOP = LANTERN_BOTTOM + 1;
const RAIL_BOTTOM = RAIL_TOP + RAILING - 1;
const FLOOR_TOP = RAIL_BOTTOM + 1;
const FLOOR_BOTTOM = FLOOR_TOP + FLOOR - 1;
const SHAFT_TOP = FLOOR_BOTTOM + 1;
const PLINTH_TOP = H - PLINTH;
const SHAFT_BOTTOM = PLINTH_TOP - 1;

/** Widths, at the four places the tower changes its mind. */
const PLINTH_W = 32;
const SHAFT_BOTTOM_W = 26;
const SHAFT_TOP_W = 18;
const GALLERY_W = 30;
const LANTERN_W = 18;
const DOME_TOP_W = 5;

const COURSE = 7;

/** The door, and the three windows up the shaft. */
const DOOR = { width: 8, height: 12 };
const WINDOW = { width: 4, height: 6, count: 3, start: 0.22, step: 0.27 };

/**
 * The two painted bands.
 *
 * Given as fractions of the shaft so they stay where they look right if the
 * tower is ever re-proportioned. This is the one piece of colour on the
 * building and it is doing the most work of anything here: at hub scale a
 * banded tower is a lighthouse and a plain one is a silo.
 */
const BANDS: readonly [number, number][] = [
  [0.18, 0.34],
  [0.56, 0.72],
];

/** The lamp's own height, and how far the beam reaches past the lantern. */
const LAMP_Y = LANTERN_TOP + (LANTERN >> 1);
const BEAM_REACH = (W - LANTERN_W) >> 1;

// --- Animation ---------------------------------------------------------------

/** One full turn of the light, in seconds. Slow — this is a coast, not a disco. */
const SWEEP_SECONDS = 9.5;
/** How far the far side drops while the near side is bright. Never to nothing. */
const SWEEP_FLOOR = 0.28;
/** The lamp's own shallow breath, under the sweep. */
const BREATH_RATE = 0.5;
const BREATH_DEPTH = 0.07;

// --- Materials ---------------------------------------------------------------

/**
 * The shore's own lighthouse palette, restated here as layer materials.
 *
 * Muted, sun-faded stone with a verdigris cap — copper rather than paint,
 * because a green cap is what stops a grey tower disappearing into a pale sky.
 * The band is the single exception: a faded brick red, the one saturated thing
 * on the building.
 */
const MATERIALS: Record<string, LayerMaterial> = {
  stone: { color: 0x9b968b },
  stoneLight: { color: 0xb6b1a5 },
  stoneDark: { color: 0x6d6960 },

  /** The painted bands, and the shading down their shadowed side. */
  band: { color: 0xa8544a },
  bandLight: { color: 0xc4736a },
  bandDark: { color: 0x7d3a34 },

  /** Ironwork: the gallery railing, the lantern's astragals, the door. */
  iron: { color: 0x5b574f },
  ironLight: { color: 0x78736a },

  copper: { color: 0x6f9a86 },
  copperLight: { color: 0x90bba5 },
  copperDark: { color: 0x4c6e5f },

  /** Unlit glass, between the astragals — cold, and darker than its frame. */
  glass: { color: 0x3e4a56 },

  /**
   * Everything that makes light.
   *
   * None of these ever reaches zero. A lighthouse that goes out is not a
   * lighthouse — it is the fixed point the rest of the map is read against,
   * and it is the chapter called Contact. Bright at midnight, merely present
   * at noon, exactly as a real one looks.
   */
  window: { color: 0xffd692, emissive: true, dayAlpha: 0.45, nightAlpha: 0.95 },
  lamp: { color: 0xfff2d0, emissive: true, dayAlpha: 0.72, nightAlpha: 1 },
  /**
   * The daylight floor on the beam is high on purpose. The hub has no clock —
   * it hands every building `localLightMultiplier: 0`, so an emissive layer
   * there sits at exactly its `dayAlpha` forever. At 0.24 the beam was
   * invisible on the map, which is the one place it most needs to be seen.
   */
  beamLeft: { color: 0xffeec0, emissive: true, dayAlpha: 0.55, nightAlpha: 0.85 },
  beamRight: { color: 0xffeec0, emissive: true, dayAlpha: 0.55, nightAlpha: 0.85 },
};

const ORDER = [
  "beamLeft",
  "beamRight",
  "stone",
  "stoneLight",
  "stoneDark",
  "band",
  "bandLight",
  "bandDark",
  "glass",
  "window",
  "lamp",
  "iron",
  "ironLight",
  "copper",
  "copperLight",
  "copperDark",
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class LighthouseRenderer extends BuildingRenderer {
  constructor(private readonly motionScale = 1) {
    super(W, H);
  }

  protected get order(): readonly string[] {
    return ORDER;
  }

  protected get materials(): Record<string, LayerMaterial> {
    return MATERIALS;
  }

  /** The finial. On a tower this narrow the prompt belongs over the light. */
  override get promptTop(): number {
    return H;
  }

  // --- Plotting --------------------------------------------------------------

  protected plot(): void {
    this.plotBeam();
    this.plotShaft();
    this.plotBands();
    this.plotWindows();
    this.plotPlinth();
    this.plotDoor();
    this.plotGallery();
    this.plotLantern();
    this.plotDome();
  }

  /**
   * Two wedges of light, widening as they leave the lamp.
   *
   * Dithered out toward the tips rather than cut off: a beam with a hard end is
   * a plank. The near end is left solid, because that is where the lamp is and
   * light is brightest where it starts.
   */
  private plotBeam(): void {
    for (const side of [-1, 1] as const) {
      const layer = this.pixels(side < 0 ? "beamLeft" : "beamRight");
      const edge = side < 0 ? CX - (LANTERN_W >> 1) - 1 : CX + (LANTERN_W >> 1);

      for (let i = 0; i < BEAM_REACH; i++) {
        const x = edge + side * i;
        const t = i / Math.max(1, BEAM_REACH - 1);
        const half = Math.round(lerp(3, 8, t));
        // Falls off with distance, and the last third is thinned to a checker
        // so the tip fades into the sky instead of stopping.
        const alpha = Math.round(255 * (1 - t * 0.55));

        for (let y = LAMP_Y - half; y <= LAMP_Y + half; y++) {
          if (t > 0.6 && ((x + y) & 1) === 0) continue;
          layer.set(x, y, alpha);
        }
      }
    }
  }

  /**
   * The shaft: tapered stone, coursed, shaded across its whole width.
   *
   * A cylinder, not a wall. A flat column of one grey with a lit edge down one
   * side reads as a rectangle, so the light runs *across* the shaft — brightest
   * a third of the way in from the left, falling to shadow on the right.
   */
  private plotShaft(): void {
    const stone = this.pixels("stone");
    const light = this.pixels("stoneLight");
    const dark = this.pixels("stoneDark");

    for (let y = SHAFT_TOP; y <= SHAFT_BOTTOM; y++) {
      const half = this.shaftHalf(y);
      const left = CX - half;
      const right = CX + half - 1;

      stone.hLine(y, left, right);

      for (let x = left; x <= right; x++) {
        const across = (x - left) / Math.max(1, right - left);
        if (across < 0.3) light.set(x, y, across < 0.14 ? 200 : 255);
        else if (across > 0.62) dark.set(x, y, across > 0.84 ? 255 : 150);
      }

      // Courses. The joint is a shadow line; the stone just under it catches a
      // little light, and that is what gives a flat wall depth.
      if ((y - SHAFT_TOP) % COURSE === 0) {
        dark.hLine(y, left, right);
        if (y + 1 <= SHAFT_BOTTOM) {
          for (let x = left + 1; x < right; x += 2) light.set(x, y + 1, 150);
        }
      }
    }
  }

  /** Two painted bands, shaded across the same way the stone under them is. */
  private plotBands(): void {
    const band = this.pixels("band");
    const light = this.pixels("bandLight");
    const dark = this.pixels("bandDark");
    const stoneDark = this.pixels("stoneDark");
    const run = SHAFT_BOTTOM - SHAFT_TOP;

    for (const [from, to] of BANDS) {
      const top = SHAFT_TOP + Math.round(run * from);
      const bottom = SHAFT_TOP + Math.round(run * to);

      for (let y = top; y <= bottom; y++) {
        const half = this.shaftHalf(y);
        const left = CX - half;
        const right = CX + half - 1;

        band.hLine(y, left, right);
        for (let x = left; x <= right; x++) {
          const across = (x - left) / Math.max(1, right - left);
          if (across < 0.3) light.set(x, y, across < 0.14 ? 200 : 255);
          else if (across > 0.62) dark.set(x, y, across > 0.84 ? 255 : 150);
        }
        if ((y - SHAFT_TOP) % COURSE === 0) dark.hLine(y, left, right);
      }

      // A hard edge top and bottom, so the paint reads as paint rather than as
      // the stone changing colour.
      stoneDark.hLine(top - 1, CX - this.shaftHalf(top), CX + this.shaftHalf(top) - 1);
      stoneDark.hLine(bottom + 1, CX - this.shaftHalf(bottom), CX + this.shaftHalf(bottom) - 1);
    }
  }

  /** Three windows up the shaft, each set into a reveal so it isn't painted on. */
  private plotWindows(): void {
    const win = this.pixels("window");
    const glass = this.pixels("glass");
    const dark = this.pixels("stoneDark");
    const light = this.pixels("stoneLight");
    const half = WINDOW.width >> 1;

    for (let i = 0; i < WINDOW.count; i++) {
      const t = WINDOW.start + i * WINDOW.step;
      const sill = Math.round(lerp(SHAFT_BOTTOM, SHAFT_TOP, t));
      const head = sill - WINDOW.height + 1;

      glass.rect(CX - half, head, WINDOW.width, WINDOW.height);
      win.rect(CX - half, head, WINDOW.width, WINDOW.height);
      // A glazing bar down the middle: four pixels of undivided light is a
      // hole, two pairs of two is a window.
      glass.vLine(CX, head, sill);
      win.vLine(CX, head, sill, 0);

      dark.frame(CX - half - 1, head - 1, WINDOW.width + 2, WINDOW.height + 2);
      light.hLine(head - 2, CX - half - 1, CX + half);
    }
  }

  /** The stepped base the whole tower stands on. Widest thing on the building. */
  private plotPlinth(): void {
    const stone = this.pixels("stone");
    const light = this.pixels("stoneLight");
    const dark = this.pixels("stoneDark");

    for (let y = PLINTH_TOP; y <= BASE; y++) {
      const step = y < PLINTH_TOP + 3 ? 3 : y > BASE - 3 ? -2 : 0;
      const half = (PLINTH_W >> 1) - step;
      const left = CX - half;
      const right = CX + half - 1;

      stone.hLine(y, left, right);
      light.set(left, y);
      light.set(left + 1, y);
      dark.set(right, y);
      dark.set(right - 1, y);

      if ((y - PLINTH_TOP) % COURSE === 0) dark.hLine(y, left, right);
    }
    dark.hLine(BASE, CX - (PLINTH_W >> 1) - 2, CX + (PLINTH_W >> 1) + 1);
  }

  /** A round-headed door, iron, with a lit edge down the hinge side. */
  private plotDoor(): void {
    const iron = this.pixels("iron");
    const light = this.pixels("ironLight");
    const stone = this.pixels("stoneDark");
    const half = DOOR.width >> 1;
    const top = BASE - DOOR.height;

    for (let y = top; y <= BASE - 2; y++) {
      const t = (y - top) / 3;
      const w = t >= 1 ? half : Math.round(half * Math.sqrt(Math.max(0, t)));
      if (w <= 0) continue;
      iron.hLine(y, CX - w, CX + w - 1);
    }
    light.vLine(CX - half, top + 3, BASE - 2);
    light.hLine(top + 3, CX - half, CX + half - 1);
    stone.frame(CX - half - 1, top - 1, DOOR.width + 2, DOOR.height);
  }

  /**
   * The gallery: an overhanging floor, and the railing that stands on it.
   *
   * The overhang is the single detail that separates a lighthouse from a
   * chimney with a light on it, so it is drawn wider than anything above or
   * below it and its underside is the darkest row on the building.
   */
  private plotGallery(): void {
    const stone = this.pixels("stone");
    const light = this.pixels("stoneLight");
    const dark = this.pixels("stoneDark");
    const iron = this.pixels("iron");
    const ironLight = this.pixels("ironLight");

    const half = GALLERY_W >> 1;
    const left = CX - half;
    const right = CX + half - 1;

    for (let y = FLOOR_TOP; y <= FLOOR_BOTTOM; y++) {
      const inset = y === FLOOR_BOTTOM ? 2 : 0;
      stone.hLine(y, left + inset, right - inset);
      light.set(left + inset, y);
      dark.set(right - inset, y);
      if (y === FLOOR_BOTTOM) dark.hLine(y, left + inset, right - inset);
    }

    // Top rail, uprights every other pixel, then the kick rail at the deck.
    ironLight.hLine(RAIL_TOP, left, right);
    for (let x = left; x <= right; x += 2) iron.vLine(x, RAIL_TOP + 1, RAIL_BOTTOM - 2);
    iron.hLine(RAIL_BOTTOM - 1, left, right);
    iron.hLine(RAIL_BOTTOM, left, right);
  }

  /** The lantern room: iron frame, glazing bars, glass, and the lamp inside. */
  private plotLantern(): void {
    const glass = this.pixels("glass");
    const iron = this.pixels("iron");
    const ironLight = this.pixels("ironLight");
    const lamp = this.pixels("lamp");

    const half = LANTERN_W >> 1;
    const left = CX - half;
    const right = CX + half - 1;

    glass.rect(left + 1, LANTERN_TOP, LANTERN_W - 2, LANTERN);
    iron.vLine(left, LANTERN_TOP, LANTERN_BOTTOM);
    iron.vLine(right, LANTERN_TOP, LANTERN_BOTTOM);
    // Astragals. Without them the lantern room is a lit rectangle, and a lit
    // rectangle is a window, not a lighthouse.
    for (let x = left + 4; x < right; x += 4) iron.vLine(x, LANTERN_TOP, LANTERN_BOTTOM);
    ironLight.hLine(LANTERN_TOP, left, right);
    iron.hLine(LANTERN_BOTTOM, left, right);

    // The lamp: a bright core floating in the middle of the glass.
    const top = LANTERN_TOP + 3;
    const bottom = LANTERN_BOTTOM - 3;
    for (let y = top; y <= bottom; y++) {
      const t = (y - top) / Math.max(1, bottom - top);
      const w = Math.round(lerp(4, 2, Math.abs(t - 0.5) * 2));
      lamp.hLine(y, CX - w, CX + w - 1);
    }
  }

  /** The copper dome, and the finial the whole silhouette ends on. */
  private plotDome(): void {
    const copper = this.pixels("copper");
    const light = this.pixels("copperLight");
    const dark = this.pixels("copperDark");

    for (let y = DOME_TOP; y <= DOME_BOTTOM; y++) {
      const t = (y - DOME_TOP) / Math.max(1, DOME_BOTTOM - DOME_TOP);
      // Eased rather than linear, so the cap is domed instead of conical.
      const width = Math.round(lerp(DOME_TOP_W, LANTERN_W + 2, Math.sqrt(t)));
      const half = width >> 1;
      copper.hLine(y, CX - half, CX + half - 1);
      light.set(CX - half, y);
      light.set(CX - half + 1, y);
      dark.set(CX + half - 1, y);
      if (y === DOME_BOTTOM) dark.hLine(y, CX - half, CX + half - 1);
    }

    copper.vLine(CX - 1, 0, FINIAL - 1);
    light.vLine(CX, 0, FINIAL - 1);
  }

  /** Shaft half-width at a given row. Tapers as it climbs, as towers do. */
  private shaftHalf(y: number): number {
    const t = (y - SHAFT_TOP) / Math.max(1, SHAFT_BOTTOM - SHAFT_TOP);
    return Math.round(lerp(SHAFT_TOP_W, SHAFT_BOTTOM_W, t)) >> 1;
  }

  // --- Animation -------------------------------------------------------------

  tick(elapsed: number): void {
    if (this.motionScale <= 0) return;

    // One beam bright while the other falls back, and round again — a sweep,
    // built out of two static wedges rather than a rotation, which would take
    // the light off the pixel grid.
    const phase = (elapsed / SWEEP_SECONDS) * Math.PI * 2;
    const swing = Math.sin(phase);
    const near = (v: number) => SWEEP_FLOOR + (1 - SWEEP_FLOOR) * (0.5 + 0.5 * v);

    this.setEmissiveScale("beamRight", near(swing));
    this.setEmissiveScale("beamLeft", near(-swing));

    // The lamp itself breathes, very shallowly. It dims; it never goes out.
    this.setEmissiveScale("lamp", 1 - BREATH_DEPTH * (0.5 + 0.5 * Math.sin(elapsed * BREATH_RATE)));
  }
}
