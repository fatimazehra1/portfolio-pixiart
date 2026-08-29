"use client";

import { PROFILE } from "@/data/chapters";
import type { ChapterContent } from "@/data/chapters";
import ScreenshotGallery from "./ScreenshotGallery";

/**
 * One scene's information, in full: what it was, when, in what, and what came
 * out of it — plus whatever screenshots exist for it.
 *
 * # Why this is a component and not a card variant
 * The hub's hover card and this are answering different questions. The card
 * says *which world is this* while you are still deciding whether to visit it;
 * this says *what happened here* once you have. Sharing one component between
 * them would mean one of the two is the wrong size, and the hub's rule is that
 * the interface never takes the screen.
 *
 * Every word comes from `data/chapters.ts`. Nothing here knows a fact.
 */
export default function InfoCard({ content }: { content: ChapterContent }) {
  const isContact = content.id === "lighthouse";

  return (
    <div className="font-sans">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[0.9375rem] leading-none font-semibold tracking-tight">
          {content.title}
        </h2>
        <span className="text-[0.6875rem] tabular-nums" style={{ color: "var(--ui-faint)" }}>
          {content.period}
        </span>
      </div>

      <p
        className="mt-1 text-[0.6875rem] tracking-wide uppercase"
        style={{ color: "var(--ui-faint)" }}
      >
        {content.headline}
      </p>

      <p className="mt-2 text-[0.75rem] leading-snug" style={{ color: "var(--ui-muted)" }}>
        {content.summary}
      </p>

      {content.stack.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1" aria-label="Tech used">
          {content.stack.map((tech) => (
            <li
              key={tech}
              className="rounded border px-1.5 py-0.5 text-[0.625rem] leading-none"
              style={{ borderColor: "var(--ui-border)", color: "var(--ui-muted)" }}
            >
              {tech}
            </li>
          ))}
        </ul>
      )}

      {content.bullets.length > 0 && (
        <ul
          className="mt-3 space-y-1.5 border-t pt-3"
          style={{ borderColor: "var(--ui-border)" }}
        >
          {content.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex gap-2 text-[0.75rem] leading-snug"
              style={{ color: "var(--ui-text)" }}
            >
              <span aria-hidden style={{ color: "var(--ui-faint)" }}>
                ·
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {/* The one chapter that is a destination rather than a record. */}
      {isContact && (
        <ul className="mt-3 space-y-1.5 border-t pt-3" style={{ borderColor: "var(--ui-border)" }}>
          {PROFILE.contact.map((link) => (
            <li key={link.label} className="text-[0.75rem] leading-snug">
              <span style={{ color: "var(--ui-faint)" }}>{link.label} · </span>
              <a
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="underline underline-offset-2 hover:opacity-80"
                style={{ color: "var(--ui-text)" }}
              >
                {link.value}
              </a>
            </li>
          ))}
        </ul>
      )}

      <ScreenshotGallery id={content.id} files={content.screenshots} title={content.title} />
    </div>
  );
}
