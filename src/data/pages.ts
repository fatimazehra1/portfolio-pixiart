/**
 * The written pages, as data.
 *
 * # Why these exist at all
 * The map at `/` is a WebGL canvas. A crawler sees an empty `<main>`, a screen
 * reader sees the fallback block, and a recruiter who does not want to explore
 * an island sees a game. These three pages are the same career written as
 * plain HTML: headings, paragraphs, lists, links, and nothing that has to be
 * rendered before it can be read.
 *
 * They are also the pages the site is positioned to rank on. `/about` carries
 * the full stack and ERP positioning in prose, `/what-i-build` is written
 * against the searches that describe work rather than a person, and
 * `/projects` is where each named build has a URL that can be linked to.
 *
 * # House style
 * The same as `data/chapters.ts` and `data/resume.ts`: no em dashes, ranges
 * written out, plain declarative sentences. Nothing here should read as though
 * it were generated.
 *
 * # What must not drift
 * Dates and employers live in `data/chapters.ts` and `data/resume.ts`. Where a
 * page needs a date, it reads it from there rather than restating it, so there
 * is exactly one place a correction has to be made.
 */

/** A heading and its paragraphs. The shape every written page is made of. */
export interface Passage {
  /** Omitted for a lede that sits under the page's own `h1`. */
  heading?: string;
  /** One or more paragraphs. */
  body: readonly string[];
  /** Optional list under the paragraphs. */
  points?: readonly string[];
}

/** One capability, on `/what-i-build`. */
export interface Capability {
  title: string;
  /** One line: what this is, in the words a client would use. */
  descriptor: string;
  body: string;
  points: readonly string[];
  stack: readonly string[];
}

/** One named build, on `/projects`. */
export interface ProjectEntry {
  /** The fragment it lives at. Chapter `href` values point here. */
  slug: string;
  title: string;
  /** Where it was built, and when. Read against the resume before editing. */
  context: string;
  /** One line, and it has to work on its own in a search result. */
  descriptor: string;
  body: string;
  points: readonly string[];
  stack: readonly string[];
  /** An outbound link, where the thing is public. */
  href?: string;
}

// --- /about -----------------------------------------------------------------

export const ABOUT = {
  title: "About",
  /** The one line under the h1. */
  lede: "Full stack developer and ERP engineer in Karachi, four years into building business systems that people run their working day on.",
  passages: [
    {
      body: [
        "I build the software a business actually runs on. Most of that has been full stack work in Laravel and PHP, with Vue, React and Next.js on the front of it, and a stretch of backend work in Java and Spring Boot on banking systems. The common thread is not a framework. It is that the systems have accounting in them, or money moving through them, or an operations team depending on them being correct on a Monday morning.",
        "Right now I am the sole engineer on a multi-tenant ERP built to onboard more than 50 client tenants, replacing a legacy Microsoft Access system that a business had outgrown. Accounting, inventory, purchasing, sales, production, banking, permissions and reporting are all mine, from the schema up.",
      ],
    },
    {
      heading: "How the work got here",
      body: [
        "It started with client sites. Freelance Laravel work through 2022 and 2023, taken from the first conversation to handover with nobody else on the build, while I finished an Advanced Diploma in Software Engineering at Aptech.",
        "Planet01 was the long chapter. I joined as an intern in February 2023 and left in June 2025 as a full stack developer. The main thing there was CTA World, a logistics platform I was the sole developer on: a Laravel superadmin portal and API with three separate Vue.js dashboards on top of it, real-time chat, and Stripe and PayPal for billing. Alongside it were a rider operations dashboard for Domino's, a catering platform end to end, and the frontend for a cryptocurrency trading platform. I also trained two interns.",
        "Vaulsys was the banking year. Java, Spring Boot, Vaadin and Hibernate against Oracle, on financial infrastructure behind NayaPay, Pakistan's largest payment application, and then on the delivery team for RawBank, the largest bank in the Democratic Republic of Congo. Payment and cash flow modules, KYC workflows, payment gateway integration, and the production debugging that comes with systems where being wrong is expensive.",
        "NatureTech is the ERP. It is the first system I have owned completely, and it is the one that pulled everything before it together: the Laravel from the client years, the correctness habits from the banking year, and the business side of a Bachelor of Business Information Technology I am taking alongside it.",
      ],
    },
    {
      heading: "How I work",
      body: [
        "I am comfortable owning a system end to end, which in practice means designing the schema, writing the business rules, building the screens, and then being the person who fixes it at four in the afternoon when an accountant finds an edge case in the ledger.",
        "I prefer one general solution to nine special cases. On the ERP that shows up as a generalised CRUD controller every module is built on, so adding an entity costs a configuration rather than a controller. On the banking work it showed up as reading the data before writing the fix.",
      ],
    },
  ] as readonly Passage[],
} as const;

