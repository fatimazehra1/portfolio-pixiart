/**
 * The portfolio content, as data. **This is the file to edit.**
 *
 * Every word the interface shows — the hub sidebar, each world's card, and the
 * whole of `/resume` — is read from here. No component owns a fact, so the
 * career can be corrected, reordered or reworded without a component, a
 * renderer or a route being touched.
 *
 * # What joins this to the world
 * `id`, and nothing else. The engine knows where a world *is* and what it
 * *looks like*; it has no business knowing what was built there.
 *
 * # Screenshots
 * `screenshots` names files inside `public/screenshots/<id>/`. Drop the images
 * in, list the filenames here, and the card grows a gallery. An empty list (or
 * a missing folder) is a normal state, not a broken one — the gallery simply
 * does not render.
 */

/** How far along a chapter is. Drives the status dot. */
export type ChapterStatus = "current" | "past" | "ongoing";

/** Everything the interface knows about one chapter. */
export interface ChapterContent {
  /** Matches `ChapterConfig.id` in the universe registry. The only join. */
  id: string;
  /** What the card says. May differ from the world's short name. */
  title: string;
  /** As written: "2021 — 2023", "2026 — present". */
  period: string;
  /** Sorts the timeline. Ties are broken by the order in this file. */
  startYear: number;
  status: ChapterStatus;
  /** The chapter in three or four words. Shown under the title. */
  headline: string;
  /** One or two lines. What this chapter actually was. */
  summary: string;
  /** Tech tags, as chips. */
  stack: readonly string[];
  /** Three to five lines of what was built. */
  bullets: readonly string[];
  /** Shown where a count would be, for chapters with nothing to count. */
  category: string;
  /** Filenames inside `public/screenshots/<id>/`. Two to four reads best. */
  screenshots: readonly string[];
}

/** The person, and the numbers on the sidebar. Edit these directly. */
export const PROFILE = {
  name: "Fatima Shakeel",
  tagline: "Full-stack developer — Laravel, and the systems behind the money.",
  /** Written as strings on purpose: "15+" is a claim, not a computed total. */
  stats: [
    { label: "Projects", value: "15+" },
    { label: "Years", value: "3.5+" },
  ],
  /**
   * Contact, as real links. **Fill these in** — every `#` href below is a
   * placeholder and nothing else in the codebase supplies one.
   */
  contact: [
    { label: "Email", value: "fatima.shakeel1521@gmail.com", href: "mailto:fatima.shakeel1521@gmail.com" },
    { label: "LinkedIn", value: "linkedin.com/in/…", href: "#" }, // TODO(fill in): LinkedIn URL
    { label: "GitHub", value: "github.com/…", href: "#" }, // TODO(fill in): GitHub URL
  ],
} as const;

