/**
 * The resume, as data. **This is the file to edit for the document at /resume.**
 *
 * # Why this is not `data/chapters.ts`
 * That file is the *map*: nine islands, each a chapter with a headline, a
 * palette and a place in the sky. This is a resume, and a resume is a
 * different document with different rules. Every role carries a company, a
 * city and a dated span, the wording is the wording a recruiter and an
 * applicant tracking system will read, and nothing in it is allowed to be
 * shaped by what fits on a card. Sharing one structure between them meant one
 * of the two was always slightly wrong.
 *
 * # House style
 * No em dashes anywhere. Separators are a pipe, ranges are written "2025 to
 * 2026", and a compound sentence takes a comma or a full stop. Parsers split
 * on the characters they know, and this is the set they know.
 */

/** One dated position. */
export interface ResumeRole {
  title: string;
  company: string;
  location: string;
  /** As written: "Apr 2026 to Present". */
  period: string;
  /** ISO start, for `<time dateTime>` and for the schema. */
  start: string;
  /** ISO end. Omitted while the role is current. */
  end?: string;
  /** One or two sentences: the scope of the job. */
  summary: string;
  /** What was actually built. Omitted where the summary is the whole of it. */
  bullets?: readonly string[];
  /** The stack, as one line rather than a row of pills. */
  stack?: string;
}

/** One qualification. */
export interface ResumeStudy {
  qualification: string;
  institution: string;
  period: string;
  start: string;
  end?: string;
  bullets?: readonly string[];
}

/** One labelled group of skills. */
export interface SkillGroup {
  label: string;
  items: string;
}

export const RESUME = {
  name: "Fatima Zehra Shakeel",
  title: "Full Stack Developer & ERP Engineer",
  location: "Karachi, Pakistan",
  email: "fatima.shakeel1521@gmail.com",

  /**
   * Profile links.
   *
   * **Fill these in.** A `#` is a placeholder: the page renders the label as
   * plain text rather than as a link to itself, and the schema's `sameAs`
   * leaves it out entirely, so an unfilled URL is invisible rather than wrong.
   */
  profiles: [
    { label: "LinkedIn", href: "#" }, // TODO(fill in): LinkedIn URL
    { label: "GitHub", href: "#" }, // TODO(fill in): GitHub URL
  ],

  summary:
    "Full stack developer and ERP engineer with over four years of production experience across ERP, logistics and financial systems. Currently the sole engineer building a multi-tenant ERP designed to onboard more than 50 client tenants, covering accounting, inventory, purchasing, sales, production, banking and permissions. Previously delivered payment and KYC infrastructure in Java and Spring Boot for Pakistan's largest payment application and one of Africa's largest banks. Comfortable owning a system end to end, from database design through business logic to the interface.",

  experience: [
    {
      title: "Software Engineer",
      company: "NatureTech (SoftSol)",
      location: "Karachi",
      period: "Apr 2026 to Present",
      start: "2026-04",
      summary:
        "Sole engineer on a multi-tenant enterprise ERP replacing a legacy Microsoft Access system, built to serve more than 50 client tenants.",
      bullets: [
        "Designed and implemented double-entry accounting across the Chart of Accounts, purchase invoices and sale invoices",
        "Built the party ledger with print output and an Excel bulk import pipeline with duplicate rejection and inline validation summaries",
        "Architected the permissions layer as a matrix-style roles and permissions interface using Spatie",
        "Built a generalised CRUD controller adopted across every module, cutting the cost of adding new entities",
        "Delivered the sale invoice module, consumption and production index, and reporting dashboards",
      ],
      stack: "Laravel, Next.js, Nest.js, MySQL, Vue, Inertia",
    },
    {
      title: "Co-Founder",
      company: "Loop2Tech",
      location: "Karachi",
      period: "2026 to Present",
      start: "2026",
      summary:
        "Co-founded a technology studio delivering web applications, mobile apps and e-commerce products. The founding team has shipped more than 30 projects across industries.",
    },
    {
      title: "Software Engineer",
      company: "Vaultsys",
      location: "Karachi",
      period: "2025 to 2026",
      start: "2025",
      end: "2026",
      summary:
        "Backend engineer on financial infrastructure supporting NayaPay, Pakistan's largest payment application. Allocated to the delivery team for RawBank, the largest bank in the Democratic Republic of Congo.",
      bullets: [
        "Built and maintained production payment and cash flow systems",
        "Implemented and supported customer KYC workflows",
        "Diagnosed production issues through Oracle SQL query analysis",
        "Owned ongoing deployments and system maintenance",
        "Onboarded a colleague new to Java through pairing and code review",
      ],
      stack: "Java, Vaadin, Spring Boot, Hibernate, Oracle SQL",
    },
    {
      title: "Full Stack Developer",
      company: "Planet01",
      location: "Karachi",
      period: "Feb 2023 to Jun 2025",
      start: "2023-02",
      end: "2025-06",
      summary:
        "Joined as an intern and promoted to full-stack developer. Delivered client platforms across several stacks while working directly with stakeholders on requirements.",
      bullets: [
        "Sole developer on CTAWORLD, a logistics platform comprising a Laravel superadmin portal and API layer plus three Vue.js dashboards for partner companies, subscribers and their employees",
        "Implemented real-time chat via Pusher and integrated Stripe and PayPal",
        "Built a custom rider operations dashboard for Domino's in Laravel with an SCSS component system",
        "Delivered a catering platform end to end, including admin dashboard and public site",
        "Built the frontend for a cryptocurrency trading platform",
        "Trained and mentored two interns",
      ],
      stack: "Laravel, Vue.js, React, Node.js, Angular, Flutter, MySQL, SCSS",
    },
    {
      title: "Freelance Web Developer",
      company: "",
      location: "Karachi",
      period: "2022 to 2023",
      start: "2022",
      end: "2023",
      summary:
        "Delivered client websites end to end, handling requirements, build and revisions directly with clients.",
      stack: "Laravel, PHP, MySQL, JavaScript",
    },
  ] as readonly ResumeRole[],

  education: [
    {
      qualification: "Bachelor of Business Information Technology",
      institution: "Virtual University of Pakistan",
      period: "2025 to Present",
      start: "2025",
    },
    {
      qualification: "Advanced Diploma in Software Engineering",
      institution: "Aptech",
      period: "2021 to 2023",
      start: "2021",
      end: "2023",
      bullets: [
        "Placed top three at Aptech Vision for a music streaming platform",
        "Team lead at TechWiz, a three day on-site build challenge, delivering an e-commerce platform",
        "Built a restaurant website with a partner in a four hour design sprint",
      ],
    },
  ] as readonly ResumeStudy[],

  skills: [
    { label: "Backend", items: "Laravel, PHP, Java, Spring Boot, Hibernate, Node.js, Nest.js" },
    { label: "Frontend", items: "Vue.js, React, Next.js, Inertia, Angular, JavaScript, SCSS" },
    { label: "Databases", items: "MySQL, Oracle SQL, MongoDB" },
    {
      label: "Domains",
      items:
        "Multi-tenant architecture, double-entry accounting, ERP systems, payment integration, KYC workflows, real-time systems",
    },
    { label: "Other", items: "Flutter, Git, REST API design, Pusher, Stripe, PayPal" },
  ] as readonly SkillGroup[],
} as const;

/** A `#` is a placeholder, not a destination. */
export const isRealLink = (href: string) => href !== "#" && !href.startsWith("mailto:");