// --- /what-i-build ----------------------------------------------------------

export const WHAT_I_BUILD = {
  title: "What I Build",
  lede: "ERP and business software, web applications, backend systems, client portals and financial systems.",
  intro:
    "Five kinds of work, and they overlap more than the headings suggest. Every one of them has ended up needing an API, a permissions model and somebody who will read the accounting rules properly.",
  capabilities: [
    {
      title: "ERP and business software",
      descriptor: "Multi-tenant ERP systems, from the chart of accounts up.",
      body: "The systems a business runs its operation and its books on. I have built these as a sole engineer, which means the accounting is mine as well as the code, and the two have to agree.",
      points: [
        "Double-entry accounting, chart of accounts, party ledgers and banking",
        "Inventory, purchasing, sales, production and consumption",
        "Multi-tenant architecture, built to onboard client tenants without a fork per client",
        "Roles and permissions as a matrix, granular per module and per action",
        "Migration off legacy systems, including the data cleanup nobody scopes for",
        "Tax compliance integration, including FBR digital invoicing",
      ],
      stack: ["Laravel", "MySQL", "Vue.js", "Inertia", "Spatie", "ApexCharts"],
    },
    {
      title: "Web applications",
      descriptor: "Full stack applications in Laravel, Vue, React and Next.js.",
      body: "Applications with real users and real state behind them, rather than sites. Server rendered where that is right and a single page app where it is not.",
      points: [
        "Laravel and PHP on the server, Vue.js, React or Next.js on the client",
        "Real-time features over Pusher, for chat and live state",
        "Payment integration with Stripe and PayPal",
        "Reporting and dashboard interfaces that print as well as they render",
      ],
      stack: ["Laravel", "PHP", "Vue.js", "React", "Next.js", "Pusher", "Stripe"],
    },
    {
      title: "Backend systems and APIs",
      descriptor: "REST APIs, business logic and database design, in PHP and Java.",
      body: "The half of the system nobody sees. Schema design, the rules that sit on it, and an API stable enough that two or three separate frontends can be built against it at once.",
      points: [
        "REST API design, versioned and documented enough to hand over",
        "Java and Spring Boot services, with Hibernate over Oracle",
        "Database design and query work in MySQL and Oracle SQL, including production debugging",
        "Background processing, imports and reconciliation jobs",
      ],
      stack: ["Java", "Spring Boot", "Hibernate", "Laravel", "Nest.js", "Oracle SQL", "MySQL"],
    },
    {
      title: "Client portals",
      descriptor: "Separate portals for separate audiences, on one backend.",
      body: "One system, several kinds of user, and a different set of things each of them is allowed to see. This is most of what a B2B platform actually is.",
      points: [
        "Multiple dashboards against a shared API, with permissions worked out per audience",
        "Superadmin tooling for the team that operates the platform",
        "Onboarding, subscription and billing flows",
        "Real-time messaging between the parties in the system",
      ],
      stack: ["Laravel", "Vue.js", "REST APIs", "Pusher"],
    },
    {
      title: "Financial systems",
      descriptor: "Payments, KYC and cash flow, in production.",
      body: "Work where correctness is the feature. Built on banking infrastructure serving a national payment application and one of Africa's largest banks.",
      points: [
        "Payment processing and cash flow modules",
        "Customer KYC workflows and the back office queues behind them",
        "Payment gateway integration and reconciliation against internal ledgers",
        "Production incident tracing through SQL on live data",
      ],
      stack: ["Java", "Spring Boot", "Vaadin", "Oracle SQL"],
    },
  ] as readonly Capability[],
} as const;

// --- /projects --------------------------------------------------------------

