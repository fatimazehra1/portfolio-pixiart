import type { Metadata } from "next";
import DocumentShell from "@/components/ui/DocumentShell";
import { PROFILE, SITE } from "@/data/chapters";
import { PROJECTS } from "@/data/pages";

/**
 * `/projects`: the named builds, each at its own fragment.
 *
 * The islands on the map link here. A chapter's `href` in `data/chapters.ts`
 * points at one of these slugs, which is why the slugs are data rather than
 * derived from the titles: renaming a project should not silently break the
 * link that reaches it.
 *
 * Each entry carries `CreativeWork` schema, so a search engine gets the same
 * four things the page shows: a name, a line, when and where it was built, and
 * what it was built in.
 */
const TITLE = `Projects | ${PROFILE.name}, Full Stack & ERP Developer`;

export const metadata: Metadata = {
  title: TITLE,
  description: PROJECTS.lede,
  keywords: [...SITE.keywords],
  alternates: { canonical: "/projects" },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: PROJECTS.lede,
    url: "/projects",
    type: "website",
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: `${PROFILE.name}, ${PROFILE.jobTitle}` }],
  },
};

export default function ProjectsPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Projects",
    itemListElement: PROJECTS.entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "CreativeWork",
        name: entry.title,
        description: entry.descriptor,
        url: `${SITE.url}/projects#${entry.slug}`,
        author: { "@type": "Person", name: PROFILE.name },
        keywords: entry.stack.join(", "),
      },
    })),
  };

  return (
    <DocumentShell title={PROJECTS.title} lede={PROJECTS.lede} current="/projects">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {PROJECTS.entries.map((entry) => (
        <section key={entry.slug} id={entry.slug} aria-labelledby={`${entry.slug}-title`}>
          <h2 id={`${entry.slug}-title`}>{entry.title}</h2>
          <div className="item">
            <p className="context">{entry.context}</p>
            <p className="descriptor">{entry.descriptor}</p>
            <p>{entry.body}</p>
            <ul>
              {entry.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <ul className="tags" aria-label={`${entry.title}: technologies`}>
              {entry.stack.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
            {entry.href && (
              <p>
                <a href={entry.href} target="_blank" rel="noreferrer">
                  Visit {entry.title}
                </a>
              </p>
            )}
          </div>
        </section>
      ))}
    </DocumentShell>
  );
}
