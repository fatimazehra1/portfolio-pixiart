"use client";

import { motion } from "framer-motion";
import type { ChapterContent, ChapterStatus } from "@/data/chapters";

/**
 * One world's card, floating beside it on the map.
 *
 * # The island's own label, not a second door
 * The card, the small label and the island under them are one target: point at
 * a world and this is what it says; click any part of it and you go there. So
 * it is framed like everything else in the interface — a hard-edged board in
 * the world's palette, its name in the bitmap face the in-world signage uses —
 * and it carries no button of its own. It used to end in an accent bar that
 * filled on hover, which was decoration pretending to be an affordance.
 *
 * # The hover layer
 * This is the first of the three layers an island has. It answers one question
 * and stops: what was this, in the language of the job. Name, dates, the role
 * in a line, four tags, and how far along it is.
 *
 * The summary, the bullets and the full stack are the *click* layer, and they
 * live on the plaque inside the world (`InfoCard`). A card that grew to hold a
 * CV would be a card sitting on top of the thing it is describing, and the
 * universe is the hero.
 */

const STATUS_LABEL: Record<ChapterStatus, string> = {
  current: "Current",
  past: "Complete",
  ongoing: "Ongoing",
};

const STATUS_VAR: Record<ChapterStatus, string> = {
  current: "var(--ui-current)",
  past: "var(--ui-past)",
  ongoing: "var(--ui-ongoing)",
};

export interface ChapterCardProps {
  content: ChapterContent;
  /** True while the pointer is on this world or its card. */
  active: boolean;
  onEnter: () => void;
  onHover: (hovering: boolean) => void;
}

export default function ChapterCard({
  content,
  active,
  onEnter,
  onHover,
}: ChapterCardProps) {
  const accent = STATUS_VAR[content.status];
  const count = content.bullets.length;

  return (
    <motion.button
      type="button"
      onClick={onEnter}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      className="ui-panel w-[15rem] cursor-pointer p-3 text-left font-sans"
      // The card is *placed* by the overlay every frame, imperatively, so it
      // must not animate its own position — only how present it is.
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{
        opacity: 1,
        scale: 1,
        borderColor: active ? "var(--ui-border-strong)" : "var(--ui-border)",
      }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      aria-label={`${content.title}, ${content.period}. ${content.summary}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-[1.0625rem] leading-tight font-semibold tracking-wide">
          {content.title}
        </span>
        <span
          className="shrink-0 text-[0.6875rem] tabular-nums"
          style={{ color: "var(--ui-faint)" }}
        >
          {content.period}
        </span>
      </div>

      {/* The role, in one line. The whole point of the hover layer. */}
      <p
        className="mt-1.5 text-[0.8125rem] leading-snug"
        style={{ color: "var(--ui-muted)" }}
      >
        {content.roleLine}
      </p>

      {/* Four tags, not nine. The card is a signpost; the full stack is
          inside the world, where there is room for it. */}
      {content.stack.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1" aria-label="Tech used">
          {content.stack.slice(0, 4).map((tech) => (
            <li
              key={tech}
              className="border-2 px-1.5 py-0.5 text-[0.6875rem] leading-none"
              style={{ borderColor: "var(--ui-border)", color: "var(--ui-muted)" }}
            >
              {tech}
            </li>
          ))}
          {content.stack.length > 4 && (
            <li className="px-0.5 text-[0.625rem] leading-none" style={{ color: "var(--ui-faint)" }}>
              +{content.stack.length - 4}
            </li>
          )}
        </ul>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        <span className="pixel-mark pixel-mark-on" style={{ color: accent }} aria-hidden />
        <span
          className="text-[0.6875rem] tracking-wider uppercase"
          style={{ color: "var(--ui-faint)" }}
        >
          {STATUS_LABEL[content.status]}
        </span>
        <span className="ml-auto text-[0.6875rem]" style={{ color: "var(--ui-faint)" }}>
          {/* A chapter with nothing documented shows its category rather than
              "0 projects", which reads as a gap rather than as a fact. */}
          {count > 0 ? `${count} ${count === 1 ? "highlight" : "highlights"}` : content.category}
        </span>
      </div>

      {/* The way into the second layer, said once. */}
      <p
        className="mt-2 border-t-2 pt-2 text-[0.6875rem] tracking-wider uppercase"
        style={{ borderColor: "var(--ui-border)", color: "var(--ui-faint)" }}
      >
        Click to open
      </p>

    </motion.button>
  );
}
