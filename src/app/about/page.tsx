import type { Metadata } from "next";
import DocumentShell from "@/components/ui/DocumentShell";
import { PROFILE, SITE } from "@/data/chapters";
import { ABOUT } from "@/data/pages";

/**
 * `/about`: the positioning, in prose.
 *
 * The page that answers "who is this and what do they actually do" in text a
 * crawler can index and a recruiter can skim in thirty seconds. The career arc
 * is the argument: client Laravel work, then a long product chapter, then
 * banking, then the ERP that pulled the three together.
 */
const TITLE = `About ${PROFILE.name} | Full Stack Developer & ERP Engineer`;

export const metadata: Metadata = {
  title: TITLE,
  description: ABOUT.lede,
  keywords: [...SITE.keywords],
  alternates: { canonical: "/about" },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: ABOUT.lede,
    url: "/about",
    type: "profile",
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: `${PROFILE.name}, ${PROFILE.jobTitle}` }],
  },
};

export default function AboutPage() {
  return (
    <DocumentShell title={ABOUT.title} lede={ABOUT.lede} current="/about">
      {ABOUT.passages.map((passage, index) => (
        <section key={passage.heading ?? `lede-${index}`}>
          {passage.heading && <h2>{passage.heading}</h2>}
          {passage.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
          {passage.points && (
            <ul>
              {passage.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section>
        <h2>Working in</h2>
        <ul className="tags" aria-label="Technologies and domains">
          {PROFILE.expertise.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </DocumentShell>
  );
}
