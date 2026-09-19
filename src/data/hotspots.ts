/**
 * What each marked part of a building says when it is pressed.
 *
 * Keyed `building/spot`, matching the ids in each building's renderer. A
 * callout is short on purpose: a title, a line or three, maybe a row of tags.
 * It is the thing you learn *by poking the building*, and it points at the
 * panel for the rest.
 *
 * `open` is what "Show in the panel" opens (a key a panel block answers to in
 * its `hotspots`). Omitted, it falls back to the spot's own `section`; `null`
 * means there is nothing further in the panel to show.
 *
 * Same rules as the panels: first person, plain, nothing that is not in the
 * brief or the committed chapter data.
 */
export interface HotspotCallout {
  title: string;
  lines: readonly string[];
  chips?: readonly string[];
  open?: string | null;
}

export const HOTSPOT_CALLOUTS: Record<string, HotspotCallout> = {
  // --- Aptech ------------------------------------------------------------------
  "aptech/gate": {
    title: "Aptech NN2",
    lines: [
      "Advanced Diploma, three years.",
      "Coursework, competitions and workshops, alongside my first paid client work.",
    ],
  },
  "aptech/labs": {
    title: "The competition floor",
    lines: [
      "TechWiz: an e-commerce platform with no help from seniors.",
      "Another round: a topic we didn't know and four hours to ship a site.",
    ],
    chips: ["Scoping fast", "Splitting the work", "Debugging under pressure", "Finishing"],
    open: "aptech/labs",
  },
  "aptech/projects": {
    title: "First projects",
    lines: [
      "Music World: team lead in my first semester.",
      "Coke Studio clone: top 3 across the whole centre.",
      "Nursing Management System: Project of the Month.",
    ],
  },

  // --- Freelance ---------------------------------------------------------------
  "cottage/desk": {
    title: "Freelance builds",
    lines: [
      "Websites, e-commerce, dashboards and smaller builds.",
      "As a student, with no senior to hand the hard parts to.",
    ],
  },
  "cottage/mailbox": {
    title: "Clients, directly",
    lines: [
      "Requirements came straight from the client, and they were rarely clear.",
      "I asked until \"like that one, but ours\" meant something.",
    ],
  },
  "cottage/chimney": {
    title: "What it taught",
    lines: ["The parts of the job nobody teaches in a classroom."],
    chips: ["Reading requirements", "Estimating", "Scoping", "Fixing things alone", "Moving scope"],
  },

  // --- Planet01 ----------------------------------------------------------------
  "planet01/cta": {
    title: "CTA World",
    lines: [
      "Four portals on one Laravel API: superadmin, partner, employee and customer.",
      "Roughly a year, largely solo. Where I started seeing a product as one system.",
    ],
    chips: ["Laravel", "Vue.js", "MySQL", "PayPal", "Pusher"],
  },
  "planet01/dominos": {
    title: "Domino's rider dashboard",
    lines: ["An operational dashboard and the backend behind it."],
    chips: ["Laravel", "APIs", "Sanctum", "Multi-tenancy"],
  },
  "planet01/crypto": {
    title: "Crypto trading frontend",
    lines: ["The interface for a crypto trading platform, built against an API someone else owned."],
    open: null,
  },
  "planet01/catering": {
    title: "First client deployment",
    lines: [
      "A catering website in Laravel, built with a senior.",
      "I did the backend, the dashboard, the migrations and the business logic.",
      "The first time my code left localhost.",
    ],
  },

  // --- Vaulsys ----------------------------------------------------------------
  "vaultsys/payments": {
    title: "Change requests",
    lines: [
      "Established enterprise systems for Rawbank, through Vaulsys.",
      "Change requests, not greenfield projects.",
    ],
    chips: ["Java", "Spring Boot", "Hibernate", "Vaadin"],
  },
  "vaultsys/onboarding": {
    title: "Oracle SQL",
    lines: [
      "Queries written against real banking systems.",
      "By the end I was comfortable enough with it that it genuinely surprised me.",
    ],
  },
  "vaultsys/running": {
    title: "The server room",
    lines: [
      "Dedicated servers in the room, virtual machines on Linux, strict data handling.",
      "By the end, two or three production deploys in a day was routine.",
    ],
  },

  // --- NatureTech --------------------------------------------------------------
  "naturetech/accounting": {
    title: "The accounting core",
    lines: [
      "Chart of accounts and double-entry accounting, with banking and invoices on top.",
      "The real work was understanding the accounting, not drawing the screens.",
    ],
  },
  "naturetech/operations": {
    title: "Operations",
    lines: ["Inventory, purchasing, sales and production, in one ERP built in about three months."],
  },
  "naturetech/platform": {
    title: "Permissions and versions",
    lines: [
      "Permissions and reporting across every module.",
      "Then it branched: an Internal ERP, a POS ERP and the Full ERP.",
    ],
  },

  // --- BBIT --------------------------------------------------------------------
  "bbit/clock": {
    title: "VU, in progress",
    lines: [
      "Bachelor of Business and Information Technology at Virtual University of Pakistan.",
      "Taken alongside full time work.",
    ],
  },
  "bbit/crest": {
    title: "Why business",
    lines: [
      "Another CS degree would have repeated what I already knew.",
      "Accounting, finance, money and banking turned out to be the interesting part.",
    ],
  },
  "bbit/late": {
    title: "The window still lit",
    lines: [
      "Where an ERP stopped looking like forms and tables and started looking like accounts and transactions.",
      "Also where VU Socials and Networking started. It still exists.",
    ],
  },

  // --- Workshop ----------------------------------------------------------------
  "workshop/terminal": {
    title: "Three.js and the web",
    lines: ["Models and interactive 3D on the web.", "Curiosity, not production work."],
  },
  "workshop/easel": {
    title: "Interface and product design",
    lines: ["Modern UI, through workshops and self-study.", "Next to it: SEO, WordPress and Shopify."],
  },
  "workshop/rack": {
    title: "The bench still in use",
    lines: ["LLMs and model training.", "The one I'm on right now."],
  },

  // --- Loop2Tech & Ideas -------------------------------------------------------
  "ideastent/bench": {
    title: "On the bench",
    lines: [
      "Three.js, Blender, interactive web and frontend experiments.",
      "Some of it is just wanting to know whether I could do it.",
    ],
  },
  "ideastent/bulb": {
    title: "Loop2Tech",
    lines: [
      "A technology studio I'm building with my co-founders.",
      "White-label engineering, for teams that need extra capacity.",
    ],
    open: "ideastent/bulb",
  },
  "ideastent/shade": {
    title: "Left open",
    lines: ["ERP ideas, unusual UI concepts and technical writing.", "Not everything needs a reason to exist."],
  },
};

export const calloutKey = (buildingId: string, spotId: string) => `${buildingId}/${spotId}`;
