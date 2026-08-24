/**
 * The portfolio content, as data.
 *
 * # Why this is not in the engine
 * The engine knows where a world *is* and what it *looks like*; it has no
 * business knowing what was built there. Keeping the two apart means the career
 * can be corrected, reordered or translated without a renderer changing, and a
 * world can be recomposed without a fact changing. They are joined by `id` and
 * by nothing else.
 *
 * # Every line here is documented
 * Sourced from `docs/TIMELINE.md`, `docs/BUILDINGS.md` and the project brief.
 * Nothing is inferred, embellished, or filled in to make a card look fuller —
 * an empty field is the correct output for a fact nobody has written down. A
 * portfolio that overstates is worse than one that is brief.
 *
 * Client and project specifics are kept at the level they were given. Where
 * work touched banking or payments, it is described by the kind of work rather
 * than by the detail of the system.
 */

/** How far along a chapter is. Drives the card's status dot. */
export type ChapterStatus = "current" | "past" | "ongoing";

/** One line of work inside a chapter. */
export interface ChapterProject {
  name: string;
  /** One sentence, at most. Cards are small and the world is the hero. */
  summary?: string;
}

/** Everything the interface knows about one chapter. */
export interface ChapterContent {
  /** Matches `ChapterConfig.id` in the universe registry. The only join. */
  id: string;
  /** What the card says. May differ from the world's short name. */
  title: string;
  /** As written on the card: "2021 — 2023", "2022 —". */
  period: string;
  /** Sorts the timeline. Ties are broken by the order in this file. */
  startYear: number;
  status: ChapterStatus;
  /** One line. The card has room for one line. */
  summary: string;
  /** The technologies actually used, as named in the source docs. */
  stack: readonly string[];
  /** Named work. Empty is allowed and honest. */
  projects: readonly ChapterProject[];
  /** Shown as a small count on the card. */
  category: string;
}

export const CHAPTER_CONTENT: readonly ChapterContent[] = [
  {
    id: "aptech",
    title: "Aptech",
    period: "2021 — 2023",
    startYear: 2021,
    status: "past",
    summary: "Advanced Diploma in Software Engineering, and the competitions around it.",
    stack: ["Laravel", "MERN"],
    projects: [
      { name: "Coke Studio clone", summary: "Selected in the top three." },
      { name: "Music World" },
      { name: "TechWiz" },
      { name: "Speed Web Design" },
    ],
    category: "Education",
  },
  {
    id: "freelance",
    title: "Freelance",
    period: "2022 —",
    startYear: 2022,
    status: "ongoing",
    summary: "Independent client work, running alongside everything since.",
    stack: [],
    projects: [],
    category: "Independent",
  },
  {
    id: "planet01",
    title: "Planet01",
    period: "2023 — 2025",
    startYear: 2023,
    status: "past",
    summary: "Two years of product work, front and back, and mentoring interns.",
    stack: ["Laravel", "Vue", "MERN", "Pusher", "Stripe", "PayPal"],
    projects: [
      { name: "CTAWORLD" },
      { name: "Domino's rider dashboard" },
      { name: "Real-time chat", summary: "Built on Pusher." },
      { name: "Payment integrations", summary: "Stripe and PayPal." },
    ],
    category: "Product",
  },
  {
    id: "vaulsys",
    title: "Vaulsys",
    period: "2025 — 2026",
    startYear: 2025,
    status: "past",
    summary: "Fintech and payment infrastructure, in Java and Oracle SQL.",
    stack: ["Java", "Oracle SQL"],
    projects: [
      { name: "RAWBANK" },
      { name: "Payment and cash-flow work" },
      { name: "KYC" },
    ],
    category: "Fintech",
  },
  {
    id: "naturetech",
    title: "NatureTech",
    period: "2026 —",
    startYear: 2026,
    status: "current",
    summary: "Large-scale enterprise ERP. The work happening now.",
    stack: ["Laravel", "Next.js", "NestJS", "MERN"],
    projects: [{ name: "Enterprise ERP" }],
    category: "Enterprise",
  },
  {
    id: "bbit",
    title: "BBIT",
    period: "2025 —",
    startYear: 2025,
    status: "ongoing",
    summary: "The degree running alongside the work, not after it.",
    stack: [],
    projects: [],
    category: "Education",
  },
  {
    id: "workshop",
    title: "Workshop",
    period: "Ongoing",
    startYear: 2021,
    status: "ongoing",
    summary: "Experiments. Some finished, most deliberately not.",
    stack: ["Blender", "Three.js", "Figma"],
    projects: [
      { name: "3D donut", summary: "The Blender one. Everyone starts there." },
      { name: "AI and LLM experiments" },
    ],
    category: "Experiments",
  },
  {
    id: "ideas",
    title: "Ideas",
    period: "Ongoing",
    startYear: 2021,
    status: "ongoing",
    summary: "Hackathons and the next thing, whatever it turns out to be.",
    stack: [],
    projects: [{ name: "TapStore" }, { name: "AI ideas" }],
    category: "Ideas",
  },
  {
    id: "lighthouse",
    title: "Contact",
    period: "—",
    startYear: 2100,
    status: "ongoing",
    summary: "The way to get in touch.",
    stack: [],
    projects: [],
    category: "Contact",
  },
];

/** Content by chapter id. Built once. */
const BY_ID = new Map(CHAPTER_CONTENT.map((c) => [c.id, c]));

/** Find one chapter's content. */
export function contentFor(id: string): ChapterContent | undefined {
  return BY_ID.get(id);
}

/**
 * Chapters in timeline order.
 *
 * By start year, with the contact marker forced to the end by its sentinel
 * year — it is not a date, it is a destination, and sorting it by when it
 * "began" would put it at 2021 among the education.
 */
export const CHAPTER_TIMELINE: readonly ChapterContent[] = [...CHAPTER_CONTENT].sort(
  (a, b) => a.startYear - b.startYear
);
