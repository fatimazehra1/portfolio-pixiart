import type { Metadata } from "next";
import Link from "next/link";
import PrintButton from "@/components/ui/PrintButton";
import { SITE } from "@/data/chapters";
import { RESUME, isRealLink } from "@/data/resume";
import type { ResumeRole, ResumeStudy } from "@/data/resume";

/**
 * The resume: a document, not a scene.
 *
 * # What this page is for
 * It is the page a recruiter opens, the page that prints to a clean A4 PDF,
 * and the page a crawler and an applicant tracking system actually read. So
 * there is no canvas here, nothing from the game, and no styling a text
 * extractor has to see through: one column, one typeface, real headings, real
 * lists, and a dated `<time>` on every span.
 *
 * The pixel world is allowed exactly one gesture, in the stepped rule under
 * the name, and it carries no information. Everything below it is a resume.
 *
 * # Where the words come from
 * `data/resume.ts`, and nowhere else. The map's `data/chapters.ts` describes
 * nine islands; this describes a career, and the two are written differently
 * on purpose.
 */

const TITLE = `${RESUME.name} | ${RESUME.title} Resume`;
const DESCRIPTION =
  "Resume of Fatima Zehra Shakeel, full-stack developer in Karachi with over four years across multi-tenant ERP, logistics and fintech systems in Laravel, Vue, Next.js and Java.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [...SITE.keywords],
  alternates: { canonical: "/resume" },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/resume",
    type: "profile",
    images: [
      { url: SITE.ogImage, width: 1200, height: 630, alt: `${RESUME.name}, ${RESUME.title}` },
    ],
  },
};

