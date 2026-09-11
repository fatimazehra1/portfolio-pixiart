import type { Metadata } from "next";
import DocumentShell from "@/components/ui/DocumentShell";
import { PROFILE, SITE } from "@/data/chapters";
import { WHAT_I_BUILD } from "@/data/pages";

/**
 * `/what-i-build`: the work, by kind rather than by employer.
 *
 * `/about` is a person and `/projects` is a list of things. This is the page
 * for the search that describes a job rather than a name: ERP systems,
 * business software, backend systems, client portals, financial systems. Each
 * capability is a heading, a line, a paragraph and a list, because that is
 * what an indexer and a hurried reader both want.
 */
const TITLE = `What I Build | ERP, Business Software & Backend Systems`;

export const metadata: Metadata = {
  title: TITLE,
  description: WHAT_I_BUILD.lede,
  keywords: [...SITE.keywords],
  alternates: { canonical: "/what-i-build" },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: WHAT_I_BUILD.lede,
    url: "/what-i-build",
    type: "website",
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: `${PROFILE.name}, ${PROFILE.jobTitle}` }],
  },
};

export default function WhatIBuildPage() {
  return (
    <DocumentShell title={WHAT_I_BUILD.title} lede={WHAT_I_BUILD.lede} current="/what-i-build">
      <section>
        <p>{WHAT_I_BUILD.intro}</p>
      </section>

      {WHAT_I_BUILD.capabilities.map((capability) => (
        <section key={capability.title} aria-labelledby={slug(capability.title)}>
          <h2 id={slug(capability.title)}>{capability.title}</h2>
          <div className="item">
            <p className="descriptor">{capability.descriptor}</p>
            <p>{capability.body}</p>
            <ul>
              {capability.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <ul className="tags" aria-label={`${capability.title}: technologies`}>
              {capability.stack.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </DocumentShell>
  );
}

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
