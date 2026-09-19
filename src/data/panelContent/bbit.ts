import type { Panel } from "../contentBlocks";

/** BBIT: the degree as a ledger, and the change in how an ERP reads. */
export const bbitPanel: Panel = {
  id: "bbit",
  glance:
    "BBIT at Virtual University of Pakistan (VU). Chose the business half on purpose: accounting, finance, money and banking.",
  steps: ["Chose business over a second CS degree", "Started reading ERPs as accounts, not forms"],
  blocks: [
    { type: "hook", text: "I wanted to understand the business behind the software." },
    {
      type: "summary",
      text: "After the HDSE at Aptech, another CS or SE degree would have repeated what I already knew. So I chose the Bachelor of Business and Information Technology at Virtual University of Pakistan.",
    },
    {
      type: "ledger",
      hotspots: ["Highlights"],
      columns: [
        {
          title: "The CS side came back around",
          items: [
            "C++",
            "OOP",
            "Digital logic",
            "Gates and flip-flops",
            "Databases",
            "Software engineering",
          ],
          note: "These clicked quickly because I was already building.",
        },
        {
          title: "The business side was the interesting part",
          items: [
            "Accounting",
            "Finance",
            "Economics",
            "Money and banking",
            "Marketing",
            "Management",
            "Entrepreneurship",
            "Business maths",
            "Statistics",
          ],
        },
      ],
    },
    {
      type: "shift",
      text: "This changed how I read an ERP.",
      from: ["forms", "tables"],
      to: [
        "accounts",
        "transactions",
        "money movement",
        "inventory",
        "suppliers",
        "customers",
        "banking",
        "financial records",
      ],
    },
    { type: "jump", text: "Where that went: the ERP at NatureTech", chapterId: "naturetech" },
    {
      type: "memory",
      text: "I started VU Socials and Networking, a group where VU students from different cities could connect and keep track of what was happening. It still exists. It's a community group, not a startup.",
    },
  ],
};
