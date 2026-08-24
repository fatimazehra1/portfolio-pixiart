import type {
  ChapterConfig,
  ChapterCamera,
  ChapterOverview,
  ChapterInterior,
  ResolvedChapter,
} from "./UniverseTypes";

/**
 * The career universe, as a list of worlds.
 *
 * The single source of truth for the *overview* — which worlds exist, where
 * they sit relative to each other, what they look like from a distance, and how
 * the camera goes into each one. It is the counterpart of `SCENES`, one level
 * up: scenes compose the inside of a world, this composes the space between
 * them.
 *
 * # Composed, not plotted
 * The layout is two-dimensional and deliberately irregular. Nothing is sorted
 * by x, nothing shares a baseline, and no two worlds are the same size —
 * because the moment they line up the map reads as a street again, and that is
 * the whole thing this design exists to stop being. Chronology is carried by
 * `era` and by the eye travelling roughly west to east; it is never carried by
 * a road.
 *
 * The arrangement reads in three bands:
 *
 *     FREELANCE          VAULSYS            BBIT
 *   APTECH      PLANET01           NATURETECH      LIGHTHOUSE
 *     WORKSHOP        IDEAS
 *
 * Aptech sits low and west because the eye starts there. Planet01 and
 * NatureTech are the largest because they are the largest chapters. The
 * lighthouse sits alone at the far east — it is contact, it is the end of the
 * map, and it is the one world meant to be findable from anywhere on it.
 * Workshop and Ideas sit *below* the career band, because they run underneath
 * all of it rather than after any of it.
 *
 * # Distinct, not decorated
 * Every world differs in three ways before a single prop is placed: the shape
 * of its landmass (`identity.form`), the structures standing on it
 * (`identity.landmarks`), and its colours. That is what makes nine worlds nine
 * places, rather than one place in nine colours.
 */
