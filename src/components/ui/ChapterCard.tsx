"use client";

import { motion } from "framer-motion";
import type { ChapterContent, ChapterStatus } from "@/data/chapters";

/**
 * One world's card, floating beside it on the map.
 *
 * # Modern, not pixel
 * DESIGN.md §UI Style — Interface rules. This is the layer the picture is read
 * *through*, so it is a translucent panel with rounded corners, hairline
 * borders and Inter — not a parchment dialogue box. The pixel art is the world;
 * making the card pixelated would cost legibility in the one place the
 * portfolio actually has something to say.
 *
 * # Small on purpose
 * Name, dates, one line, a status dot, a count. Everything else waits until you
 * are inside the world. The universe is the hero and a card that grew to hold a
 * CV would be a card sitting on top of the thing it is describing.
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
  const count = content.projects.length;

  return (
    <motion.button
      type="button"
      onClick={onEnter}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      className="ui-panel w-[13.5rem] cursor-pointer p-3 text-left font-sans"
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
        <span className="text-[0.9375rem] leading-tight font-semibold tracking-tight">
          {content.title}
        </span>
        <span
          className="shrink-0 text-[0.6875rem] tabular-nums"
          style={{ color: "var(--ui-faint)" }}
        >
          {content.period}
        </span>
      </div>

      <p
        className="mt-1.5 text-[0.75rem] leading-snug"
        style={{ color: "var(--ui-muted)" }}
      >
        {content.summary}
      </p>

      <div className="mt-2.5 flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: accent }}
          aria-hidden
        />
        <span
          className="text-[0.6875rem] tracking-wide uppercase"
          style={{ color: "var(--ui-faint)" }}
        >
          {STATUS_LABEL[content.status]}
        </span>
        <span className="ml-auto text-[0.6875rem]" style={{ color: "var(--ui-faint)" }}>
          {/* A chapter with nothing documented shows its category rather than
              "0 projects", which reads as a gap rather than as a fact. */}
          {count > 0 ? `${count} ${count === 1 ? "project" : "projects"}` : content.category}
        </span>
      </div>

      {/* The accent line. Fills on hover — the smallest possible signal that a
          card is a door rather than a label. */}
      <div
        className="mt-2.5 h-px w-full overflow-hidden"
        style={{ background: "var(--ui-border)" }}
        aria-hidden
      >
        <motion.div
          className="h-px"
          style={{ background: accent }}
          initial={false}
          animate={{ width: active ? "100%" : "22%" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
    </motion.button>
  );
}
