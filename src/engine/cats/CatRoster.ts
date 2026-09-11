/**
 * Every cat on the shore, and where it is hiding.
 *
 * # The rule this whole feature lives under
 * A recruiter must be able to use this site and never once notice there are
 * cats in it. Nothing here blocks a click that meant something else, nothing
 * points at a cat, nothing explains what a cat is for. The bucket in the
 * corner is the only trace on screen and it says one sentence when you hover
 * it. If the easter egg is deleted tomorrow the portfolio is unchanged.
 *
 * # How a cat is placed
 * Relative to whatever the scene is built around — the building's own bitmap
 * box, or the lighthouse's tower — in art pixels, from an anchor. Placing them
 * in world coordinates would mean nine numbers that silently stop meaning
 * anything the first time a building is re-plotted or a scene is reframed.
 *
 * `depth` is the whole of "partly occluded": a cat behind the building is
 * drawn before it and pokes out at the edge; one on a roof is drawn after it
 * and sits on the line. Nothing is occluded by a mask or a manual crop.
 */

/** Which side of the building a cat is drawn on. */
export type CatDepth = "behind" | "front";

/** What a cat is measured from. */
export type CatAnchor =
  /** The top-left of the building's bitmap box. */
  | "topLeft"
  /** The top-right of it. */
  | "topRight"
  /** The middle of its roofline. */
  | "roof"
  /** Its bottom-left corner, standing on the baseline. */
  | "footLeft"
  /** Its bottom-right corner. */
  | "footRight";

export interface CatSpec {
  /** Stable across releases: it is the key found cats are stored under. */
  id: string;
  /** Two words at most. Shown in the collection panel and when it is clicked. */
  name: string;
  /**
   * The chapter whose world it lives in.
   *
   * `null` is the secret one — it belongs to no world and is not placed by
   * this system at all. See `SECRET_CAT`.
   */
  chapter: string;
  /** The building it is measured from. The lighthouse chapter has no building. */
  building?: string;
  anchor: CatAnchor;
  /** Offset from that anchor, in art pixels. Positive y is down. */
  dx: number;
  dy: number;
  depth: CatDepth;
  /**
   * How far it strays either side of where it was placed, in art pixels.
   *
   * 0 for most of them. Four wander, which is enough that a visitor who looks
   * twice finds one somewhere else and not so many that the shore reads as an
   * animal sanctuary.
   */
  wander?: number;
}

export const CATS: readonly CatSpec[] = [
  {
    id: "sleepy",
    name: "Sleepy",
    chapter: "aptech",
    building: "aptech",
    // On the gate block's roof, off to one side of the flag.
    anchor: "roof",
    dx: 14,
    dy: -5,
    depth: "front",
  },
  {
    id: "hearth",
    name: "Hearth Cat",
    chapter: "freelance",
    building: "cottage",
    // In the lit window's reveal, half behind the frame.
    anchor: "topLeft",
    dx: 20,
    dy: 36,
    depth: "behind",
    wander: 6,
  },
  {
    id: "ledge",
    name: "Ledge Cat",
    chapter: "planet01",
    building: "planet01",
    // On the podium canopy, where a cat would actually get to.
    anchor: "footLeft",
    dx: 12,
    dy: -18,
    depth: "front",
    wander: 14,
  },
  {
    id: "security",
    name: "Security Cat",
    chapter: "vaulsys",
    building: "vaultsys",
    // Sitting on the plinth beside the entrance, mostly behind it.
    anchor: "footRight",
    dx: -14,
    dy: -6,
    depth: "behind",
  },
  {
    id: "site",
    name: "Site Cat",
    chapter: "naturetech",
    building: "naturetech",
    // On the scaffold's third lift, under the crane.
    anchor: "topRight",
    dx: -6,
    dy: 52,
    depth: "front",
    wander: 10,
  },
  {
    id: "clocktower",
    name: "Clocktower Cat",
    chapter: "bbit",
    building: "bbit",
    // On the parapet, just under the cap.
    anchor: "roof",
    dx: 9,
    dy: 14,
    depth: "behind",
  },
  {
    id: "workshop",
    name: "Workshop Cat",
    chapter: "workshop",
    building: "workshop",
    // On the bench in the second bay, inside the open front.
    anchor: "footLeft",
    dx: 40,
    dy: -14,
    depth: "front",
    wander: 12,
  },
  {
    id: "canvas",
    name: "Canvas Cat",
    chapter: "ideas",
    building: "ideastent",
    // Under the guy ropes at the tent's shaded end.
    anchor: "footRight",
    dx: -8,
    dy: -2,
    depth: "behind",
  },
  {
    id: "lamp",
    name: "Lamp Cat",
    chapter: "lighthouse",
    // No building here: measured from the tower. See `CatLayer`.
    anchor: "roof",
    dx: 7,
    dy: 6,
    depth: "behind",
  },
];

/**
 * The one that is not anywhere.
 *
 * Found by clicking the name at the top of the sidebar a few times, which is
 * the only place on the site that behaves like a logo. It is listed as "???"
 * in the collection until it is found, so the grid tells you there is one more
 * without telling you where — which is the only hint this feature gives.
 */
export const SECRET_CAT = {
  id: "ghost",
  name: "Ghost Cat",
  /** How many clicks on the name it takes. */
  clicks: 5,
} as const;

/** Every cat that can be found, including the secret. The panel's grid order. */
export const ALL_CAT_IDS: readonly string[] = [
  ...CATS.map((cat) => cat.id),
  SECRET_CAT.id,
];

/** A cat's name, by id. `undefined` for anything not in the roster. */
export function catName(id: string): string | undefined {
  if (id === SECRET_CAT.id) return SECRET_CAT.name;
  return CATS.find((cat) => cat.id === id)?.name;
}

/** The cats that live in one chapter's world. */
export function catsForChapter(chapter: string): readonly CatSpec[] {
  return CATS.filter((cat) => cat.chapter === chapter);
}
