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
 * # House style
 * No em dashes in anything a visitor reads. Ranges are written "2023 to 2025",
 * separators are commas and full stops. Parsers split on the characters they
 * know, and a recruiter's applicant tracking system is a parser.
 *
 * # The three layers
 * An island says three different amounts depending on how much attention it is
 * being given, and each layer has its own field:
 *
 *  - `roleLine` plus the first few `stack` tags is the **hover** layer
 *  - `summary`, `bullets` and the full `stack` is the **click** layer
 *  - `href` is the **deeper page**, where one exists
 *
 * Anything with real depth also carries `sections`, which is how one island can
 * hold several distinct builds without flattening them into one bullet list.
 *
 * # Screenshots
 * `screenshots` names files inside `public/screenshots/<id>/`. Drop the images
 * in, list the filenames here, and the card grows a gallery:
 *
 *     screenshots: ["dashboard.png", "invoice.png"],
 *
 * Two to four reads best. An empty list, an empty folder, or a filename that
 * does not exist are all normal states rather than broken ones. See
 * `public/screenshots/README.md`.
 */

/** How far along a chapter is. Drives the status dot. */
export type ChapterStatus = "current" | "past" | "ongoing";

/**
 * One named build inside a chapter.
 *
 * A chapter is a place and a span of time; a section is a thing that was
 * shipped there. Planet01 is one job and four products, and a reader looking
 * for "the logistics platform" should find it under its own heading rather
 * than as the first bullet of a list of six.
 */
export interface ChapterSection {
  /** The product's own name, as it would be searched for. */
  title: string;
  /** One line: what it is and who it is for. */
  descriptor: string;
  /** What was actually built. */
  bullets: readonly string[];
  /** The stack for this build specifically, not for the whole chapter. */
  stack?: readonly string[];
}

/** Everything the interface knows about one chapter. */
export interface ChapterContent {
  /** Matches `ChapterConfig.id` in the universe registry. The only join. */
  id: string;
  /** What the card says. May differ from the world's short name. */
  title: string;
  /** As written: "2021 to 2023", "Apr 2026 to present". */
  period: string;
  /**
   * The same span, machine-readable, for `<time dateTime>` on the resume.
   *
   * A crawler reading "Feb 2023 to Jun 2025" has to guess; a `<time>` element
   * with an ISO 8601 range does not. `end` is omitted for anything still
   * running, which is what "present" means in a way a parser can act on.
   */
  start: string;
  end?: string;
  /** Sorts the timeline. Ties are broken by the order in this file. */
  startYear: number;
  status: ChapterStatus;
  /** The chapter in three or four words. Shown under the title. */
  headline: string;
  /**
   * The hover layer's one line: what this was, in the language of the job.
   *
   * Separate from `headline`, which is a mood, and from `summary`, which is a
   * paragraph. This is the line a recruiter reads while deciding whether to
   * click, so it names the role and the thing that was built, in that order.
   */
  roleLine: string;
  /** One or two lines. What this chapter actually was. */
  summary: string;
  /**
   * The one line about scale and ownership: how big the thing was and how much
   * of it was mine. Separate from `summary` because a summary says what a
   * place *was* and this says what it *amounted to*, and the second is the
   * sentence a reader (or a recruiter's search) is actually looking for.
   */
  outcome?: string;
  /**
   * The title held there, for the resume's per-role heading. Omitted where the
   * chapter is not a role. A list of ideas has no job title.
   */
  role?: string;
  /** Which section of the resume this belongs under. */
  resumeSection: "experience" | "education" | "projects";
  /**
   * The organisation's own name, where it differs from the island's title.
   *
   * The map is allowed to call an island "Loop2Tech & Ideas"; a schema entry
   * for an employer is not. `worksFor` is a claim about a real company and has
   * to name it exactly.
   */
  org?: string;
  /** Tech tags, as chips. The first four are what the hover layer shows. */
  stack: readonly string[];
  /** Three to five lines of what was built. */
  bullets: readonly string[];
  /** Named builds inside this chapter, where there is more than one. */
  sections?: readonly ChapterSection[];
  /**
   * Where to read more, if there is anywhere.
   *
   * Renders as "Explore project" on the panel. Omitted rather than pointed at
   * a page that does not say anything the panel has not already said.
   */
  href?: string;
  /** Shown where a count would be, for chapters with nothing to count. */
  category: string;
  /** Filenames inside `public/screenshots/<id>/`. Two to four reads best. */
  screenshots: readonly string[];
}