export const CHAPTERS: readonly ChapterConfig[] = [
  {
    id: "aptech",
    name: "Aptech",
    tagline: "Where the training happened.",
    era: { from: 2021, to: 2023 },
    status: "past",
    identity: {
      primary: 0xc9a227,
      secondary: 0x7d6b3a,
      accent: 0xffd77a,
      terrain: "campus",
      // Wide and flat: a campus is ground you gather on. The one world whose
      // landmass is mostly open space, because the gathering was the point.
      form: "plateau",
      landmarks: [
        { bitmap: "campus", at: -0.05, scale: 2, tier: "far" },
        { bitmap: "flagpole", at: 0.42, scale: 2, tier: "mid" },
      ],
      ambient: "flutter",
    },
    overview: { x: 300, y: 470, radius: 78 },
    interior: { kind: "coast", scenes: ["aptech"] },
    note: "The first world. Low and west, so the eye starts there.",
  },
  {
    id: "freelance",
    name: "Freelance",
    tagline: "Bought and sold, one job at a time.",
    era: { from: 2022 },
    status: "past",
    identity: {
      primary: 0x8f9e6a,
      secondary: 0x5c6b46,
      accent: 0xf0dda0,
      terrain: "meadow",
      // One building's worth of ground and no more. The smallest landmass on
      // the map, which is the honest size of a desk in a spare room.
      form: "knoll",
      landmarks: [
        { bitmap: "cottage", at: 0, scale: 2, tier: "far" },
        { bitmap: "chimney", at: 0.34, scale: 2, tier: "mid" },
      ],
      ambient: "smoke",
    },
    // Above and just east of Aptech: the years overlap, and the map says so by
    // stacking the two rather than by sequencing them.
    overview: { x: 620, y: 250, radius: 48 },
    interior: { kind: "coast", scenes: ["cottage"] },
    note: "Small, and still running. No end year and no company.",
  },
  {
    id: "planet01",
    name: "Planet01",
    tagline: "Four floors of projects and a rooftop classroom.",
    era: { from: 2023, to: 2025 },
    status: "past",
    identity: {
      primary: 0x4f7fa8,
      secondary: 0x2c4a63,
      accent: 0x9fd0e8,
      terrain: "city",
      // Stepped, because a city is built on more than one level, and because
      // the stagger is what reads as *city* at a distance rather than *block*.
      form: "terrace",
      landmarks: [
        { bitmap: "tower", at: 0.08, scale: 3, tier: "far" },
        { bitmap: "block", at: -0.42, scale: 2, tier: "mid" },
        { bitmap: "lowblock", at: 0.55, scale: 2, tier: "mid" },
        { bitmap: "lowblock", at: -0.68, scale: 2, flip: true, tier: "near" },
      ],
      ambient: "beacon",
    },
    // The biggest of the past worlds, and near the middle. Two years of the
    // densest work on the map should sit where the eye lands.
    overview: { x: 880, y: 560, radius: 96 },
    interior: { kind: "coast", scenes: ["planet01"] },
    camera: { zoom: 1 },
    note: "A city world. Laravel, Vue, MERN, CTAWORLD, payments, mentoring.",
  },
  {
    id: "vaulsys",
    name: "Vaulsys",
    tagline: "Disciplined, quiet, exact.",
    era: { from: 2025, to: 2026 },
    status: "past",
    identity: {
      primary: 0x6b6f7a,
      secondary: 0x3f434c,
      accent: 0xc8d2e0,
      terrain: "vault",
      // Hard-edged and shut. The only landmass on the map with straight sides,
      // which is the whole of what "fortified" reads as at thirty pixels.
      form: "slab",
      landmarks: [
        { bitmap: "vault", at: 0, scale: 2, tier: "far" },
        { bitmap: "aerial", at: 0.5, scale: 2, tier: "mid" },
      ],
      ambient: "beacon",
    },
    overview: { x: 1180, y: 230, radius: 70 },
    interior: { kind: "coast", scenes: ["vaultsys"] },
    note: "Fintech. Java, Oracle SQL, payment infrastructure.",
  },
  {
    id: "naturetech",
    name: "NatureTech",
    tagline: "Half office, half construction site.",
    era: { from: 2026 },
    status: "active",
    identity: {
      primary: 0x5f8f5a,
      secondary: 0x2f4f33,
      accent: 0xe8703a,
      terrain: "forge",
      // Still being piled up. The only irregular heap on the map, and the only
      // world whose outline is meant to look unfinished.
      form: "mound",
      landmarks: [
        { bitmap: "crane", at: 0.3, scale: 3, tier: "far" },
        { bitmap: "frame", at: -0.2, scale: 2, tier: "mid" },
        { bitmap: "lowblock", at: -0.62, scale: 2, tier: "near" },
      ],
      ambient: "swing",
    },
    // Current work: the largest world on the map, and the warmest.
    overview: { x: 1520, y: 620, radius: 104 },
    interior: { kind: "coast", scenes: ["naturetech"] },
    camera: { zoom: 1 },
    note: "Where the work is now. Enterprise ERP, Laravel, Next.js, NestJS.",
  },
  {
    id: "bbit",
    name: "BBIT",
    tagline: "Still studying, still building.",
    era: { from: 2025 },
    status: "active",
    identity: {
      primary: 0x8a6fb0,
      secondary: 0x4a3a63,
      accent: 0xdcc6f5,
      terrain: "spire",
      // Tall and narrow, with one thing on it. Study is vertical and solitary.
      form: "peak",
      landmarks: [{ bitmap: "spire", at: 0, scale: 3, tier: "far" }],
    },
    overview: { x: 1760, y: 300, radius: 62 },
    interior: { kind: "coast", scenes: ["bbit"] },
    note: "The education that runs alongside the work, not after it.",
  },
  {
    id: "workshop",
    name: "Workshop",
    tagline: "Side projects. Mostly quiet, one bench still in use.",
    era: { from: 2021 },
    status: "dormant",
    identity: {
      primary: 0x7a6a58,
      secondary: 0x453b31,
      accent: 0xe0a458,
      terrain: "workshop",
      // Broken into pieces that hang together — which is what a shelf of
      // half-finished experiments looks like from any distance.
      form: "cluster",
      landmarks: [
        { bitmap: "shed", at: -0.1, scale: 2, tier: "far" },
        { bitmap: "leanto", at: 0.45, scale: 2, tier: "mid" },
      ],
      ambient: "smoke",
    },
    // Below the career band. It runs underneath all of it rather than after any
    // of it, and vertical distance is how the map says "this is not a job".
    overview: { x: 640, y: 830, radius: 58 },
    interior: { kind: "coast", scenes: ["workshop"] },
    note: "Blender, Three.js, Figma, AI experiments. Some finished, most not.",
  },
  {
    id: "ideas",
    name: "Ideas",
    tagline: "Where things arrive unannounced.",
    era: { from: 2021 },
    status: "active",
    identity: {
      primary: 0xb5843f,
      secondary: 0x5e3f1d,
      accent: 0xffe9a8,
      terrain: "meadow",
      // Thin and sharp. Nothing here has settled, and the outline should not
      // pretend otherwise.
      form: "shard",
      landmarks: [{ bitmap: "tent", at: 0, scale: 3, tier: "far" }],
      ambient: "spark",
    },
    overview: { x: 1080, y: 900, radius: 50 },
    interior: { kind: "coast", scenes: ["ideastent"] },
    note: "Hackathons, TapStore, AI ideas, the next thing.",
  },
  {
    id: "lighthouse",
    name: "Lighthouse",
    tagline: "The way to get in touch.",
    era: { from: 2021 },
    status: "active",
    identity: {
      primary: 0xd8d2c4,
      secondary: 0x6f6a5f,
      accent: 0xffdf8a,
      terrain: "shore",
      // A pillar: almost all height, almost no ground. Not somewhere you spend
      // time — somewhere you signal from.
      form: "peak",
      landmarks: [{ bitmap: "lighthouse", at: 0, scale: 3, tier: "far" }],
      ambient: "beacon",
    },
    // Alone at the far east. The end of the map, and the one world meant to be
    // findable from anywhere on it.
    overview: { x: 2020, y: 560, radius: 56 },
    interior: { kind: "coast", scenes: ["lighthouse"] },
    note: "Contact. Always lit, at every hour and under every status.",
  },
];

