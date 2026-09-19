import type { Panel } from "../contentBlocks";

/**
 * Vaulsys: the server room. Dark body, spec sheet, a terminal that types.
 *
 * Wording matters here. I was assigned to Rawbank's systems *through*
 * Vaulsys, and was never a Rawbank employee. NayaPay is exposure and
 * assistance, with no ownership claimed.
 */
export const vaultsysPanel: Panel = {
  id: "vaulsys",
  tone: "server",
  glance:
    "Outsourced to Vaulsys. Java, Spring Boot and Oracle SQL on Rawbank's banking systems, deploying to production routinely.",
  steps: [
    "About fifteen days to learn Java",
    "Assigned to Rawbank's systems through Vaulsys",
    "Change requests, production bugs, Oracle queries",
    "Two or three production deploys a day",
  ],
  blocks: [
    { type: "hook", text: "15 days to learn Java. Then banking." },
    {
      type: "summary",
      text: "Planet01 outsourced me to Vaulsys as a dedicated engineering resource. I had about fifteen days to learn enough Java to join. Then I was assigned, through Vaulsys, to systems for Rawbank, the largest commercial bank in the Democratic Republic of Congo.",
    },
    {
      type: "specs",
      title: "The room",
      rows: [
        { key: "Servers", value: "Dedicated, in the room, for data security" },
        { key: "Machines", value: "Virtual machines on Linux" },
        { key: "Data", value: "Strict handling" },
        { key: "Codebase", value: "Established enterprise systems" },
        { key: "Work", value: "Change requests, not greenfield projects" },
      ],
      note: "Around me were engineers with bachelor's and master's degrees and years of enterprise experience. I was just starting my own degree.",
      hotspots: ["Payments and cash flow", "Customer onboarding and KYC", "Running it"],
    },
    {
      type: "terminal",
      title: "a normal week, by the end",
      animate: true,
      lines: [
        { cmd: "new change request", out: "implemented" },
        { cmd: "production bug", out: "investigated" },
        { cmd: "oracle query", out: "written" },
        { cmd: "deploy", out: "done" },
      ],
    },
    {
      type: "milestone",
      label: "By the end",
      text: "Deploying to production two or three times in a day was routine. I got comfortable enough with Oracle SQL that it genuinely surprised me, and I knew the databases, portals and banking logic behind them.",
    },
    {
      type: "techStack",
      stack: {
        frontend: ["Vaadin"],
        backend: ["Java", "Spring Boot", "Hibernate"],
        database: ["Oracle SQL"],
        infrastructure: ["Linux", "Virtual machines"],
      },
    },
    {
      type: "note",
      label: "NayaPay",
      text: "I also had exposure to and assisted alongside developers working on NayaPay's backend.",
    },
    {
      type: "memory",
      text: "I helped a colleague who was a graduate but new to Java. Explaining it, debugging with her and supporting her learning was the first time I noticed that knowing something and being able to teach it are different skills.",
    },
  ],
};
