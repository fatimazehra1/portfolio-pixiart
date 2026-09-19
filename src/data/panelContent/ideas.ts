import type { Panel } from "../contentBlocks";

/**
 * Loop2Tech & Ideas: one island, two places. The studio as a blueprint, then
 * the tent, with its own hook, as a desk of experiments.
 *
 * Loop2Tech is presented as something being built, not an established company.
 */
export const ideasPanel: Panel = {
  id: "ideas",
  glance:
    "Co-building Loop2Tech, a white-label engineering studio. My side: full stack, ERP, architecture, requirements.",
  steps: ["Loop2Tech, being built with my co-founders", "Experiments on the side"],
  blocks: [
    { type: "hook", text: "Now I'm trying to build the company too." },
    {
      type: "summary",
      text: "Loop2Tech is a technology studio I'm building with my co-founders, focused on helping businesses and agencies turn ideas into working products.",
    },
    {
      type: "blueprint",
      hotspots: ["ideastent/bulb"],
      stamp: "Under construction",
      rooms: [
        {
          label: "The model",
          text: "White-label engineering. Teams bring us work when they need extra engineering capacity.",
        },
        {
          label: "My side",
          text: "Engineering: full stack, ERP, architecture and requirements.",
        },
        {
          label: "What it's teaching me",
          text: "To think about technology as a business, not only as code.",
        },
      ],
    },
    { type: "divider", label: "The Ideas tent" },
    { type: "hook", text: "Not everything needs a reason to exist.", small: true },
    {
      type: "desk",
      hotspots: ["Highlights"],
      caption: "Some of it is just wanting to know whether I could do it.",
      items: [
        { name: "Three.js", line: "3D in the browser." },
        { name: "Blender", line: "Models, and far too many tutorials." },
        { name: "Interactive web", line: "Things that react when you poke them." },
        { name: "AI-assisted development", line: "How far it goes, and where it stops." },
        { name: "Frontend experiments", line: "How the browser really behaves." },
        { name: "Unusual UI concepts", line: "Interfaces that probably shouldn't work." },
        { name: "ERP ideas", line: "Business software, rethought on paper first." },
        { name: "Technical writing", line: "Explaining what I built, for whoever is next." },
      ],
    },
  ],
};