export const CHAPTER_CONTENT: readonly ChapterContent[] = [
  {
    id: "aptech",
    title: "Aptech",
    period: "2021 — 2023",
    startYear: 2021,
    status: "past",
    headline: "Where it started",
    summary:
      "Advanced Diploma in Software Engineering, and the competitions that came with it.",
    stack: ["HTML", "CSS", "JavaScript", "Bootstrap", "Laravel", "MERN"],
    bullets: [
      "Coke Studio clone — placed top 3 at Aptech Vision",
      "Music World — semester-end project, pure HTML/CSS/JS/Bootstrap",
      "TechWiz — led a team building an e-commerce platform in a 3-day, 12-hour-a-day hackathon",
      "Speed Web Design — built a restaurant site with a partner in 4 hours",
      "Completed 3 years of the diploma alongside early client work",
    ],
    category: "Education",
    screenshots: [],
  },
  {
    id: "freelance",
    title: "Freelance",
    period: "2022",
    startYear: 2022,
    status: "past",
    headline: "Learning to ship for other people",
    summary: "First paid work. Client sites, real deadlines, no safety net.",
    stack: ["Laravel", "PHP", "MySQL", "JavaScript"],
    bullets: [
      "Multiple client websites delivered end to end",
      "Direct client communication and requirement gathering",
      "Learned scoping, revisions, and shipping under someone else's timeline",
    ],
    category: "Independent",
    screenshots: [],
  },
  {
    id: "planet01",
    title: "Planet01",
    period: "Feb 2023 — Jun 2025",
    startYear: 2023,
    status: "past",
    headline: "The long chapter",
    summary:
      "Joined as an intern, left as a full-stack developer. The place where most of what I know got built.",
    stack: ["Laravel", "Vue", "MERN", "Flutter", "Angular", "Pusher", "Stripe", "PayPal", "SCSS"],
    bullets: [
      "CTAWORLD — sole developer on a logistics platform: Laravel superadmin + API layer, three Vue.js dashboards (partner companies, subscribers, employees), real-time chat via Pusher, Stripe and PayPal integrations",
      "Domino's rider app dashboard — custom Laravel dashboard, SCSS UI",
      "Catering platform — first Laravel build, full dashboard and public site",
      "Bitcoin platform frontend",
      "Trained 2 interns; worked directly with clients on requirements",
    ],
    category: "Product",
    screenshots: [],
  },
  {
    id: "vaulsys",
    title: "Vaultsys",
    period: "2025 — 2026",
    startYear: 2025,
    status: "past",
    headline: "Money at scale",
    summary:
      "Backend for NayaPay, Pakistan's largest payment app. Allocated to the RawBank team — the largest bank in the Congo.",
    stack: ["Java", "Oracle SQL"],
    bullets: [
      "Payment and cash-flow systems in production",
      "Customer KYC flows",
      "Debugging and query work in Oracle SQL",
      "Ongoing deployments and system maintenance",
      "Mentored a teammate new to Java",
    ],
    category: "Fintech",
    screenshots: [],
  },
  {
    id: "naturetech",
    title: "NatureTech",
    period: "2026 — present",
    startYear: 2026,
    status: "current",
    headline: "Still building",
    summary:
      "Sole engineer on a multi-tenant enterprise ERP, built to onboard 50+ clients and replace a legacy Microsoft Access system.",
    stack: ["Laravel", "Next.js", "Nest.js", "MERN", "MySQL"],
    bullets: [
      "Double-entry accounting across Chart of Accounts and purchase/sale invoices",
      "Party ledger with print output and Excel bulk import with duplicate rejection",
      "Sale Invoice module with record navigation",
      "Matrix-style roles and permissions UI (Spatie)",
      "Generalized CRUD controller used across every module",
      "Consumption/Production index; ApexCharts dashboard",
    ],
    category: "Enterprise",
    screenshots: [],
  },
  {
    id: "bbit",
    title: "BBIT",
    period: "2025 — present",
    startYear: 2025,
    status: "ongoing",
    headline: "Still studying",
    summary:
      "Bachelor's in Business Information Technology, currently in the 3rd semester, alongside full-time work.",
    stack: ["Computer Science"],
    bullets: [],
    category: "Education",
    screenshots: [],
  },
  {
    id: "workshop",
    title: "Workshop",
    period: "Ongoing",
    startYear: 2021,
    status: "ongoing",
    headline: "Things I tried",
    summary: "Experiments that didn't become products — and the one that's still running.",
    stack: ["Blender", "Three.js", "Figma"],
    bullets: [
      "3D modelling in Blender",
      "Three.js experiments",
      "Figma and interface design",
      "Currently learning LLMs, machine learning, and model training",
    ],
    category: "Experiments",
    screenshots: [],
  },
  {
    id: "ideas",
    title: "Ideas",
    period: "Ongoing",
    startYear: 2021,
    status: "ongoing",
    headline: "Always cooking",
    summary: "A running list of problems worth solving.",
    stack: ["Product", "AI"],
    bullets: [
      "TapStore — multi-tenant restaurant/store SaaS",
      "An AI-driven reservation system",
      "Hackathon entries and side experiments",
    ],
    category: "Ideas",
    screenshots: [],
  },
  {
    id: "lighthouse",
    title: "Contact",
    period: "—",
    startYear: 2100,
    status: "ongoing",
    headline: "Get in touch",
    summary: "Email, LinkedIn, GitHub — whichever is easiest.",
    stack: [],
    bullets: [],
    category: "Contact",
    screenshots: [],
  },
];

/**
 * Tags that are subjects rather than technologies. Counted on a card like any
 * other chip, but kept out of the sidebar's stack count, which is a claim
 * about tools and would be quietly overstated by "Product" and "AI".
 */
const NON_TECH_TAGS = new Set(["Computer Science", "Product", "AI"]);

/** How many distinct technologies appear across the whole career. */
export const STACK_COUNT = new Set(
  CHAPTER_CONTENT.flatMap((c) => c.stack).filter((tag) => !NON_TECH_TAGS.has(tag))
).size;

/** Content by chapter id. Built once. */
const BY_ID = new Map(CHAPTER_CONTENT.map((c) => [c.id, c]));

/** Find one chapter's content. */
export function contentFor(id: string): ChapterContent | undefined {
  return BY_ID.get(id);
}

/** The public path of one of a chapter's screenshots. */
export function screenshotPath(id: string, file: string): string {
  return `/screenshots/${id}/${file}`;
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