/** The person, and the numbers on the sidebar. Edit these directly. */
export const PROFILE = {
  /**
   * The full name, everywhere, without exception.
   *
   * "Fatima Shakeel" is a common name and ranks against thousands of people;
   * "Fatima Zehra Shakeel" is the string that identifies one of them. It is
   * the `<h1>`, the title tag, the schema `name` and the sidebar heading, and
   * the three have to agree for any of them to be worth anything.
   */
  name: "Fatima Zehra Shakeel",
  /**
   * The positioning, in the words people search with.
   *
   * "Full Stack Developer" is the query with the volume behind it and "ERP
   * Engineer" is the one that narrows it to work almost nobody else in the
   * result set has actually done. Both, in that order, in the title tag, the
   * sidebar and the schema.
   */
  jobTitle: "Full Stack Developer & ERP Engineer",
  tagline: "Full Stack Developer building web applications, ERP systems, and business software.",
  /** The second line on the sidebar: what to do with the map you are looking at. */
  subline:
    "Explore the islands to see what I have built, where I have worked, and how my work has evolved.",
  location: { city: "Karachi", region: "Sindh", country: "PK" },
  /**
   * Scale and ownership, not counts.
   *
   * "22 technologies" is a number about a CV; "50+ client tenants" is a number
   * about a system somebody depends on. Written as strings on purpose. These
   * are claims, not totals derived from however many bullets are listed.
   */
  stats: [
    { label: "Years", value: "4+" },
    { label: "Projects shipped", value: "15+" },
    { label: "Client tenants", value: "50+" },
  ],
  /**
   * What this developer works in, for `knowsAbout` on the Person schema and
   * for the keyword set the site is positioned on. Ordered by weight, not
   * alphabetically: the first six are what the site is trying to rank for.
   */
  expertise: [
    "Full stack development",
    "Laravel",
    "ERP systems",
    "Business software",
    "Backend development",
    "Java and Spring Boot",
    "PHP",
    "Vue.js",
    "React",
    "REST API design",
    "Multi-tenant architecture",
    "Double-entry accounting systems",
    "Payment and KYC systems",
    "MySQL and Oracle SQL",
  ],
  /**
   * Contact, as real links.
   *
   * **Fill these in.** A `#` href is a placeholder, and anything still holding
   * one is rendered as plain text rather than as a link to the page it is
   * already on, and left out of the resume's `sameAs`.
   */
  contact: [
    {
      label: "Email",
      value: "fatima.shakeel1521@gmail.com",
      href: "mailto:fatima.shakeel1521@gmail.com",
    },
    { label: "LinkedIn", value: "linkedin.com/in/…", href: "#" }, // TODO(fill in): LinkedIn URL
    { label: "GitHub", value: "github.com/…", href: "#" }, // TODO(fill in): GitHub URL
    { label: "Loop2Tech", value: "loop2tech.com", href: "https://loop2tech.com" },
  ],
  /** The contact panel's own words. See the lighthouse chapter. */
  invitation: {
    heading: "Have something worth building?",
    openTo:
      "Open to full stack and backend roles, ERP and business software work, and contract builds. Karachi based, and used to working with teams and clients remotely.",
  },
} as const;

/** A `#` is a placeholder, not a destination. */
export const isRealContact = (href: string) => href !== "#";

/**
 * The site's own facts, for metadata.
 *
 * One title, one description, one canonical origin, used by the root layout,
 * the resume, the sitemap and the robots file, so the positioning cannot drift
 * between the tab, the search result and the link preview.
 */
export const SITE = {
  title: "Fatima Zehra Shakeel | Full Stack Developer & ERP Engineer",
  // 132 characters. Under the ~155 Google renders before truncating, and it
  // leads with the two roles and then the stack, because that is the order the
  // queries this page is aimed at are actually typed in.
  description:
    "Full stack developer and ERP engineer specializing in Laravel, PHP, Java, Spring Boot, Vue, React, APIs and business software.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** The preview image, 1200×630, of the hub itself. */
  ogImage: "/og.png",
  /**
   * The searches this site is aimed at, most-wanted first.
   *
   * The first six are the target list; the rest are the long tail that the
   * same pages already answer. A name at the end because somebody who types
   * the name is going to find it whatever this array says.
   */
  keywords: [
    "full stack developer",
    "Laravel developer",
    "ERP developer",
    "business software developer",
    "backend developer",
    "Java Spring Boot developer",
    "PHP developer",
    "Vue.js developer",
    "React developer",
    "REST API development",
    "multi-tenant ERP",
    "double-entry accounting systems",
    "full stack developer Karachi",
    "Fatima Zehra Shakeel",
  ],
} as const;

