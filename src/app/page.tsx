import Link from "next/link";
import WorldStage from "@/components/world/WorldStage";
import { CHAPTER_TIMELINE, PROFILE, SITE } from "@/data/chapters";
import { WRITTEN_PAGES } from "@/data/pages";

/**
 * The map, and the text under it.
 *
 * The visible page is a WebGL canvas: no headings, no copy, nothing a crawler
 * or a screen reader can read, and `WorldStage` renders nothing at all until it
 * knows the viewport width. So the same career is written out here in plain
 * markup — one `h1`, the positioning line, every chapter with its outcome, and
 * a link to the document version.
 *
 * `sr-only` keeps it off the screen without keeping it out of the document:
 * it is in the HTML, it is in the accessibility tree, and it is the fallback
 * for the canvas rather than a duplicate of it. The full record lives at
 * `/resume`, which is the page built to rank.
 */
export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <section className="sr-only">
        <h1>
          {PROFILE.name}, {PROFILE.jobTitle} in {PROFILE.location.city}
        </h1>
        <p>{SITE.description}</p>
        <p>{PROFILE.tagline}</p>
        <p>
          An interactive pixel-art map of this career. Each island is one chapter, and the same
          information is written out below and in full on the pages linked at the end.
        </p>
        <ul>
          {CHAPTER_TIMELINE.map((entry) => (
            <li key={entry.id}>
              <h2>
                {entry.role ? `${entry.role}, ${entry.title}` : entry.title} ({entry.period})
              </h2>
              <p>{entry.roleLine}</p>
              <p>{entry.outcome ?? entry.summary}</p>
            </li>
          ))}
        </ul>
        <nav aria-label="Written pages">
          <ul>
            {WRITTEN_PAGES.map((page) => (
              <li key={page.href}>
                <Link href={page.href}>{page.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>

      <WorldStage />
    </main>
  );
}