export const PROJECTS = {
  title: "Projects",
  lede: "Four systems worth describing properly, with what was built and what it was built in.",
  entries: [
    {
      slug: "cta-world",
      title: "CTA World",
      context: "Planet01, February 2023 to June 2025",
      descriptor:
        "A logistics platform with three separate portals and one Laravel backend behind all of them.",
      body: "The main build of my time at Planet01, and I was the sole developer on it. Partner companies, subscribers and subscriber employees each get their own dashboard, each with a different view of the same data and a different set of permissions, all served by one Laravel API. Billing runs through Stripe and PayPal, and partners and subscribers can talk to each other in real time.",
      points: [
        "Laravel superadmin portal and the REST API layer every other portal reads from",
        "Three Vue.js dashboards, one per audience, with permissions worked out separately for each",
        "Real-time chat over Pusher between partner companies and subscribers",
        "Stripe and PayPal integrated for subscription billing",
        "Sole developer for the life of the project, with requirements taken directly from the client",
      ],
      stack: ["Laravel", "Vue.js", "MySQL", "Pusher", "Stripe", "PayPal", "REST API"],
    },
    {
      slug: "naturetech-erp",
      title: "NatureTech ERP",
      context: "NatureTech (SoftSol), April 2026 to present",
      descriptor:
        "A multi-tenant enterprise ERP replacing a legacy Microsoft Access system, built to onboard more than 50 client tenants.",
      body: "The system I am currently the sole engineer on. It covers the accounting and the operations of a business in one place, which means the ledger has to balance against documents raised in five other modules. Every module listed here is mine, from the schema through the business rules to the screens.",
      points: [
        "Double-entry accounting: chart of accounts, purchase invoices, sale invoices, party ledger with print output",
        "Banking: accounts, receipts, payments and transfers",
        "Inventory, purchasing and sales, with record navigation through documents",
        "Production and consumption tracking against stock",
        "Matrix-style roles and permissions on Spatie, per module and per action",
        "Generalised CRUD controller adopted by every module, so a new entity costs a configuration",
        "Excel bulk import with duplicate rejection and inline validation summaries",
        "FBR digital invoicing integration, and migration off the legacy Access system",
        "Reporting dashboards in ApexCharts, plus printable reports",
      ],
      stack: ["Laravel", "Next.js", "Nest.js", "Vue.js", "Inertia", "MySQL", "Spatie"],
    },
    {
      slug: "dominos-rider-dashboard",
      title: "Domino's Rider Dashboard",
      context: "Planet01, 2023 to 2025",
      descriptor: "A rider operations dashboard for Domino's, built in Laravel.",
      body: "A dashboard for the people dispatching riders, rather than for the riders themselves. Assignments, delivery state and the operational view of a shift, built in Laravel against a brand system the client already had.",
      points: [
        "Custom Laravel dashboard for rider assignments and delivery state",
        "SCSS component system built to the client's existing brand",
        "Operations views designed around what a dispatcher looks at during a shift",
      ],
      stack: ["Laravel", "SCSS", "MySQL"],
    },
    {
      slug: "vaulsys",
      title: "Vaulsys Banking Systems",
      context: "Vaulsys, 2025 to 2026",
      descriptor:
        "Payment, cash flow and KYC modules in Java and Spring Boot, on production banking infrastructure.",
      body: "Backend work on financial infrastructure behind NayaPay, Pakistan's largest payment application, and then on the delivery team for RawBank, the largest bank in the Democratic Republic of Congo. Java and Spring Boot with Hibernate over Oracle, and Vaadin for the back office screens.",
      points: [
        "Payment processing and cash flow modules, in production",
        "Customer KYC workflows and the back office queues that work them",
        "Payment gateway integration and reconciliation against internal ledgers",
        "Production incident diagnosis through Oracle SQL query analysis",
        "Deployments and ongoing maintenance across release cycles",
      ],
      stack: ["Java", "Spring Boot", "Vaadin", "Hibernate", "Oracle SQL"],
    },
  ] as readonly ProjectEntry[],
} as const;

/** The written pages, for the sidebar and the sitemap. One list, one order. */
export const WRITTEN_PAGES = [
  { href: "/about", label: "About" },
  { href: "/what-i-build", label: "What I Build" },
  { href: "/projects", label: "Projects" },
  { href: "/resume", label: "Resume" },
] as const;
