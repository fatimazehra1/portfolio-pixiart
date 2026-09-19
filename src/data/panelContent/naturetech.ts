import type { Panel } from "../contentBlocks";

/** NatureTech: the ERP as the biggest object, branching into its versions. */
export const naturetechPanel: Panel = {
  id: "naturetech",
  glance:
    "Built a fully functional ERP in about three months: double-entry accounting, inventory, banking, production. FBR digital invoicing.",
  steps: [
    "FBR digital invoicing integration",
    "A full ERP in about three months",
    "Branched into Internal, POS and Full versions",
    "Next: a broader platform on MERN and Next.js",
  ],
  blocks: [
    {
      type: "hook",
      text: "I expected ordinary web work and found a business software ecosystem.",
    },
    {
      type: "summary",
      text: "NatureTech is a licensed FBR integrator. I worked on the technical side of digital invoicing integration through the FBR portal. Then I built the ERP.",
    },
    {
      type: "system",
      hotspots: ["Accounting", "Operations", "Platform"],
      core: {
        name: "The ERP",
        line: "Fully functional, built in about three months.",
        modules: [
          "Architecture",
          "Database design",
          "Chart of accounts",
          "Double-entry accounting",
          "Permissions",
          "Inventory",
          "Purchasing",
          "Sales",
          "Banking",
          "Invoices",
          "Production",
          "Reporting",
        ],
        footnote: "The real work was understanding the accounting, not drawing the screens.",
      },
      branches: [
        { name: "Internal ERP", line: "Modal-driven UI, used internally." },
        { name: "POS ERP", line: "Built around point of sale." },
        { name: "Full ERP", line: "The complete module set." },
      ],
      next: {
        name: "Next generation",
        line: "Moving toward a much broader business platform on MERN, Next.js and MongoDB, expanding into CRM and HRMS. Odoo-scale in ambition, and still being built.",
      },
    },
    {
      type: "techStack",
      stack: {
        backend: ["Laravel", "PHP"],
        database: ["MySQL", "MongoDB (next generation)"],
        frontend: ["Next.js (next generation)"],
        integrations: ["FBR digital invoicing"],
        architecture: ["Double-entry accounting", "Chart of accounts", "Role permissions"],
      },
    },
    { type: "jump", text: "Why the accounting made sense: BBIT at VU", chapterId: "bbit" },
  ],
};
