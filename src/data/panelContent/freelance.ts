import type { Panel } from "../contentBlocks";

/**
 * Freelance: the shape of the work, as a conversation.
 *
 * The client lines are the general shape of the requests, not quotes from a
 * named client, and the caption says so.
 */
export const freelancePanel: Panel = {
  id: "freelance",
  glance:
    "Independent websites, e-commerce and dashboards as a student. Clients directly, no senior to hand things to.",
  blocks: [
    { type: "hook", text: "Sometimes there wasn't a senior sitting next to me." },
    {
      type: "summary",
      text: "Independent work as a student and a young developer. Websites, e-commerce, dashboards and smaller builds.",
    },
    {
      type: "exchange",
      caption: "Roughly how every project went",
      hotspots: ["Highlights"],
      turns: [
        { from: "client", text: "We need a website. Like that one, but ours." },
        {
          from: "me",
          text: "I asked questions until \"like that one\" meant something.",
          lesson: "Reading unclear requirements, talking to clients directly",
        },
        { from: "client", text: "How long, and how much?" },
        {
          from: "me",
          text: "I gave a number. Then I learned to give better ones.",
          lesson: "Estimating and scoping",
        },
        { from: "client", text: "Something's broken." },
        {
          from: "me",
          text: "Nobody to ask. Found it, fixed it.",
          lesson: "Fixing things alone",
        },
        { from: "client", text: "Can we also add a shop? And a dashboard?" },
        {
          from: "me",
          text: "Delivered anyway.",
          lesson: "Delivering when scope moved",
        },
      ],
    },
  ],
};
