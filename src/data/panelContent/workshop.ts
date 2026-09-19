import type { Panel } from "../contentBlocks";

/** The Workshop: a wall of cards, each flipping to its honest line. */
export const workshopPanel: Panel = {
  id: "workshop",
  glance: "Workshops and self-study, alongside everything else. Explored, not mastered.",
  blocks: [
    { type: "hook", text: "I kept clicking learn this too." },
    {
      type: "summary",
      text: "Things I explored through workshops and self-study. Explored, not mastered. Each card has the honest version on the back.",
    },
    {
      type: "skillCard",
      hotspots: ["Highlights"],
      cards: [
        { name: "SEO", line: "Including full campaigns, not just meta tags." },
        { name: "Digital marketing", line: "The side of a website that isn't code." },
        { name: "WordPress", line: "For when a site doesn't need a framework." },
        { name: "Shopify", line: "For when a shop doesn't need a custom build." },
        { name: "MERN", line: "Where the next ERP generation is heading." },
        { name: "React", line: "The R in MERN, and the thing under Next.js." },
        { name: "MongoDB", line: "The M in MERN." },
        { name: ".NET and C#", line: "Explored. Not mastered." },
        { name: "Dart and Flutter", line: "Built an app. Never finished it.", status: "built" },
        { name: "DevOps concepts", line: "The concepts, not the pager." },
        { name: "Agile", line: "Names for what teams were already doing." },
        { name: "Modern UI", line: "So business software doesn't have to look old." },
        { name: "Blender", line: "The donut, and a great many tutorials after it." },
        { name: "Three.js", line: "Models and interactive 3D on the web." },
        { name: "LLMs and model training", line: "Right now. Still open.", status: "now" },
      ],
    },
  ],
};
