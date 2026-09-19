"use client";

import type { BadgeBlock as Block } from "@/data/contentBlocks";

/**
 * A trophy shelf. The major badges stand as brass plates with a medal; the
 * rest hang underneath as ribbons. Visually the loudest thing on the panel,
 * because awards are the one thing a skimming reader should not miss.
 */
export default function BadgeBlock({ block }: { block: Block }) {
  const major = block.badges.filter((badge) => badge.major);
  const minor = block.badges.filter((badge) => !badge.major);

  return (
    <div className="space-y-1.5" aria-label="Awards">
      {major.length > 0 && (
        <ul className="grid grid-cols-2 gap-1.5">
          {major.map((badge) => (
            <li
              key={badge.title + badge.detail}
              className="relative border-2 px-2 pt-5 pb-2"
              style={{ borderColor: "var(--plaque-frame)", background: "rgb(201 145 63 / 0.28)" }}
            >
              <Medal />
              <p
                className="font-display text-[0.875rem] leading-tight font-semibold tracking-wide"
                style={{ color: "var(--plaque-ink)" }}
              >
                {badge.title}
              </p>
              <p className="mt-1 text-[0.6875rem] leading-snug" style={{ color: "var(--plaque-muted)" }}>
                {badge.detail}
              </p>
            </li>
          ))}
        </ul>
      )}
      {minor.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {minor.map((badge) => (
            <li
              key={badge.title + badge.detail}
              className="flex items-center gap-1.5 border-2 px-1.5 py-1 text-[0.6875rem] leading-none"
              style={{ borderColor: "var(--plaque-brass)", color: "var(--plaque-ink)" }}
            >
              <span
                aria-hidden
                className="h-2 w-2"
                style={{ background: "var(--plaque-brass)" }}
              />
              <span className="font-semibold">{badge.title}</span>
              <span style={{ color: "var(--plaque-muted)" }}>{badge.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A pixel medal: ribbon and disc, drawn in squares. */
function Medal() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 8 9"
      className="absolute top-1.5 left-2 h-3.5 w-3"
      shapeRendering="crispEdges"
    >
      <path d="M1 0h2v3H1zM5 0h2v3H5z" fill="var(--plaque-frame)" />
      <path d="M2 3h4v1h1v3H6v1H2V7H1V4h1z" fill="#e3b458" />
      <path d="M3 5h2v1H3z" fill="var(--plaque-frame)" />
    </svg>
  );
}