export default function ResumePage() {
  /**
   * Person schema: the same facts as the markup, in the form a search engine
   * indexes rather than renders. Employers come from the undated-end roles and
   * schools from the education list, so it cannot drift from the page.
   */
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: RESUME.name,
    jobTitle: RESUME.title,
    description: RESUME.summary,
    url: `${SITE.url}/resume`,
    email: `mailto:${RESUME.email}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Karachi",
      addressRegion: "Sindh",
      addressCountry: "PK",
    },
    worksFor: RESUME.experience
      .filter((role) => !role.end && role.company)
      .map((role) => ({ "@type": "Organization", name: role.company })),
    alumniOf: RESUME.education.map((study) => ({
      "@type": "EducationalOrganization",
      name: study.institution,
    })),
    knowsAbout: RESUME.skills.flatMap((group) => group.items.split(", ")),
    sameAs: RESUME.profiles.filter((link) => isRealLink(link.href)).map((link) => link.href),
  };

  return (
    <div className="page">
      <style>{CSS}</style>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />

      <main className="sheet">
        <header className="head">
          <h1>{RESUME.name}</h1>
          <p className="role">{RESUME.title}</p>
          <p className="meta">
            <span>{RESUME.location}</span>
            <span className="sep" aria-hidden>
              |
            </span>
            <a href={`mailto:${RESUME.email}`}>{RESUME.email}</a>
            {RESUME.profiles.map((profile) => (
              <span key={profile.label}>
                <span className="sep" aria-hidden>
                  |
                </span>
                {isRealLink(profile.href) ? (
                  <a href={profile.href} rel="me noreferrer" target="_blank">
                    {profile.label}
                  </a>
                ) : (
                  // An unfilled URL is written out as plain text rather than
                  // shipped as a link back to this page.
                  <span>{profile.label}</span>
                )}
              </span>
            ))}
          </p>
          {/* The one pixel gesture on the page, and it says nothing: a hard
              stepped rule where a hairline would go. */}
          <div className="rule" aria-hidden />
          <PrintButton />
        </header>

        <section aria-labelledby="summary">
          <h2 id="summary">Summary</h2>
          <p className="lede">{RESUME.summary}</p>
        </section>

        <section aria-labelledby="experience">
          <h2 id="experience">Experience</h2>
          {RESUME.experience.map((role) => (
            <Role key={`${role.title}${role.company}`} role={role} />
          ))}
        </section>

        <section aria-labelledby="education">
          <h2 id="education">Education</h2>
          {RESUME.education.map((study) => (
            <Study key={study.qualification} study={study} />
          ))}
        </section>

        <section aria-labelledby="skills">
          <h2 id="skills">Technical Skills</h2>
          <dl className="skills">
            {RESUME.skills.map((group) => (
              <div key={group.label} className="skill-row">
                <dt>{group.label}</dt>
                <dd>{group.items}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="foot">
          <Link href="/">Explore the interactive career map</Link>
        </footer>
      </main>
    </div>
  );
}

/**
 * One role. `<article>` because it is a complete record on its own, and the
 * whole of it is held off a page break so a job never splits across sheets.
 */
function Role({ role }: { role: ResumeRole }) {
  const heading = role.company ? `${role.title}, ${role.company}` : role.title;

  return (
    <article className="entry">
      <div className="entry-head">
        <h3>{heading}</h3>
        <p className="when">
          <span>{role.location}</span>
          <span className="sep" aria-hidden>
            |
          </span>
          <time dateTime={role.start}>{role.period}</time>
        </p>
      </div>

      <p className="scope">{role.summary}</p>

      {role.bullets && (
        <ul>
          {role.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}

      {role.stack && <p className="stack">{role.stack}</p>}
    </article>
  );
}

/** One qualification. The same shape as a role, without the stack line. */
function Study({ study }: { study: ResumeStudy }) {
  return (
    <article className="entry">
      <div className="entry-head">
        <h3>{study.qualification}</h3>
        <p className="when">
          <time dateTime={study.start}>{study.period}</time>
        </p>
      </div>
      <p className="scope">{study.institution}</p>
      {study.bullets && (
        <ul>
          {study.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

/**
 * The whole stylesheet, inline, so the document is one request's worth of work.
 *
 * Two rules govern all of it. On screen: one 800px column, one sans serif, and
 * a consistent vertical rhythm. In print: A4 with real margins, black on
 * white, no backgrounds to drink a cartridge, and `break-inside: avoid` on
 * every entry so a role is never cut in half.
 */
const CSS = `
.page {
  --ink: #14181f;
  --soft: #4d5865;
  --line: #d9dee5;
  --accent: #c9913f;
  /* The world's own ground, so arriving here from the map is not a change of
     site. The sheet on top of it stays near-white, because a resume is read
     and a tinted page is read more slowly. */
  --ground: #f5ecd7;
  --paper: #fffdf8;
  --frame: #241c12;
  --brass: #c9913f;
  min-height: 100dvh;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-sans), "Helvetica Neue", Arial, sans-serif;
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
/*
 * The sheet, as one of the world's panels: square corners, a hard two-tone
 * border, an offset shadow with no blur in it. The same three rules
 * .ui-plaque is built from, so the document reads as the same object the
 * map hangs on a wall — and not one of them costs legibility, because they are
 * all outside the text.
 */
.sheet {
  max-width: 800px;
  margin: 2.5rem auto 4rem;
  padding: 0 2.5rem 3.5rem;
  background: var(--paper);
  border: 2px solid var(--frame);
  box-shadow:
    0 0 0 2px #06090f,
    8px 8px 0 0 rgb(36 28 18 / 0.22);
}
/* The brass band across the top of the sheet: the plaque's header, flattened
   into a rule, carrying no information and needing none. */
.sheet::before {
  content: "";
  display: block;
  margin: 0 -2.5rem 2.75rem;
  height: 10px;
  background: var(--brass);
  border-bottom: 2px solid var(--frame);
}
.page a { color: inherit; text-underline-offset: 2px; }

/* Header */
.head h1 {
  margin: 0;
  font-family: var(--font-display), var(--font-sans), sans-serif;
  font-size: 2.125rem;
  line-height: 1.1;
  letter-spacing: 0.01em;
}
.role {
  margin: 0.5rem 0 0;
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--soft);
}
.meta {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: var(--soft);
}
.sep { padding: 0 0.5rem; color: var(--line); }
.rule {
  margin: 1.25rem 0 0;
  height: 4px;
  /* Hard stops, no gradient: four pixels of the world's brass, stepped. */
  background: repeating-linear-gradient(90deg, var(--accent) 0 8px, transparent 8px 16px);
}
.print-button {
  margin-top: 1.25rem;
  border: 2px solid var(--ink);
  border-radius: 0;
  background: #ffffff;
  color: var(--ink);
  padding: 0.45rem 0.9rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}
