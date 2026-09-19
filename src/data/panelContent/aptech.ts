import type { Panel } from "../contentBlocks";

/** Aptech: a trophy shelf, the builds in order, and the competition board. */
export const aptechPanel: Panel = {
  id: "aptech",
  glance:
    "Advanced Diploma at Aptech NN2. Competitions, four awards, and my first paid client work alongside it.",
  steps: [
    "Music World, team lead in first semester",
    "Coke Studio clone, top 3 at Aptech Vision",
    "Nursing Management System, Project of the Month",
    "MERN e-commerce platform",
  ],
  blocks: [
    { type: "hook", text: "Where I stopped only learning and started building." },
    {
      type: "summary",
      text: "An Advanced Diploma at Aptech NN2. Three years of coursework, competitions and workshops, taken alongside my first paid client work.",
    },
    {
      type: "badge",
      badges: [
        {
          title: "Top 3, whole centre",
          detail: "Aptech Vision. Presented at Ramada Hotel.",
          major: true,
        },
        { title: "Project of the Month", detail: "Nursing Management System", major: true },
        { title: "Student of the Month", detail: "November 2022" },
        { title: "Student of the Month", detail: "January 2023" },
      ],
    },
    {
      type: "projectCard",
      title: "What I built there",
      cards: [
        {
          name: "Music World",
          descriptor: "A music listing platform with songs and artists.",
          tech: ["HTML", "CSS", "JavaScript", "Bootstrap"],
          did: ["Team lead, in my first semester."],
          note: "This is where I learned to coordinate a team while still learning to code myself.",
          hotspots: ["Highlights"],
        },
        {
          name: "Coke Studio clone",
          descriptor: "Built for Aptech Vision.",
          tech: ["HTML", "CSS", "JavaScript", "Bootstrap"],
          did: [
            "Selected top 3 from the entire centre.",
            "Presented it at Ramada Hotel to students and visitors.",
          ],
          award: "Top 3",
        },
        {
          name: "Nursing Management System",
          descriptor: "A healthcare platform, built while I was learning Laravel.",
          tech: ["Laravel"],
          award: "Project of the Month",
        },
        {
          name: "E-commerce platform",
          descriptor: "An e-commerce platform on the MERN stack.",
          tech: ["MongoDB", "Express", "React", "Node.js"],
        },
      ],
    },
    {
      type: "competition",
      hotspots: ["aptech/labs"],
      intro: "Three or four competitions in all. These are the ones that taught me the most.",
      entries: [
        {
          name: "TechWiz",
          text: "Our team built an e-commerce platform with no help from seniors.",
        },
        {
          name: "The four hour challenge",
          text: "Every team got a topic we didn't know and four hours to ship a site about it.",
        },
        {
          name: "Aptech Vision",
          text: "The Coke Studio clone. Top 3 across the centre.",
        },
      ],
      lessons: ["Scoping fast", "Splitting the work", "Debugging under pressure", "Finishing"],
    },
    {
      type: "memory",
      text: "The 14 August and 6 September events, Qawwali night, and a lot of presentations. Not achievements. Just the parts I remember.",
    },
    {
      type: "note",
      label: "Reference",
      text: "A teacher from Aptech can still act as a reference.",
    },
  ],
};
