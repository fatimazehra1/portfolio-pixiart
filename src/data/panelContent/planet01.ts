import type { Panel } from "../contentBlocks";

/** Planet01: the career as a rail of projects, CTA World the biggest stop on it. */
export const planet01Panel: Panel = {
  id: "planet01",
  glance:
    "Full stack, in production. Laravel and Vue. CTA World: four portals on one API, roughly a year, largely solo.",
  steps: [
    "Learning Laravel",
    "First client deployment",
    "MetaMax",
    "SEHA",
    "Multi-tenant PWA",
    "CTA World",
    "Domino's rider dashboard",
    "14th Street Pizza",
  ],
  blocks: [
    { type: "hook", text: "My code finally left localhost." },
    {
      type: "summary",
      text: "I arrived knowing a lot of languages and almost nothing about production. I left knowing how to build software other people run.",
    },
    {
      type: "timeline",
      title: "In order",
      nodes: [
        {
          title: "Learning Laravel",
          line: "My senior handed me a Traversy Media playlist and I built along with it.",
        },
        {
          title: "First client deployment",
          line: "A catering website in Laravel, built with a senior.",
          milestone: "The first time my code left localhost.",
          detail: [
            "I did the backend, the dashboard, the migrations and the business logic.",
            "We deployed it and the client was happy.",
            "The site isn't live any more, so there's no link.",
          ],
          tech: ["Laravel"],
          hotspots: ["Catering platform"],
        },
        {
          title: "MetaMax",
          line: "A static but heavily animated site in Vue, blue theme, with an animation library.",
          takeaway:
            "It taught me that frontend is about interactions and browser behaviour, not just displaying data.",
          tech: ["Vue.js"],
        },
        {
          title: "SEHA",
          line: "Frontend revamp of a Saudi healthcare CMS.",
          takeaway:
            "My first real experience working inside an existing client system instead of building something new.",
        },
        {
          title: "In-house product",
          line: "A multi-tenant PWA. I built the tenant-facing frontend.",
          takeaway: "My first exposure to multi-tenant thinking.",
          tech: ["PWA", "Multi-tenancy"],
        },
        {
          title: "CTA World",
          line: "Roughly a year, largely solo, while running other projects alongside it.",
          major: true,
          detail: [
            "Four portals: superadmin, partner, employee and customer.",
            "A Laravel backend and the API layer the portals run on.",
            "Vue portals on top, MySQL underneath.",
            "PayPal, Pusher chat, shipment management and tracking, news and blogs.",
          ],
          takeaway:
            "The point isn't the page count. This is where I started thinking about a product as one whole system.",
          stack: {
            frontend: ["Vue.js"],
            backend: ["Laravel", "REST API"],
            database: ["MySQL"],
            integrations: ["PayPal", "Pusher"],
            architecture: ["Four role-based portals, one API"],
          },
          hotspots: ["CTA World"],
        },
        {
          title: "Domino's rider dashboard",
          line: "An operational dashboard and the backend work behind it.",
          tech: ["Laravel", "APIs", "Sanctum", "Multi-tenancy"],
          hotspots: ["Domino's rider dashboard"],
        },
        {
          title: "14th Street Pizza",
          line: "Backend heavy. A large backend with a lot of data, business logic and integrations.",
          tech: ["Laravel", "APIs"],
        },
      ],
    },
    {
      type: "terminal",
      title: "14th Street Pizza",
      lines: [
        { cmd: "php artisan route:list | wc -l", out: "enough that I stopped counting" },
        { cmd: "php artisan route:list --path=api", out: "(still scrolling)" },
        { cmd: "php artisan make:controller", out: "one more endpoint" },
      ],
      caption: "Many endpoints, a lot of data, business logic and integrations.",
    },
    {
      type: "techStack",
      title: "What Planet01 ran on",
      stack: {
        frontend: ["Vue.js", "PWA"],
        backend: ["Laravel", "PHP", "REST APIs", "Sanctum"],
        database: ["MySQL"],
        integrations: ["PayPal", "Pusher"],
        architecture: ["Multi-tenancy", "Role-based portals"],
      },
    },
    {
      type: "memory",
      text: "On the side: Blender, including the donut and a great many tutorials, then Three.js models and experiments with interactive 3D on the web. Curiosity, not production work.",
    },
  ],
};