.print-button:hover { background: var(--ink); color: #ffffff; }

/* Sections */
.sheet section { margin-top: 2.5rem; }
.sheet h2 {
  margin: 0 0 1.25rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--line);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--soft);
}
.lede { margin: 0; max-width: 68ch; }

/* Entries */
.entry { margin-bottom: 1.75rem; break-inside: avoid; page-break-inside: avoid; }
.entry:last-child { margin-bottom: 0; }
.entry-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem 1.5rem;
  align-items: baseline;
  justify-content: space-between;
}
.entry h3 { margin: 0; font-size: 1rem; font-weight: 700; }
.when {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--soft);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.scope { margin: 0.35rem 0 0; color: var(--soft); max-width: 72ch; }
.entry ul {
  margin: 0.6rem 0 0;
  padding-left: 1.15rem;
  list-style: disc;
  max-width: 72ch;
}
.entry li { margin-top: 0.3rem; }
.stack { margin: 0.6rem 0 0; font-size: 0.8125rem; color: var(--soft); }

/* Skills */
.skills { margin: 0; }
.skill-row {
  display: grid;
  grid-template-columns: 7.5rem 1fr;
  gap: 0 1rem;
  padding: 0.3rem 0;
  break-inside: avoid;
}
.skill-row dt { font-weight: 700; font-size: 0.875rem; }
.skill-row dd { margin: 0; color: var(--soft); }

.foot {
  margin-top: 3rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--line);
  font-size: 0.875rem;
  color: var(--soft);
}

@media (max-width: 640px) {
  .sheet { margin: 0; padding: 0 1.25rem 2.5rem; border-left: 0; border-right: 0; box-shadow: none; }
  .sheet::before { margin: 0 -1.25rem 2rem; }
  .skill-row { grid-template-columns: 1fr; }
}

@media print {
  @page { size: A4; margin: 14mm 15mm; }
  .page {
    min-height: 0;
    background: #ffffff;
    color: #000000;
    font-size: 10pt;
    line-height: 1.4;
  }
  /* Nothing of the panel survives onto paper: no ground, no frame, no
     shadow, no brass. A printer asked to lay down a border and a shadow
     produces a worse document and a lighter cartridge. */
  .sheet {
    max-width: none;
    margin: 0;
    padding: 0;
    background: #ffffff;
    border: 0;
    box-shadow: none;
  }
  .sheet::before { display: none; }
  .page a { color: #000000; text-decoration: none; }
  .head h1 { font-size: 20pt; font-family: var(--font-sans), Arial, sans-serif; }
  .role { font-size: 11pt; }
  .sheet section { margin-top: 1.4rem; }
  .sheet h2 { font-size: 9pt; margin-bottom: 0.8rem; color: #000000; }
  .scope, .stack, .meta, .when, .skill-row dd { color: #000000; }
  .entry { margin-bottom: 1rem; }
  /* A heading that lands at the foot of a page belongs to the next one. */
  .sheet h2, .entry h3 { break-after: avoid; page-break-after: avoid; }
  .rule { background: none; border-bottom: 1pt solid #000000; height: 0; }
  .print-button, .foot { display: none; }
}
`;
