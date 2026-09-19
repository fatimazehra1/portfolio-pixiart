import { PROFILE } from "./chapters";

/**
 * The recruiter path: everything essential, with nothing to discover.
 *
 * Shown on the hub's sidebar without a click, and behind the one plain
 * "Contact" button that is on screen everywhere else. Every line here is also
 * said on an island; this is the same facts, flattened for a skim.
 */
export const RECRUITER = {
  /** The sidebar's third line, under the name and the title. */
  nowShort: "Now at NatureTech, Karachi",
  now: "Software Engineer at NatureTech, building ERP and business software.",
  also: "Also co-building Loop2Tech, a white-label engineering studio.",
  /** Read from the sidebar's own stat, so the two cannot disagree. */
  years: PROFILE.stats.find((stat) => stat.label === "Years")?.value ?? "",
  stack: {
    backend: ["Laravel", "PHP", "Java", "Spring Boot"],
    frontend: ["Vue.js", "React", "Next.js"],
    database: ["MySQL", "Oracle SQL", "MongoDB"],
  },
  work: [
    {
      name: "ERP, NatureTech",
      line: "Full ERP in about three months. Double-entry accounting, inventory, banking, production. Three versions.",
    },
    {
      name: "CTA World, Planet01",
      line: "Four portals on one Laravel API. Roughly a year, largely solo.",
    },
    {
      name: "Rawbank systems, via Vaulsys",
      line: "Java, Spring Boot, Oracle SQL. Enterprise change requests, deployed to production routinely.",
    },
    {
      name: "14th Street Pizza, Domino's",
      line: "Backend and API heavy Laravel work.",
    },
  ],
  enterprise:
    "ERP and double-entry accounting, FBR digital invoicing integration, enterprise banking systems.",
} as const;
