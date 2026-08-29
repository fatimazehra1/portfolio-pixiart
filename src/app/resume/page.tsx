import type { Metadata } from "next";
import Link from "next/link";
import { CHAPTER_TIMELINE, PROFILE, STACK_COUNT } from "@/data/chapters";

/**
 * The resume: the same career, as a document.
 *
 * # Why this exists as its own route
 * Everything the map says, said in a way that needs no WebGL, no fonts to
 * settle and no pointer. It is the page a recruiter on a phone gets (see the
 * redirect in `WorldStage`), the page that prints, and the page a crawler
 * reads. So: server-rendered, no canvas, no client component, no animation —
 * plain semantic HTML and a stylesheet, styled inline in one `<style>` block
 * so the whole document is one request's worth of work.
 *
 * # It has no facts of its own
 * Every line is read from `data/chapters.ts`, in the same timeline order the
 * hub uses. Correcting the career corrects both.
 */

export const metadata: Metadata = {
  title: `Resume — ${PROFILE.name}`,
  description: `${PROFILE.name} — ${PROFILE.tagline}`,
};

/** The chapters, in order, with the contact marker held back for the footer. */
const ENTRIES = CHAPTER_TIMELINE.filter((c) => c.id !== "lighthouse");

export default function ResumePage() {
  return (
    <main className="cv">
      <style>{CSS}</style>

      <header className="head">
        <div>
          <h1>{PROFILE.name}</h1>
          <p className="tagline">{PROFILE.tagline}</p>
        </div>
        <ul className="contact">
          {PROFILE.contact.map((link) => (
            <li key={link.label}>
              <a href={link.href}>{link.value}</a>
            </li>
          ))}
        </ul>
      </header>

      <p className="stats">
        {PROFILE.stats.map((stat) => `${stat.value} ${stat.label.toLowerCase()}`).join(" · ")}
        {` · ${STACK_COUNT} technologies`}
      </p>

      {ENTRIES.map((entry) => (
        <section key={entry.id} className="entry">
          <div className="entry-head">
            <h2>
              {entry.title} <span className="headline">— {entry.headline}</span>
            </h2>
            <span className="period">{entry.period}</span>
          </div>

          <p className="summary">{entry.summary}</p>

          {entry.stack.length > 0 && (
            <p className="stack">
              {entry.stack.map((tech) => (
                <span key={tech} className="tag">
                  {tech}
                </span>
              ))}
            </p>
          )}

          {entry.bullets.length > 0 && (
            <ul className="bullets">
              {entry.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <footer className="foot">
        {/* The way back to the map. Not printed — a link to a canvas is no use
            on paper, and the URL is already in the header of every printout. */}
        <Link href="/" className="back">
          ← Explore the interactive version
        </Link>
      </footer>
    </main>
  );
}

/**
 * The whole stylesheet, inline.
 *
 * Print rules included: a serif-free, ink-cheap document at a readable size,
 * with entries kept off page breaks. `print-color-adjust` is deliberately not
 * forced — a printed CV should come out black on white.
 */
const CSS = `
.cv {
  --paper: #ffffff;
  --text: #14181f;
  --soft: #55606e;
  --line: #e2e6eb;
  max-width: 46rem;
  min-height: 100dvh;
  margin: 0 auto;
  padding: 3rem 1.5rem 4rem;
  background: var(--paper);
  color: var(--text);
  font-family: var(--font-sans), system-ui, sans-serif;
  font-size: 0.9375rem;
  line-height: 1.55;
}
.cv a { color: inherit; }
.head {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
  padding-bottom: 1.25rem;
}
.head h1 { margin: 0; font-size: 1.75rem; letter-spacing: -0.02em; }
.tagline { margin: 0.35rem 0 0; color: var(--soft); }
.contact { margin: 0; padding: 0; list-style: none; font-size: 0.8125rem; text-align: right; }
.contact li + li { margin-top: 0.15rem; }
.stats { margin: 1rem 0 2rem; color: var(--soft); font-size: 0.8125rem; }
.entry { margin-bottom: 1.75rem; break-inside: avoid; }
.entry-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  align-items: baseline;
  justify-content: space-between;
}
.entry h2 { margin: 0; font-size: 1.0625rem; letter-spacing: -0.01em; }
.headline { font-weight: 400; color: var(--soft); }
.period { color: var(--soft); font-size: 0.8125rem; font-variant-numeric: tabular-nums; }
.summary { margin: 0.4rem 0 0; }
.stack { margin: 0.6rem 0 0; display: flex; flex-wrap: wrap; gap: 0.3rem; }
.tag {
  border: 1px solid var(--line);
  border-radius: 0.25rem;
  padding: 0.1rem 0.4rem;
  font-size: 0.75rem;
  color: var(--soft);
}
/* Tailwind's preflight strips list markers; a CV wants them back. */
.bullets { margin: 0.6rem 0 0; padding-left: 1.1rem; list-style: disc; }
.bullets li { margin-top: 0.25rem; }
.foot { border-top: 1px solid var(--line); margin-top: 2.5rem; padding-top: 1.25rem; font-size: 0.875rem; }
@media print {
  .cv { padding: 0; font-size: 10.5pt; max-width: none; }
  .foot { display: none; }
  a { text-decoration: none; }
}
`;