/**
 * Space kept outside the outermost world, in universe pixels.
 *
 * The same argument as `WORLD_MARGIN` on the coast: a map that ends exactly at
 * its last world reads as having run out. It should read as continuing.
 */
export const UNIVERSE_MARGIN = 260;

/** How the camera treats a world that does not say. */
export const DEFAULT_CHAPTER_CAMERA: ChapterCamera = {
  /**
   * Two, matching the coast's own default framing. A chapter world is small —
   * one scene plus its margins — so the frame that suited a stretch of
   * coastline is the frame that suits a whole world of it.
   */
  zoom: 2,
  /** The middle. A world with one scene in it has nowhere better to start. */
  entry: 0.5,
  /**
   * How far the overview zooms towards a world before the interior takes over.
   *
   * Well past the point where the world fills the frame, so the cut happens
   * while the mark on the map is large and featureless rather than while it is
   * still recognisably a mark. That is what makes the swap read as arriving
   * rather than as a scene change.
   */
  approachZoom: 3,
};

/** Where a world starts and finishes resolving into detail, by zoom. */
export const DEFAULT_DETAIL_FROM = 1;
export const DEFAULT_DETAIL_TO = 2.2;

function resolveOverview(overview: ChapterOverview): Required<ChapterOverview> {
  return {
    x: overview.x,
    y: overview.y,
    radius: overview.radius,
    detailFrom: overview.detailFrom ?? DEFAULT_DETAIL_FROM,
    detailTo: overview.detailTo ?? DEFAULT_DETAIL_TO,
  };
}

function resolveInterior(interior: ChapterInterior): Required<ChapterInterior> {
  return {
    kind: interior.kind,
    scenes: interior.scenes,
    /**
     * Open ground either side of the chapter's own scenes.
     *
     * Narrower than the coast's margin, because a world is not a journey: you
     * arrive in the middle of it and the margin is breathing room, not a walk.
     */
    margin: interior.margin ?? 360,
  };
}

/** Fill in everything a chapter left unsaid. */
export function resolveChapter(chapter: ChapterConfig): ResolvedChapter {
  return {
    id: chapter.id,
    name: chapter.name,
    tagline: chapter.tagline ?? "",
    era: chapter.era,
    status: chapter.status,
    identity: chapter.identity,
    overview: resolveOverview(chapter.overview),
    interior: resolveInterior(chapter.interior),
    camera: { ...DEFAULT_CHAPTER_CAMERA, ...chapter.camera },
    note: chapter.note ?? "",
  };
}

/** Every chapter, resolved. Computed once. */
export const RESOLVED_CHAPTERS: readonly ResolvedChapter[] = CHAPTERS.map(resolveChapter);

/** Find a chapter by id. */
export function chapterById(id: string): ResolvedChapter | undefined {
  return RESOLVED_CHAPTERS.find((chapter) => chapter.id === id);
}

/**
 * How big the overview is, derived from the worlds in it rather than declared.
 *
 * Same argument as `worldWidthFor`: a declared size is a size every position is
 * secretly a fraction of, and the day a ninth world is added every one of the
 * eight already placed moves. Deriving it means adding a world extends the map.
 */
export function universeBounds(
  chapters: readonly ResolvedChapter[] = RESOLVED_CHAPTERS,
  margin: number = UNIVERSE_MARGIN
): { x: number; y: number; width: number; height: number } {
  if (chapters.length === 0) {
    return { x: 0, y: 0, width: margin * 2, height: margin * 2 };
  }

  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;

  for (const chapter of chapters) {
    const { x, y, radius } = chapter.overview;
    left = Math.min(left, x - radius);
    right = Math.max(right, x + radius);
    top = Math.min(top, y - radius);
    bottom = Math.max(bottom, y + radius);
  }

  return {
    x: Math.round(left - margin),
    y: Math.round(top - margin),
    width: Math.round(right - left + margin * 2),
    height: Math.round(bottom - top + margin * 2),
  };
}

/** The middle of the map. Where the overview camera opens. */
export function universeCentre(
  chapters: readonly ResolvedChapter[] = RESOLVED_CHAPTERS
): { x: number; y: number } {
  const bounds = universeBounds(chapters);
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}