export const CHAPTER_CONTENT: readonly ChapterContent[] = [
  {
    id: "aptech",
    title: "Aptech",
    period: "2021 to 2023",
    start: "2021",
    end: "2023",
    role: "Advanced Diploma in Software Engineering",
    resumeSection: "education",
    org: "Aptech",
    startYear: 2021,
    status: "past",
    headline: "Where it started",
    roleLine: "Advanced Diploma in Software Engineering, with client work alongside it.",
    summary:
      "Three years of the Advanced Diploma in Software Engineering, taken while doing paid client work on the side. Most of it was build competitions on short clocks, which is where I learned to scope a thing down until it can actually be finished.",
    stack: ["HTML", "CSS", "JavaScript", "Bootstrap", "Laravel", "MERN"],
    bullets: [
      "Music streaming platform built in plain HTML, CSS, JavaScript and Bootstrap, placed top three at Aptech Vision",
      "Led a four person team at TechWiz, building an e-commerce platform over three days on site",
      "Built a restaurant site with one partner inside a four hour design sprint",
      "Finished the diploma while taking freelance work through the last two years of it",
    ],
    category: "Education",
    screenshots: [],
  },
  {
    id: "freelance",
    title: "Freelance",
    period: "2022 to 2023",
    start: "2022",
    end: "2023",
    role: "Freelance Web Developer",
    resumeSection: "experience",
    org: "Independent",
    startYear: 2022,
    status: "past",
    headline: "Shipping for other people",
    roleLine: "Freelance web developer, Laravel client sites delivered solo.",
    summary:
      "First paid work. Laravel sites for small businesses, taken from the first conversation through to handover, with nobody else on the build to hand the hard parts to.",
    outcome:
      "Delivered Laravel client sites end to end, scoping, build and handover, as the only developer on each.",
    stack: ["Laravel", "PHP", "MySQL", "JavaScript"],
    bullets: [
      "Several client sites delivered end to end on Laravel and MySQL",
      "Requirements gathered directly from the client, with no account manager in between",
      "Learned to scope, quote and hold a delivery date that somebody else set",
    ],
    category: "Independent",
    screenshots: [],
  },
  {
    id: "planet01",
    title: "Planet01",
    period: "Feb 2023 to Jun 2025",
    start: "2023-02",
    end: "2025-06",
    role: "Full Stack Developer",
    org: "Planet01",
    resumeSection: "experience",
    startYear: 2023,
    status: "past",
    headline: "The long chapter",
    roleLine: "Full stack developer, sole owner of a three portal logistics platform.",
    summary:
      "Joined as an intern and left as a full stack developer two and a half years later. Four products in that time, across Laravel, Vue, React and Angular, and most of what I know about building a system somebody else has to run got built here.",
    outcome:
      "Sole developer on CTA World, a three portal logistics platform serving partner companies, subscribers and their staff.",
    stack: ["Laravel", "Vue.js", "React", "Angular", "MySQL", "Pusher", "Stripe", "SCSS"],
    href: "/projects#cta-world",
    sections: [
      {
        title: "CTA World",
        descriptor:
          "A logistics platform with three separate portals and one Laravel backend behind all of them.",
        bullets: [
          "Laravel superadmin portal and the REST API layer every other portal reads from",
          "Three Vue.js dashboards on that API, one each for partner companies, subscribers and subscriber employees, with the permissions of each worked out separately",
          "Real-time chat between partners and subscribers over Pusher",
          "Stripe and PayPal integrated for subscription billing",
          "Sole developer for the life of the project, working directly with the client on requirements",
        ],
        stack: ["Laravel", "Vue.js", "MySQL", "Pusher", "Stripe", "PayPal"],
      },
      {
        title: "Domino's rider dashboard",
        descriptor: "A rider operations dashboard for Domino's, built in Laravel.",
        bullets: [
          "Custom Laravel dashboard for tracking rider assignments and delivery state",
          "Component system in SCSS, built to a brand the client already had",
        ],
        stack: ["Laravel", "SCSS", "MySQL"],
      },
      {
        title: "Catering platform",
        descriptor: "Public booking site and admin dashboard for a catering business.",
        bullets: [
          "My first full Laravel build, taken from empty repository to live site",
          "Admin dashboard for menus, bookings and enquiries, plus the public site in front of it",
        ],
        stack: ["Laravel", "MySQL", "JavaScript"],
      },
      {
        title: "Cryptocurrency trading frontend",
        descriptor: "The interface for a crypto trading platform, against an existing API.",
        bullets: [
          "Trading and portfolio screens built against an API somebody else owned",
          "Live price and order state handled without the page having to be reloaded",
        ],
        stack: ["React", "JavaScript", "SCSS"],
      },
    ],
    bullets: [
      "Sole developer on CTA World: Laravel superadmin and API layer, three Vue.js dashboards, real-time chat, Stripe and PayPal",
      "Rider operations dashboard for Domino's in Laravel with an SCSS component system",
      "Catering platform delivered end to end, admin dashboard and public site",
      "Frontend for a cryptocurrency trading platform",
      "Trained two interns and took requirements directly from clients",
    ],
    category: "Product",
    screenshots: [],
  },
  {
    id: "vaulsys",
    title: "Vaultsys",
    period: "2025 to 2026",
    start: "2025",
    end: "2026",
    role: "Software Engineer",
    org: "Vaultsys",
    resumeSection: "experience",
    startYear: 2025,
    status: "past",
    headline: "Money at scale",
    roleLine: "Backend developer, Java and Spring Boot on production banking systems.",
    summary:
      "Backend work on financial infrastructure behind NayaPay, Pakistan's largest payment application, then allocated to the delivery team for RawBank, the largest bank in the Democratic Republic of Congo. Java, Spring Boot and Vaadin, against Oracle, on systems where a bad deploy is somebody's salary.",
    outcome:
      "Production payment and KYC systems for Pakistan's largest payment app and the largest bank in the Congo.",
    stack: ["Java", "Spring Boot", "Vaadin", "Hibernate", "Oracle SQL"],
    href: "/projects#vaultsys",
    sections: [
      {
        title: "Payments and cash flow",
        descriptor: "The modules that move money and account for it afterwards.",
        bullets: [
          "Built and maintained payment processing and cash flow modules in Java and Spring Boot",
          "Integrated payment gateways and reconciled what they returned against internal ledgers",
          "Traced production incidents through Oracle SQL query analysis on live data",
        ],
      },
      {
        title: "Customer onboarding and KYC",
        descriptor: "The checks a customer passes before an account is allowed to transact.",
        bullets: [
          "Implemented and supported customer KYC workflows, including document and verification states",
          "Built back office screens in Vaadin for the staff who work those queues",
        ],
      },
      {
        title: "Running it",
        descriptor: "The part of a banking job that is not writing features.",
        bullets: [
          "Owned ongoing deployments and maintenance across release cycles",
          "Onboarded a colleague new to Java through pairing and code review",
        ],
      },
    ],
    bullets: [
      "Payment and cash flow modules in Java and Spring Boot, in production",
      "Customer KYC workflows and the back office screens behind them",
      "Payment gateway integration and reconciliation",
      "Production debugging through Oracle SQL",
      "Deployments, maintenance, and onboarding a colleague new to Java",
    ],
    category: "Fintech",
    screenshots: [],
  },
  {
    id: "naturetech",
    title: "NatureTech",
    period: "Apr 2026 to present",
    start: "2026-04",
    role: "Software Engineer",
    org: "NatureTech (SoftSol)",
    resumeSection: "experience",
    startYear: 2026,
    status: "current",
    headline: "Still building",
    roleLine: "Sole engineer on a multi-tenant ERP, built to onboard 50+ clients.",
    summary:
      "Sole engineer on a multi-tenant enterprise ERP replacing a legacy Microsoft Access system, built to onboard more than 50 client tenants. Every module below is mine, from the schema through the business rules to the screens the accountants actually use.",
    outcome:
      "Replacing a legacy Microsoft Access system with a multi-tenant ERP built to onboard 50+ clients.",
    stack: ["Laravel", "Next.js", "Nest.js", "Vue.js", "Inertia", "MySQL"],
    href: "/projects#naturetech-erp",
    sections: [
      {
        title: "Accounting",
        descriptor: "Double-entry, and everything that has to balance against it.",
        bullets: [
          "Chart of Accounts with the full account hierarchy and opening balances",
          "Double-entry posting from purchase invoices and sale invoices, so every document lands in the ledger",
          "Party ledger with running balances and print output for statements",
          "Banking module covering accounts, receipts, payments and transfers between accounts",
        ],
      },
      {
        title: "Operations",
        descriptor: "The modules the business runs its day on.",
        bullets: [
          "Inventory with item masters, units, stock movement and valuation",
          "Purchasing: purchase orders, purchase invoices and supplier records",
          "Sales: sale invoices with record navigation, customer records and pricing",
          "Production and consumption tracking, with the consumption index driving what stock is drawn down",
        ],
      },
      {
        title: "Platform",
        descriptor: "The parts every other module is built on.",
        bullets: [
          "Matrix-style roles and permissions interface on Spatie, granular per module and per action",
          "Generalised CRUD controller adopted across every module, so a new entity costs a config rather than a controller",
          "Excel bulk import with duplicate rejection and inline validation summaries",
          "Data migration off the legacy Microsoft Access system, including the cleanup that came with it",
          "Reporting dashboards in ApexCharts, plus the printable reports the office asked for",
          "FBR digital invoicing integration for tax compliant invoice submission",
        ],
      },
    ],
    bullets: [
      "Double-entry accounting across Chart of Accounts, purchase invoices and sale invoices",
      "Inventory, purchasing, sales, production and consumption modules",
      "Banking: accounts, receipts, payments and transfers",
      "Matrix-style roles and permissions on Spatie",
      "FBR digital invoicing integration",
      "Excel bulk import with duplicate rejection, and migration off the legacy Access system",
      "Generalised CRUD controller used by every module, and ApexCharts reporting",
    ],
    category: "Enterprise",
    screenshots: [],
  },
  {
    id: "bbit",
    title: "BBIT",
    period: "2025 to present",
    start: "2025",
    role: "Bachelor of Business Information Technology",
    resumeSection: "education",
    org: "Virtual University of Pakistan",
    startYear: 2025,
    status: "ongoing",
    headline: "Still studying",
    roleLine: "Bachelor of Business Information Technology, alongside full time work.",
    summary:
      "Bachelor of Business Information Technology at Virtual University of Pakistan, taken alongside a full time engineering job. The business half of it is more useful than I expected for ERP work, where the hard part is usually the accounting rather than the code.",
    stack: ["Business Information Technology"],
    bullets: [],
    category: "Education",
    screenshots: [],
  },
  {
    id: "workshop",
    title: "Workshop",
    period: "Ongoing",
    start: "2021",
    resumeSection: "projects",
    startYear: 2021,
    status: "ongoing",
    headline: "Things I tried",
    roleLine: "Side builds, 3D work, and whatever I am currently learning.",
    summary:
      "The experiments that did not become products. Blender and Three.js work, interface design, and at the moment language models and model training.",
    stack: ["Blender", "Three.js", "Figma", "Machine learning"],
    bullets: [
      "3D modelling in Blender and Three.js scenes on the web",
      "Interface and product design in Figma",
      "Currently working through language models, machine learning and model training",
    ],
    category: "Experiments",
    screenshots: [],
  },
  {
    id: "ideas",
    title: "Loop2Tech & Ideas",
    period: "2026 to present",
    start: "2026",
    role: "Co-Founder",
    resumeSection: "experience",
    org: "Loop2Tech",
    startYear: 2026,
    status: "ongoing",
    headline: "Co-founder, Loop2Tech",
    roleLine: "Co-founder of a Karachi studio building web, mobile and e-commerce products.",
    summary:
      "Loop2Tech is a Karachi technology studio building web applications, mobile apps and e-commerce products for clients. The founding team has shipped more than 30 projects between us.",
    outcome:
      "Co-founded a Karachi technology studio; 30+ projects delivered across the team in web, mobile and e-commerce.",
    stack: ["Laravel", "Next.js", "Flutter", "E-commerce", "Product"],
    href: "https://loop2tech.com",
    bullets: [
      "Co-founder, building web, mobile and e-commerce products for clients out of Karachi",
      "More than 30 projects delivered across the team",
      "TapStore, a multi-tenant SaaS for restaurants and stores",
      "An AI-driven reservation system, in progress",
    ],
    category: "Studio",
    screenshots: [],
  },
  {
    id: "lighthouse",
    title: "Contact",
    period: "—",
    start: "2100",
    resumeSection: "projects",
    startYear: 2100,
    status: "ongoing",
    headline: "Get in touch",
    roleLine: "Open to full stack, backend and ERP work.",
    summary: PROFILE.invitation.openTo,
    stack: [],
    bullets: [],
    category: "Contact",
    screenshots: [],
  },
];

/**
 * Tags that are subjects rather than technologies. Counted on a card like any
 * other chip, but kept out of the sidebar's stack count, which is a claim
 * about tools and would be quietly overstated by "Product" and "E-commerce".
 */
const NON_TECH_TAGS = new Set([
  "Business Information Technology",
  "Product",
  "E-commerce",
  "Machine learning",
]);

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
 * year. It is not a date, it is a destination, and sorting it by when it
 * "began" would put it at 2021 among the education.
 */
export const CHAPTER_TIMELINE: readonly ChapterContent[] = [...CHAPTER_CONTENT].sort(
  (a, b) => a.startYear - b.startYear
);
