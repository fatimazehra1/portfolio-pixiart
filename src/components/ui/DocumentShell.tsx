import Link from "next/link";
import { PROFILE } from "@/data/chapters";
import { WRITTEN_PAGES } from "@/data/pages";

/**
 * The shell every written page sits in.
 *
 * # Why these pages are plain
 * The map is the portfolio and it is a WebGL canvas, which a crawler cannot
 * read and a recruiter in a hurry does not want to fly through. These pages
 * are the same career as text: one column, real headings, real lists, real
 * links, and a stylesheet small enough to inline. Nothing here is drawn.
 *
 * The one pixel gesture is the stepped rule under the name, exactly as on
 * `/resume`, and it carries no information. It exists so a visitor arriving
 * from the map can tell they are still in the same place.
 *
 * # Why it is shared
 * Three pages with three copies of the same stylesheet is three chances for
 * them to stop looking like one site. `/resume` keeps its own, because it is
 * tuned for print and this is not.
 */
export default function DocumentShell({
  title,
  lede,
  current,
  children,
}: {
  title: string;
  lede: string;
  /** The href of the page being rendered, so its own nav link is not a link. */
  current: string;
  children: React.ReactNode;
}) {
  return (
    <div className="doc">
      <style>{CSS}</style>

      <div className="sheet">
        <header className="head">
          <p className="who">
            <Link href="/">{PROFILE.name}</Link>
          </p>
          <h1>{title}</h1>
          <p className="lede">{lede}</p>
          <div className="rule" aria-hidden />

          <nav className="nav" aria-label="Sections">
            <Link href="/">The map</Link>
            {WRITTEN_PAGES.map((page) =>
              page.href === current ? (
                <span key={page.href} aria-current="page">
                  {page.label}
                </span>
              ) : (
                <Link key={page.href} href={page.href}>
                  {page.label}
                </Link>
              )
            )}
          </nav>
        </header>

        <main>{children}</main>

        <footer className="foot">
          <p>
            {PROFILE.name}, {PROFILE.jobTitle} in {PROFILE.location.city}.{" "}
            <a href={`mailto:${PROFILE.contact[0].value}`}>{PROFILE.contact[0].value}</a>
          </p>
          <p>
            <Link href="/resume">Read the full resume</Link>
            {" · "}
            <Link href="/">Back to the map</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

/**
 * The whole stylesheet, inline, so a written page is one request's worth of
 * work. One 760px column, one sans serif, one vertical rhythm.
 */
const CSS = `
.doc {
  --ink: #14181f;
  --soft: #4d5865;
  --line: #d9dee5;
  --accent: #c9913f;
  --ground: #f5ecd7;
  --paper: #fffdf8;
  --frame: #241c12;
  --brass: #c9913f;
  min-height: 100dvh;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-sans), "Helvetica Neue", Arial, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
/* The same panel /resume sits on, and for the same reason: four written
   pages that look like one site, and one site that looks like the map. */
.doc .sheet {
  max-width: 760px;
  margin: 2.5rem auto 4rem;
  padding: 0 2.5rem 3.5rem;
  background: var(--paper);
  border: 2px solid var(--frame);
  box-shadow:
    0 0 0 2px #06090f,
    8px 8px 0 0 rgb(36 28 18 / 0.22);
}
.doc .sheet::before {
  content: "";
  display: block;
  margin: 0 -2.5rem 2.75rem;
  height: 10px;
  background: var(--brass);
  border-bottom: 2px solid var(--frame);
}
.doc a { color: inherit; text-underline-offset: 2px; }
.doc a:hover { color: var(--accent); }

.doc .who {
  margin: 0 0 1.5rem;
  font-size: 0.8125rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--soft);
}
.doc .who a { text-decoration: none; }
.doc .head h1 {
  margin: 0;
  font-family: var(--font-display), var(--font-sans), sans-serif;
  font-size: 2.125rem;
  line-height: 1.1;
  letter-spacing: 0.01em;
}
.doc .head .lede {
  margin: 0.75rem 0 0;
  max-width: 62ch;
  font-size: 1.0625rem;
  color: var(--soft);
}
.doc .rule {
  margin: 1.5rem 0 0;
  height: 4px;
  background: repeating-linear-gradient(90deg, var(--accent) 0 8px, transparent 8px 16px);
}
.doc .nav {
  margin: 1.25rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0 1.25rem;
  font-size: 0.875rem;
  color: var(--soft);
}
.doc .nav [aria-current="page"] { color: var(--ink); font-weight: 700; }

.doc section { margin-top: 3rem; }
.doc h2 {
  margin: 0 0 1rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--line);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--soft);
}
.doc h3 { margin: 0; font-size: 1.125rem; font-weight: 700; }
.doc p { max-width: 68ch; }
.doc section > p { margin: 0 0 0.85rem; }
.doc ul { margin: 0.7rem 0 0; padding-left: 1.15rem; list-style: disc; max-width: 70ch; }
.doc li { margin-top: 0.35rem; }

.doc .item { margin-bottom: 2.25rem; }
.doc .item:last-child { margin-bottom: 0; }
.doc .context {
  margin: 0.3rem 0 0;
  font-size: 0.8125rem;
  color: var(--soft);
  font-variant-numeric: tabular-nums;
}
.doc .descriptor { margin: 0.5rem 0 0; font-weight: 600; }
.doc .item > p { margin: 0.5rem 0 0; }
.doc .tags { margin: 0.9rem 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 0.35rem; }
.doc .tags li {
  margin: 0;
  border: 1px solid var(--line);
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
  color: var(--soft);
}

.doc .foot {
  margin-top: 3.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--line);
  font-size: 0.875rem;
  color: var(--soft);
}
.doc .foot p { margin: 0 0 0.35rem; }

@media (max-width: 640px) {
  .doc .sheet {
    margin: 0;
    padding: 0 1.25rem 2.5rem;
    border-left: 0;
    border-right: 0;
    box-shadow: none;
  }
  .doc .sheet::before { margin: 0 -1.25rem 2rem; }
  .doc .head h1 { font-size: 1.75rem; }
}
`;
